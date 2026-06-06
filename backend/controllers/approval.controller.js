const Approval = require('../models/Approval.model');
const Quotation = require('../models/Quotation.model');
const RFQ = require('../models/RFQ.model');
const User = require('../models/User.model');
const logActivity = require('../utils/activityLogger');
const { createNotification, createBulkNotifications } = require('../utils/notificationHelper');

// getAllApprovals(req, res, next)
const getAllApprovals = async (req, res, next) => {
  try {
    const query = {};

    // Role-based filtering
    if (req.user.role === 'manager') {
      // Show approvals where this manager is an approver in any pending step
      query['approvalSteps.approver'] = req.user.id;
    } else if (req.user.role === 'procurement_officer') {
      query.requestedBy = req.user.id;
    }
    // admin: no restriction, sees all

    if (req.query.status) query.status = req.query.status;

    const approvals = await Approval.find(query)
      .sort({ isOverdue: -1, createdAt: -1 })
      .populate('rfq', 'title rfqNumber category deadline')
      .populate('quotation', 'quotationNumber totalAmount')
      .populate('vendor', 'companyName email vendorId')
      .populate('requestedBy', 'firstName lastName email')
      .populate('approvalSteps.approver', 'firstName lastName email');

    return res.status(200).json({
      success: true,
      count: approvals.length,
      approvals
    });
  } catch (error) {
    next(error);
  }
};

// getApprovalById(req, res, next)
const getApprovalById = async (req, res, next) => {
  try {
    const approval = await Approval.findById(req.params.id)
      .populate('rfq')
      .populate('quotation')
      .populate('vendor')
      .populate('requestedBy', 'firstName lastName email')
      .populate('approvalSteps.approver', 'firstName lastName email role');

    if (!approval) {
      return res.status(404).json({ success: false, message: 'Approval not found' });
    }

    return res.status(200).json({ success: true, approval });
  } catch (error) {
    next(error);
  }
};

// createApproval(req, res, next)
const createApproval = async (req, res, next) => {
  try {
    const { quotationId, rfqId, priority = 'normal', remarks } = req.body;

    if (!quotationId || !rfqId) {
      return res.status(400).json({
        success: false,
        message: 'quotationId and rfqId are required'
      });
    }

    // Validate quotation exists and is shortlisted
    const quotation = await Quotation.findById(quotationId).populate('rfq vendor');
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }
    if (quotation.status !== 'shortlisted') {
      return res.status(400).json({
        success: false,
        message: `Quotation must be 'shortlisted' to request approval. Current status: ${quotation.status}`
      });
    }

    // Find all managers to assign as approvers
    const managers = await User.find({ role: 'manager', isActive: true }).select('_id firstName lastName email');

    // Build approval steps (minimum 1 — admin as fallback)
    let approversList = managers;
    if (approversList.length === 0) {
      const admins = await User.find({ role: 'admin', isActive: true }).select('_id firstName lastName email');
      approversList = admins.slice(0, 1);
    }

    const approvalSteps = approversList.map((mgr, index) => ({
      stepNumber: index + 1,
      approver: mgr._id,
      status: 'pending'
    }));

    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 48);

    const approval = await Approval.create({
      rfq: rfqId,
      quotation: quotationId,
      vendor: quotation.vendor._id,
      requestedBy: req.user.id,
      approvalSteps,
      currentStep: 1,
      status: 'pending',
      priority,
      totalAmount: quotation.totalAmount,
      remarks,
      dueDate
    });

    // Notify all managers
    const rfq = await RFQ.findById(rfqId);
    const managerIds = approversList.map(m => m._id);
    await createBulkNotifications(managerIds, {
      title: 'Approval Required',
      message: `Approval required for RFQ: ${rfq?.title || rfqId} — Quotation ${quotation.quotationNumber} (₹${quotation.totalAmount.toLocaleString()})`,
      type: 'approval',
      priority: 'high',
      link: `/approvals/${approval._id}`,
      relatedModel: 'Approval',
      relatedId: approval._id
    });

    await logActivity({
      user: req.user.id,
      action: 'APPROVAL_REQUESTED',
      module: 'approval',
      description: `Approval requested for quotation ${quotation.quotationNumber}`,
      entityType: 'Approval',
      entityId: approval._id,
      entityNumber: approval.approvalNumber,
      req
    });

    return res.status(201).json({
      success: true,
      approval,
      message: 'Approval request created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// approveRequest(req, res, next)
const approveRequest = async (req, res, next) => {
  try {
    const { remarks } = req.body;

    const approval = await Approval.findById(req.params.id)
      .populate('rfq quotation vendor requestedBy');

    if (!approval) {
      return res.status(404).json({ success: false, message: 'Approval not found' });
    }
    if (approval.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Approval is already ${approval.status}`
      });
    }

    // Find the current pending step for THIS approver
    const pendingStep = approval.approvalSteps.find(
      step => step.status === 'pending' &&
               step.stepNumber === approval.currentStep &&
               step.approver.toString() === req.user.id.toString()
    );

    // Admin can approve any pending step
    const isAdmin = req.user.role === 'admin';
    const currentStep = approval.approvalSteps.find(
      s => s.stepNumber === approval.currentStep && s.status === 'pending'
    );

    const targetStep = pendingStep || (isAdmin ? currentStep : null);

    if (!targetStep) {
      return res.status(403).json({
        success: false,
        message: 'You are not the assigned approver for the current step, or no pending step found.'
      });
    }

    // Mark step as approved
    targetStep.status = 'approved';
    targetStep.actionedAt = new Date();
    targetStep.remarks = remarks || '';

    // Check if all steps are approved
    const allApproved = approval.approvalSteps.every(s => s.status === 'approved');

    if (allApproved) {
      approval.status = 'approved';
      approval.approvedAt = new Date();

      // Award quotation and RFQ
      await Quotation.findByIdAndUpdate(approval.quotation._id, { status: 'awarded' });
      await RFQ.findByIdAndUpdate(approval.rfq._id, {
        status: 'awarded',
        awardedTo: approval.vendor._id,
        awardedQuotation: approval.quotation._id
      });

      // Notify procurement officer
      await createNotification({
        recipient: approval.requestedBy._id,
        title: 'Approval Granted',
        message: `Approval granted for quotation ${approval.quotation.quotationNumber}. You may now proceed to create a Purchase Order.`,
        type: 'approval',
        priority: 'high',
        link: `/approvals/${approval._id}`,
        relatedModel: 'Approval',
        relatedId: approval._id
      });

      await logActivity({
        user: req.user.id,
        action: 'APPROVAL_APPROVED',
        module: 'approval',
        description: `Approval fully approved: ${approval.approvalNumber}`,
        entityType: 'Approval',
        entityId: approval._id,
        entityNumber: approval.approvalNumber,
        req
      });
    } else {
      // Move to next step and notify next approver
      approval.currentStep += 1;
      const nextStep = approval.approvalSteps.find(s => s.stepNumber === approval.currentStep);
      if (nextStep) {
        await createNotification({
          recipient: nextStep.approver,
          title: 'Action Required: Approval Step',
          message: `Step ${approval.currentStep} approval required for quotation ${approval.quotation.quotationNumber}.`,
          type: 'approval',
          priority: 'high',
          link: `/approvals/${approval._id}`,
          relatedModel: 'Approval',
          relatedId: approval._id
        });
      }
    }

    await approval.save();

    return res.status(200).json({
      success: true,
      approval,
      message: allApproved ? 'Approval fully granted' : 'Step approved, moved to next approver'
    });
  } catch (error) {
    next(error);
  }
};

// rejectRequest(req, res, next)
const rejectRequest = async (req, res, next) => {
  try {
    const { remarks } = req.body;

    if (!remarks) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason (remarks) is required'
      });
    }

    const approval = await Approval.findById(req.params.id)
      .populate('quotation requestedBy');

    if (!approval) {
      return res.status(404).json({ success: false, message: 'Approval not found' });
    }
    if (approval.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Approval is already ${approval.status}`
      });
    }

    // Mark current step as rejected
    const currentStep = approval.approvalSteps.find(
      s => s.stepNumber === approval.currentStep
    );
    if (currentStep) {
      currentStep.status = 'rejected';
      currentStep.actionedAt = new Date();
      currentStep.remarks = remarks;
    }

    approval.status = 'rejected';
    approval.rejectedAt = new Date();
    approval.remarks = remarks;

    // Revert quotation status to submitted
    await Quotation.findByIdAndUpdate(approval.quotation._id, { status: 'submitted' });

    // Notify requestedBy
    await createNotification({
      recipient: approval.requestedBy._id,
      title: 'Approval Rejected',
      message: `Approval for quotation ${approval.quotation.quotationNumber} was rejected. Reason: ${remarks}`,
      type: 'approval',
      priority: 'high',
      link: `/approvals/${approval._id}`,
      relatedModel: 'Approval',
      relatedId: approval._id
    });

    await approval.save();

    await logActivity({
      user: req.user.id,
      action: 'APPROVAL_REJECTED',
      module: 'approval',
      description: `Approval rejected: ${approval.approvalNumber}. Reason: ${remarks}`,
      entityType: 'Approval',
      entityId: approval._id,
      entityNumber: approval.approvalNumber,
      metadata: { remarks },
      req
    });

    return res.status(200).json({
      success: true,
      approval,
      message: 'Approval rejected successfully'
    });
  } catch (error) {
    next(error);
  }
};

// checkOverdue(req, res, next)
const checkOverdue = async (req, res, next) => {
  try {
    const now = new Date();

    // Find all pending approvals where dueDate is in the past
    const overdueApprovals = await Approval.find({
      status: 'pending',
      dueDate: { $lt: now },
      isOverdue: false
    });

    // Mark them as overdue
    const ids = overdueApprovals.map(a => a._id);
    if (ids.length > 0) {
      await Approval.updateMany({ _id: { $in: ids } }, { isOverdue: true });
    }

    // Return full list of overdue approvals
    const allOverdue = await Approval.find({ status: 'pending', isOverdue: true })
      .populate('rfq', 'title rfqNumber')
      .populate('quotation', 'quotationNumber totalAmount')
      .populate('vendor', 'companyName')
      .populate('requestedBy', 'firstName lastName email');

    return res.status(200).json({
      success: true,
      count: allOverdue.length,
      approvals: allOverdue,
      message: `${ids.length} new approval(s) marked as overdue`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllApprovals,
  getApprovalById,
  createApproval,
  approveRequest,
  rejectRequest,
  checkOverdue
};

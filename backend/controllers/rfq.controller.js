const RFQ = require('../models/RFQ.model');
const Vendor = require('../models/Vendor.model');
const User = require('../models/User.model');
const logActivity = require('../utils/activityLogger');
const { createBulkNotifications } = require('../utils/notificationHelper');

// Helper to notify vendor users about RFQ actions
const notifyAssignedVendors = async (rfq, title, message) => {
  if (!rfq.assignedVendors || rfq.assignedVendors.length === 0) return;
  try {
    const vendors = await Vendor.find({ _id: { $in: rfq.assignedVendors } }).select('email');
    const emails = vendors.map(v => v.email);
    const users = await User.find({ email: { $in: emails } }).select('_id');
    const recipientIds = users.map(u => u._id);

    await createBulkNotifications(recipientIds, {
      title,
      message,
      type: 'rfq',
      priority: 'high',
      link: `/rfqs/${rfq._id}`,
      relatedModel: 'RFQ',
      relatedId: rfq._id
    });
  } catch (error) {
    console.error('Error sending RFQ notifications:', error);
  }
};

// getAllRFQs(req, res, next)
const getAllRFQs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    // Filters
    if (req.query.status) query.status = req.query.status;
    if (req.query.category) query.category = req.query.category;
    if (req.query.priority) query.priority = req.query.priority;

    // Search (title, rfqNumber)
    if (req.query.q) {
      const searchRegex = new RegExp(req.query.q, 'i');
      query.$or = [
        { title: searchRegex },
        { rfqNumber: searchRegex }
      ];
    }

    // Role-based filtering for vendors
    if (req.user.role === 'vendor') {
      const vendor = await Vendor.findOne({ email: req.user.email });
      if (!vendor) {
        // If no vendor record exists, vendor user has no assigned RFQs
        query.assignedVendors = null;
      } else {
        query.assignedVendors = vendor._id;
        // Vendors should not see draft RFQs
        query.status = { $ne: 'draft' };
      }
    }

    // Sorting
    const sortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order === 'asc' ? 1 : -1;

    const total = await RFQ.countDocuments(query);
    const rfqs = await RFQ.find(query)
      .sort({ [sortBy]: order })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedVendors', 'companyName email')
      .populate('awardedTo', 'companyName email');

    return res.status(200).json({
      success: true,
      rfqs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    next(error);
  }
};

// getRFQById(req, res, next)
const getRFQById = async (req, res, next) => {
  try {
    const rfq = await RFQ.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedVendors')
      .populate('awardedTo')
      .populate('awardedQuotation');

    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found'
      });
    }

    // Double check vendor restriction
    if (req.user.role === 'vendor') {
      const vendor = await Vendor.findOne({ email: req.user.email });
      if (!vendor || !rfq.assignedVendors.some(v => v._id.equals(vendor._id))) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not assigned to this RFQ.'
        });
      }
      if (rfq.status === 'draft') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. RFQ is in draft status.'
        });
      }
    }

    return res.status(200).json({
      success: true,
      rfq
    });
  } catch (error) {
    next(error);
  }
};

// createRFQ(req, res, next)
const createRFQ = async (req, res, next) => {
  try {
    const { items, title, description, category, deadline, priority, assignedVendors, notes } = req.body;

    // Validate items array has at least 1 item
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'RFQ must contain at least one item'
      });
    }

    const rfq = await RFQ.create({
      title,
      description,
      category,
      items,
      deadline,
      priority,
      assignedVendors,
      createdBy: req.user.id,
      notes
    });

    // Log Activity
    await logActivity({
      user: req.user.id,
      action: 'RFQ_CREATED',
      module: 'rfq',
      description: `RFQ created: ${rfq.title} (${rfq.rfqNumber})`,
      entityType: 'RFQ',
      entityId: rfq._id,
      entityNumber: rfq.rfqNumber,
      req
    });

    // If assignedVendors are provided (meaning status might not be draft, or notifying early)
    if (assignedVendors && assignedVendors.length > 0) {
      await notifyAssignedVendors(rfq, 'New RFQ assigned', `You have been assigned to a new RFQ: ${rfq.title}`);
    }

    return res.status(201).json({
      success: true,
      rfq,
      message: 'RFQ created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// updateRFQ(req, res, next)
const updateRFQ = async (req, res, next) => {
  try {
    const rfq = await RFQ.findById(req.params.id);
    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found'
      });
    }

    // Only creator or admin can update
    const isAdmin = req.user.role === 'admin';
    const isCreator = rfq.createdBy.toString() === req.user.id.toString();

    if (!isAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You must be the creator or an admin to edit this RFQ.'
      });
    }

    // Cannot update if status is 'awarded' or 'closed'
    if (rfq.status === 'awarded' || rfq.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit RFQ in '${rfq.status}' status.`
      });
    }

    // Update fields and save
    Object.assign(rfq, req.body);
    await rfq.save();

    // Log Activity
    await logActivity({
      user: req.user.id,
      action: 'RFQ_UPDATED',
      module: 'rfq',
      description: `RFQ updated: ${rfq.title}`,
      entityType: 'RFQ',
      entityId: rfq._id,
      entityNumber: rfq.rfqNumber,
      req
    });

    return res.status(200).json({
      success: true,
      rfq,
      message: 'RFQ updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// publishRFQ(req, res, next)
const publishRFQ = async (req, res, next) => {
  try {
    const rfq = await RFQ.findById(req.params.id);
    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found'
      });
    }

    if (rfq.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Only draft RFQs can be published. Current status is: ${rfq.status}`
      });
    }

    rfq.status = 'published';
    await rfq.save();

    // Send notifications to all assignedVendors
    await notifyAssignedVendors(rfq, `New RFQ available: ${rfq.title}`, `A new RFQ "${rfq.title}" (${rfq.rfqNumber}) has been published and assigned to you.`);

    // Log Activity
    await logActivity({
      user: req.user.id,
      action: 'RFQ_PUBLISHED',
      module: 'rfq',
      description: `RFQ published: ${rfq.title}`,
      entityType: 'RFQ',
      entityId: rfq._id,
      entityNumber: rfq.rfqNumber,
      req
    });

    return res.status(200).json({
      success: true,
      rfq,
      message: 'RFQ published successfully'
    });
  } catch (error) {
    next(error);
  }
};

// closeRFQ(req, res, next)
const closeRFQ = async (req, res, next) => {
  try {
    const rfq = await RFQ.findById(req.params.id);
    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found'
      });
    }

    rfq.status = 'closed';
    await rfq.save();

    // Log Activity
    await logActivity({
      user: req.user.id,
      action: 'RFQ_CLOSED',
      module: 'rfq',
      description: `RFQ closed: ${rfq.title}`,
      entityType: 'RFQ',
      entityId: rfq._id,
      entityNumber: rfq.rfqNumber,
      req
    });

    return res.status(200).json({
      success: true,
      rfq,
      message: 'RFQ closed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// deleteRFQ(req, res, next)
const deleteRFQ = async (req, res, next) => {
  try {
    const rfq = await RFQ.findById(req.params.id);
    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found'
      });
    }

    // Only if status is 'draft'
    if (rfq.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only RFQs in draft status can be hard deleted'
      });
    }

    await RFQ.findByIdAndDelete(req.params.id);

    // Log Activity
    await logActivity({
      user: req.user.id,
      action: 'RFQ_DELETED',
      module: 'rfq',
      description: `RFQ deleted: ${rfq.title}`,
      entityType: 'RFQ',
      entityId: rfq._id,
      entityNumber: rfq.rfqNumber,
      req
    });

    return res.status(200).json({
      success: true,
      message: 'RFQ deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// getRFQStats(req, res, next)
const getRFQStats = async (req, res, next) => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    const stats = await RFQ.aggregate([
      {
        $facet: {
          total: [{ $count: "count" }],
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          expiringThisWeek: [
            {
              $match: {
                deadline: { $gte: now, $lte: sevenDaysFromNow },
                status: { $in: ['published', 'under_review'] }
              }
            },
            { $count: "count" }
          ],
          overdue: [
            {
              $match: {
                deadline: { $lt: now },
                status: { $in: ['published', 'under_review'] }
              }
            },
            { $count: "count" }
          ]
        }
      }
    ]);

    const totalRFQs = stats[0]?.total[0]?.count || 0;
    const byStatus = stats[0]?.byStatus || [];
    const expiringThisWeek = stats[0]?.expiringThisWeek[0]?.count || 0;
    const overdue = stats[0]?.overdue[0]?.count || 0;

    return res.status(200).json({
      success: true,
      data: {
        totalRFQs,
        byStatus,
        expiringThisWeek,
        overdue
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRFQs,
  getRFQById,
  createRFQ,
  updateRFQ,
  publishRFQ,
  closeRFQ,
  deleteRFQ,
  getRFQStats
};

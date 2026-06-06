const Quotation = require('../models/Quotation.model');
const RFQ = require('../models/RFQ.model');
const Vendor = require('../models/Vendor.model');
const User = require('../models/User.model');
const logActivity = require('../utils/activityLogger');
const { createBulkNotifications, createNotification } = require('../utils/notificationHelper');

// getAllQuotations(req, res, next)
const getAllQuotations = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    // Filters
    if (req.query.rfq) query.rfq = req.query.rfq;
    if (req.query.vendor) query.vendor = req.query.vendor;
    if (req.query.status) query.status = req.query.status;

    // Vendor role restriction: Can only view their own submissions
    if (req.user.role === 'vendor') {
      const vendor = await Vendor.findOne({ email: req.user.email });
      if (!vendor) {
        query.vendor = null;
      } else {
        query.vendor = vendor._id;
      }
    }

    // Sorting
    const sortBy = req.query.sortBy || 'totalAmount';
    const order = req.query.order === 'desc' ? -1 : 1; // default ascending for price list comparison

    const total = await Quotation.countDocuments(query);
    const quotations = await Quotation.find(query)
      .sort({ [sortBy]: order })
      .skip(skip)
      .limit(limit)
      .populate('rfq', 'title rfqNumber')
      .populate('vendor', 'companyName email vendorId')
      .populate('submittedBy', 'firstName lastName email');

    return res.status(200).json({
      success: true,
      quotations,
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

// getQuotationById(req, res, next)
const getQuotationById = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('rfq')
      .populate('vendor')
      .populate('submittedBy', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName email');

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Vendor role restriction
    if (req.user.role === 'vendor') {
      const vendor = await Vendor.findOne({ email: req.user.email });
      if (!vendor || !quotation.vendor._id.equals(vendor._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own quotations.'
        });
      }
    }

    return res.status(200).json({
      success: true,
      quotation
    });
  } catch (error) {
    next(error);
  }
};

// submitQuotation(req, res, next)
const submitQuotation = async (req, res, next) => {
  try {
    const { rfq: rfqId, items, taxRate = 18, deliveryTimeline, deliveryTimelineUnit, validityPeriod, paymentTerms, deliveryTerms, warranty, notes, status = 'submitted' } = req.body;

    // Validate RFQ exists and is published
    const rfq = await RFQ.findById(rfqId);
    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found'
      });
    }

    if (rfq.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: `Quotations cannot be submitted for RFQs in '${rfq.status}' status. Must be 'published'.`
      });
    }

    // Resolve submitting Vendor profile
    const vendor = await Vendor.findOne({ email: req.user.email });
    if (!vendor) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. No vendor profile associated with your user account.'
      });
    }

    // Check if vendor already submitted for this RFQ
    const existingQuotation = await Quotation.findOne({ rfq: rfqId, vendor: vendor._id });
    if (existingQuotation) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted a quotation for this RFQ. Please edit your existing quotation instead.'
      });
    }

    // Calculate subtotal from items (sum of quantity * unitPrice)
    let subtotal = 0;
    const processedItems = items.map(item => {
      const totalPrice = item.quantity * item.unitPrice;
      subtotal += totalPrice;
      return {
        rfqItemName: item.rfqItemName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice,
        brand: item.brand,
        specifications: item.specifications
      };
    });

    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    const quotation = await Quotation.create({
      rfq: rfqId,
      vendor: vendor._id,
      submittedBy: req.user.id,
      items: processedItems,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      deliveryTimeline,
      deliveryTimelineUnit,
      validityPeriod,
      paymentTerms,
      deliveryTerms,
      warranty,
      notes,
      status
    });

    if (status === 'submitted') {
      // Increment rfq.quotationsReceived
      rfq.quotationsReceived += 1;
      await rfq.save();

      // Create ActivityLog
      await logActivity({
        user: req.user.id,
        action: 'QUOTATION_SUBMITTED',
        module: 'quotation',
        description: `Quotation submitted by ${vendor.companyName} for RFQ ${rfq.rfqNumber}`,
        entityType: 'Quotation',
        entityId: quotation._id,
        entityNumber: quotation.quotationNumber,
        req
      });

      // Create notification to procurement officers
      const staff = await User.find({ role: { $in: ['admin', 'procurement_officer'] } }).select('_id');
      const recipientIds = staff.map(s => s._id);

      await createBulkNotifications(recipientIds, {
        title: 'New quotation received',
        message: `New quotation received from ${vendor.companyName} for RFQ ${rfq.rfqNumber}`,
        type: 'quotation',
        priority: 'normal',
        link: `/rfqs/${rfq._id}`,
        relatedModel: 'Quotation',
        relatedId: quotation._id
      });
    } else {
      // Create ActivityLog for draft
      await logActivity({
        user: req.user.id,
        action: 'QUOTATION_CREATED',
        module: 'quotation',
        description: `Quotation draft saved by ${vendor.companyName} for RFQ ${rfq.rfqNumber}`,
        entityType: 'Quotation',
        entityId: quotation._id,
        entityNumber: quotation.quotationNumber,
        req
      });
    }

    return res.status(201).json({
      success: true,
      quotation,
      message: status === 'draft' ? 'Quotation draft saved successfully' : 'Quotation submitted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// updateQuotation(req, res, next)
const updateQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Only creator or admin can update
    const isAdmin = req.user.role === 'admin';
    const isCreator = quotation.submittedBy.toString() === req.user.id.toString();

    if (!isAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only modify your own quotations.'
      });
    }

    // Only if status is 'draft' or 'submitted'
    if (quotation.status !== 'draft' && quotation.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: `Cannot update quotation in '${quotation.status}' status.`
      });
    }

    const oldStatus = quotation.status;

    // Merge updates
    Object.assign(quotation, req.body);

    // Recalculate totals
    if (req.body.items || req.body.taxRate !== undefined) {
      let subtotal = 0;
      quotation.items.forEach(item => {
        item.totalPrice = item.quantity * item.unitPrice;
        subtotal += item.totalPrice;
      });
      quotation.subtotal = subtotal;
      quotation.taxAmount = subtotal * (quotation.taxRate / 100);
      quotation.totalAmount = subtotal + quotation.taxAmount;
    }

    await quotation.save();

    // If status changed from draft to submitted
    if (oldStatus === 'draft' && quotation.status === 'submitted') {
      const rfq = await RFQ.findById(quotation.rfq);
      if (rfq) {
        rfq.quotationsReceived += 1;
        await rfq.save();

        const vendor = await Vendor.findById(quotation.vendor);
        
        // Log Activity
        await logActivity({
          user: req.user.id,
          action: 'QUOTATION_SUBMITTED',
          module: 'quotation',
          description: `Quotation submitted by ${vendor?.companyName || 'Vendor'} for RFQ ${rfq.rfqNumber}`,
          entityType: 'Quotation',
          entityId: quotation._id,
          entityNumber: quotation.quotationNumber,
          req
        });

        // Notify procurement officers
        const staff = await User.find({ role: { $in: ['admin', 'procurement_officer'] } }).select('_id');
        const recipientIds = staff.map(s => s._id);

        await createBulkNotifications(recipientIds, {
          title: 'New quotation received',
          message: `New quotation received from ${vendor?.companyName || 'Vendor'} for RFQ ${rfq.rfqNumber}`,
          type: 'quotation',
          priority: 'normal',
          link: `/rfqs/${rfq._id}`,
          relatedModel: 'Quotation',
          relatedId: quotation._id
        });
      }
    } else {
      // Log Activity for standard update
      await logActivity({
        user: req.user.id,
        action: 'QUOTATION_UPDATED',
        module: 'quotation',
        description: `Quotation updated: ${quotation.quotationNumber}`,
        entityType: 'Quotation',
        entityId: quotation._id,
        entityNumber: quotation.quotationNumber,
        req
      });
    }

    return res.status(200).json({
      success: true,
      quotation,
      message: 'Quotation updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// getComparisonData(req, res, next)
const getComparisonData = async (req, res, next) => {
  try {
    const { rfqId } = req.params;

    const rfq = await RFQ.findById(rfqId).populate('createdBy', 'firstName lastName email');
    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found'
      });
    }

    // Find all submitted or shortlisted quotations
    const quotations = await Quotation.find({
      rfq: rfqId,
      status: { $in: ['submitted', 'shortlisted'] }
    }).populate('vendor submittedBy');

    if (quotations.length === 0) {
      return res.status(200).json({
        success: true,
        rfq,
        quotations: [],
        lowestQuotationId: null,
        comparisonSummary: {
          totalQuotations: 0,
          priceRange: { min: 0, max: 0, avg: 0 },
          fastestDelivery: { vendorName: 'N/A', days: 0 }
        }
      });
    }

    let lowestQuotationId = null;
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let totalPriceSum = 0;
    let fastestDays = Infinity;
    let fastestVendor = '';

    quotations.forEach(q => {
      // Determine lowest and highest price
      if (q.totalAmount < minPrice) {
        minPrice = q.totalAmount;
        lowestQuotationId = q._id;
      }
      if (q.totalAmount > maxPrice) {
        maxPrice = q.totalAmount;
      }
      totalPriceSum += q.totalAmount;

      // Delivery timeline normalized to days
      let days = q.deliveryTimeline;
      if (q.deliveryTimelineUnit === 'weeks') days *= 7;
      if (q.deliveryTimelineUnit === 'months') days *= 30;

      if (days < fastestDays) {
        fastestDays = days;
        fastestVendor = q.vendor?.companyName || 'Unknown';
      }
    });

    const avgPrice = totalPriceSum / quotations.length;

    // Map quotations to set isLowestPrice flag dynamically and sort by totalAmount ascending
    const mappedQuotations = quotations.map(q => {
      const qObj = q.toObject();
      qObj.isLowestPrice = q._id.toString() === lowestQuotationId.toString();
      return qObj;
    }).sort((a, b) => a.totalAmount - b.totalAmount);

    return res.status(200).json({
      success: true,
      rfq,
      quotations: mappedQuotations,
      lowestQuotationId,
      comparisonSummary: {
        totalQuotations: quotations.length,
        priceRange: {
          min: minPrice,
          max: maxPrice,
          avg: Math.round(avgPrice * 100) / 100
        },
        fastestDelivery: {
          vendorName: fastestVendor,
          days: fastestDays
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// shortlistQuotation(req, res, next)
const shortlistQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id).populate('vendor');
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    quotation.status = 'shortlisted';
    await quotation.save();

    // Notify vendor
    if (quotation.vendor) {
      const vendorUser = await User.findOne({ email: quotation.vendor.email });
      if (vendorUser) {
        await createNotification({
          recipient: vendorUser._id,
          title: 'Quotation Shortlisted',
          message: `Your quotation ${quotation.quotationNumber} has been shortlisted.`,
          type: 'quotation',
          priority: 'high',
          link: `/quotations/${quotation._id}`,
          relatedModel: 'Quotation',
          relatedId: quotation._id
        });
      }
    }

    // Log Activity
    await logActivity({
      user: req.user.id,
      action: 'QUOTATION_SHORTLISTED',
      module: 'quotation',
      description: `Quotation shortlisted: ${quotation.quotationNumber}`,
      entityType: 'Quotation',
      entityId: quotation._id,
      entityNumber: quotation.quotationNumber,
      req
    });

    return res.status(200).json({
      success: true,
      quotation,
      message: 'Quotation shortlisted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// rejectQuotation(req, res, next)
const rejectQuotation = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const quotation = await Quotation.findById(req.params.id).populate('vendor');
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    quotation.status = 'rejected';
    quotation.rejectionReason = rejectionReason;
    await quotation.save();

    // Notify vendor
    if (quotation.vendor) {
      const vendorUser = await User.findOne({ email: quotation.vendor.email });
      if (vendorUser) {
        await createNotification({
          recipient: vendorUser._id,
          title: 'Quotation Rejected',
          message: `Your quotation ${quotation.quotationNumber} has been rejected. Reason: ${rejectionReason}`,
          type: 'quotation',
          priority: 'normal',
          link: `/quotations/${quotation._id}`,
          relatedModel: 'Quotation',
          relatedId: quotation._id
        });
      }
    }

    // Log Activity
    await logActivity({
      user: req.user.id,
      action: 'QUOTATION_REJECTED',
      module: 'quotation',
      description: `Quotation rejected: ${quotation.quotationNumber}. Reason: ${rejectionReason}`,
      entityType: 'Quotation',
      entityId: quotation._id,
      entityNumber: quotation.quotationNumber,
      metadata: { rejectionReason },
      req
    });

    return res.status(200).json({
      success: true,
      quotation,
      message: 'Quotation rejected successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllQuotations,
  getQuotationById,
  submitQuotation,
  updateQuotation,
  getComparisonData,
  shortlistQuotation,
  rejectQuotation
};

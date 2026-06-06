const PurchaseOrder = require('../models/PurchaseOrder.model');
const Approval = require('../models/Approval.model');
const Quotation = require('../models/Quotation.model');
const Vendor = require('../models/Vendor.model');
const logActivity = require('../utils/activityLogger');
const { createNotification } = require('../utils/notificationHelper');

// ─── GST Helper ──────────────────────────────────────────────────────────────
// Buyer is always in Maharashtra (MH). If vendor is also in MH → CGST + SGST (9%+9%).
// Any other state → IGST (18%).
const BUYER_STATE = 'maharashtra';
const DEFAULT_GST_RATE = 18; // percent

const calculateGST = (subtotal, vendorState = '') => {
  const isIntraState = vendorState.trim().toLowerCase() === BUYER_STATE;
  const gstRate = DEFAULT_GST_RATE;

  if (isIntraState) {
    const cgstRate = gstRate / 2;
    const sgstRate = gstRate / 2;
    const cgstAmount = parseFloat(((subtotal * cgstRate) / 100).toFixed(2));
    const sgstAmount = parseFloat(((subtotal * sgstRate) / 100).toFixed(2));
    return {
      gstType: 'CGST+SGST',
      cgstRate,
      sgstRate,
      igstRate: 0,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
      totalTax: parseFloat((cgstAmount + sgstAmount).toFixed(2))
    };
  } else {
    const igstAmount = parseFloat(((subtotal * gstRate) / 100).toFixed(2));
    return {
      gstType: 'IGST',
      cgstRate: 0,
      sgstRate: 0,
      igstRate: gstRate,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount,
      totalTax: igstAmount
    };
  }
};

// ─── getAllPOs ────────────────────────────────────────────────────────────────
const getAllPOs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    // Vendor can only see their own POs
    if (req.user.role === 'vendor') {
      const vendor = await Vendor.findOne({ user: req.user.id }).select('_id');
      if (!vendor) return res.status(200).json({ success: true, purchaseOrders: [], count: 0 });
      query.vendor = vendor._id;
    }

    if (req.query.status) query.status = req.query.status;
    if (req.query.vendor) query.vendor = req.query.vendor;
    if (req.query.rfq) query.rfq = req.query.rfq;

    const [purchaseOrders, total] = await Promise.all([
      PurchaseOrder.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('vendor', 'companyName vendorId email')
        .populate('rfq', 'title rfqNumber')
        .populate('quotation', 'quotationNumber totalAmount')
        .populate('approval', 'approvalNumber')
        .populate('createdBy', 'firstName lastName email'),
      PurchaseOrder.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      count: purchaseOrders.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      purchaseOrders
    });
  } catch (error) {
    next(error);
  }
};

// ─── getPOById ────────────────────────────────────────────────────────────────
const getPOById = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate('vendor')
      .populate('rfq')
      .populate('quotation')
      .populate('approval')
      .populate('createdBy', 'firstName lastName email');

    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }

    // Vendor access check
    if (req.user.role === 'vendor') {
      const vendor = await Vendor.findOne({ user: req.user.id }).select('_id');
      if (!vendor || po.vendor._id.toString() !== vendor._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }

    return res.status(200).json({ success: true, purchaseOrder: po });
  } catch (error) {
    next(error);
  }
};

// ─── createPO ─────────────────────────────────────────────────────────────────
const createPO = async (req, res, next) => {
  try {
    const {
      approvalId,
      quotationId,
      rfqId,
      billingAddress,
      deliveryAddress,
      expectedDeliveryDate,
      paymentTerms,
      items,
      notes,
      terms
    } = req.body;

    // Validate required fields
    if (!approvalId || !quotationId || !rfqId) {
      return res.status(400).json({
        success: false,
        message: 'approvalId, quotationId, and rfqId are required'
      });
    }

    // Validate approval is approved
    const approval = await Approval.findById(approvalId).populate('vendor');
    if (!approval) {
      return res.status(404).json({ success: false, message: 'Approval not found' });
    }
    if (approval.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Cannot create PO: approval is '${approval.status}'. Must be 'approved'.`
      });
    }

    // Validate quotation is awarded
    const quotation = await Quotation.findById(quotationId);
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }
    if (quotation.status !== 'awarded') {
      return res.status(400).json({
        success: false,
        message: `Cannot create PO: quotation status is '${quotation.status}'. Must be 'awarded'.`
      });
    }

    // Prevent duplicate PO for same approval
    const existingPO = await PurchaseOrder.findOne({ approval: approvalId });
    if (existingPO) {
      return res.status(409).json({
        success: false,
        message: 'A Purchase Order already exists for this approval',
        poId: existingPO._id
      });
    }

    // Get vendor to determine GST type
    const vendor = await Vendor.findById(approval.vendor._id).select('address companyName email');
    const vendorState = vendor?.address?.state || '';

    // Build PO items from request or fallback to quotation items
    const rawItems = items && items.length > 0 ? items : (quotation.items || []);
    const poItems = rawItems.map(item => ({
      name: item.name || item.description || 'Item',
      description: item.description || '',
      quantity: Number(item.quantity) || 1,
      unit: item.unit || 'units',
      unitPrice: Number(item.unitPrice) || Number(item.unitRate) || 0,
      totalPrice: parseFloat(
        ((Number(item.quantity) || 1) * (Number(item.unitPrice) || Number(item.unitRate) || 0)).toFixed(2)
      ),
      brand: item.brand || '',
      hsn: item.hsn || ''
    }));

    // Calculate subtotal
    const subtotal = parseFloat(
      poItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)
    );

    // Apply GST
    const gstResult = calculateGST(subtotal, vendorState);
    const totalAmount = parseFloat((subtotal + gstResult.totalTax).toFixed(2));

    const po = await PurchaseOrder.create({
      rfq: rfqId,
      quotation: quotationId,
      approval: approvalId,
      vendor: vendor._id,
      createdBy: req.user.id,
      items: poItems,
      billingAddress: billingAddress || {},
      deliveryAddress: deliveryAddress || {},
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
      paymentTerms: paymentTerms || 'Net 30',
      notes,
      terms,
      subtotal,
      cgstRate: gstResult.cgstRate,
      sgstRate: gstResult.sgstRate,
      igstRate: gstResult.igstRate,
      cgstAmount: gstResult.cgstAmount,
      sgstAmount: gstResult.sgstAmount,
      igstAmount: gstResult.igstAmount,
      totalTax: gstResult.totalTax,
      totalAmount,
      status: 'draft'
    });

    // Notify vendor
    await createNotification({
      recipient: approval.vendor._id,
      title: 'Purchase Order Issued',
      message: `A Purchase Order (${po.poNumber}) has been issued to ${vendor?.companyName} for ₹${totalAmount.toLocaleString()}. GST Type: ${gstResult.gstType}.`,
      type: 'system',
      priority: 'high',
      link: `/purchase-orders/${po._id}`,
      relatedModel: 'PurchaseOrder',
      relatedId: po._id
    });

    await logActivity({
      user: req.user.id,
      action: 'PO_CREATED',
      module: 'purchaseOrder',
      description: `PO ${po.poNumber} created for vendor ${vendor?.companyName}, grand total ₹${totalAmount}`,
      entityType: 'PurchaseOrder',
      entityId: po._id,
      entityNumber: po.poNumber,
      metadata: {
        gstType: gstResult.gstType,
        subtotal,
        totalTax: gstResult.totalTax,
        totalAmount
      },
      req
    });

    return res.status(201).json({
      success: true,
      purchaseOrder: po,
      gstSummary: {
        gstType: gstResult.gstType,
        subtotal,
        cgstAmount: gstResult.cgstAmount,
        sgstAmount: gstResult.sgstAmount,
        igstAmount: gstResult.igstAmount,
        totalTax: gstResult.totalTax,
        totalAmount
      },
      message: 'Purchase Order created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ─── updatePOStatus ───────────────────────────────────────────────────────────
// Status enum from model: draft → sent → acknowledged → in_progress → delivered → completed | cancelled
const VALID_TRANSITIONS = {
  draft:        ['sent', 'cancelled'],
  sent:         ['acknowledged', 'cancelled'],
  acknowledged: ['in_progress', 'cancelled'],
  in_progress:  ['delivered'],
  delivered:    ['completed'],
  completed:    [],
  cancelled:    []
};

const updatePOStatus = async (req, res, next) => {
  try {
    const { status, notes: statusNote } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'New status is required' });
    }

    const po = await PurchaseOrder.findById(req.params.id).populate('vendor createdBy');
    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[po.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from '${po.status}' to '${status}'. Allowed: ${allowed.join(', ') || 'none'}`
      });
    }

    const oldStatus = po.status;
    po.status = status;

    // Append note if provided
    if (statusNote) {
      po.notes = po.notes
        ? `${po.notes}\n[${status.toUpperCase()}]: ${statusNote}`
        : `[${status.toUpperCase()}]: ${statusNote}`;
    }

    // Set timestamp fields
    if (status === 'delivered') po.actualDeliveryDate = new Date();

    await po.save();

    // Notify relevant party
    const notifyRecipient = status === 'sent' ? po.vendor._id : po.createdBy._id;
    await createNotification({
      recipient: notifyRecipient,
      title: 'Purchase Order Updated',
      message: `PO ${po.poNumber} status changed from '${oldStatus}' to '${status}'.`,
      type: 'system',
      priority: status === 'cancelled' ? 'high' : 'normal',
      link: `/purchase-orders/${po._id}`,
      relatedModel: 'PurchaseOrder',
      relatedId: po._id
    });

    await logActivity({
      user: req.user.id,
      action: 'PO_STATUS_UPDATED',
      module: 'purchaseOrder',
      description: `PO ${po.poNumber}: '${oldStatus}' → '${status}'`,
      entityType: 'PurchaseOrder',
      entityId: po._id,
      entityNumber: po.poNumber,
      metadata: { oldStatus, newStatus: status },
      req
    });

    return res.status(200).json({
      success: true,
      purchaseOrder: po,
      message: `PO status updated to '${status}'`
    });
  } catch (error) {
    next(error);
  }
};

// ─── deletePO ─────────────────────────────────────────────────────────────────
const deletePO = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }

    if (po.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Only draft POs can be deleted. Current status: ${po.status}`
      });
    }

    await po.deleteOne();

    await logActivity({
      user: req.user.id,
      action: 'PO_DELETED',
      module: 'purchaseOrder',
      description: `PO ${po.poNumber} deleted (was in draft)`,
      entityType: 'PurchaseOrder',
      entityId: po._id,
      entityNumber: po.poNumber,
      req
    });

    return res.status(200).json({ success: true, message: 'Purchase Order deleted' });
  } catch (error) {
    next(error);
  }
};

// ─── getPOStats ───────────────────────────────────────────────────────────────
const getPOStats = async (req, res, next) => {
  try {
    const [statusBreakdown, monthlySpend, topVendors, summary] = await Promise.all([
      // By status
      PurchaseOrder.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { totalValue: -1 } }
      ]),

      // Monthly spend (last 12 months)
      PurchaseOrder.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            totalSpend: { $sum: '$totalAmount' },
            totalTax: { $sum: '$totalTax' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),

      // Top vendors by PO value
      PurchaseOrder.aggregate([
        {
          $group: {
            _id: '$vendor',
            totalValue: { $sum: '$totalAmount' },
            poCount: { $sum: 1 }
          }
        },
        { $sort: { totalValue: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'vendors',
            localField: '_id',
            foreignField: '_id',
            as: 'vendorInfo'
          }
        },
        { $unwind: { path: '$vendorInfo', preserveNullAndEmpty: true } },
        {
          $project: {
            companyName: '$vendorInfo.companyName',
            vendorId: '$vendorInfo.vendorId',
            totalValue: 1,
            poCount: 1
          }
        }
      ]),

      // Overall summary
      PurchaseOrder.aggregate([
        {
          $group: {
            _id: null,
            totalPOs: { $sum: 1 },
            totalSpend: { $sum: '$totalAmount' },
            totalTax: { $sum: '$totalTax' },
            totalCGST: { $sum: '$cgstAmount' },
            totalSGST: { $sum: '$sgstAmount' },
            totalIGST: { $sum: '$igstAmount' },
            avgOrderValue: { $avg: '$totalAmount' }
          }
        }
      ])
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        summary: summary[0] || {
          totalPOs: 0,
          totalSpend: 0,
          totalTax: 0,
          avgOrderValue: 0
        },
        statusBreakdown,
        monthlySpend,
        topVendors
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPOs,
  getPOById,
  createPO,
  updatePOStatus,
  deletePO,
  getPOStats
};

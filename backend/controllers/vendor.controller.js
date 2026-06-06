const Vendor = require('../models/Vendor.model');
const User = require('../models/User.model');
const logActivity = require('../utils/activityLogger');
const { createBulkNotifications } = require('../utils/notificationHelper');

// getAllVendors(req, res, next)
const getAllVendors = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by status and category if provided
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Regex search on companyName, email, contactPerson
    if (req.query.q) {
      const searchRegex = new RegExp(req.query.q, 'i');
      query.$or = [
        { companyName: searchRegex },
        { email: searchRegex },
        { contactPerson: searchRegex }
      ];
    }

    // Sort order mapping
    const sortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order === 'asc' ? 1 : -1;

    const total = await Vendor.countDocuments(query);
    const vendors = await Vendor.find(query)
      .sort({ [sortBy]: order })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'firstName lastName email');

    return res.status(200).json({
      success: true,
      vendors,
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

// getVendorById(req, res, next)
const getVendorById = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id).populate('createdBy', 'firstName lastName email');
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    return res.status(200).json({
      success: true,
      vendor
    });
  } catch (error) {
    next(error);
  }
};

// createVendor(req, res, next)
const createVendor = async (req, res, next) => {
  try {
    const vendorData = { ...req.body, createdBy: req.user.id };
    const vendor = await Vendor.create(vendorData);

    // Log action
    await logActivity({
      user: req.user.id,
      action: 'VENDOR_CREATED',
      module: 'vendor',
      description: `New vendor registered: ${vendor.companyName} (${vendor.vendorId})`,
      entityType: 'Vendor',
      entityId: vendor._id,
      entityNumber: vendor.vendorId,
      req
    });

    // Notify all admins and procurement officers
    const staff = await User.find({ role: { $in: ['admin', 'procurement_officer'] } }).select('_id');
    const recipientIds = staff.map(s => s._id);

    await createBulkNotifications(recipientIds, {
      title: 'New vendor registered',
      message: `Vendor ${vendor.companyName} has been registered by ${req.user.fullName}`,
      type: 'system',
      priority: 'normal',
      link: `/vendors/${vendor._id}`,
      relatedModel: 'Vendor',
      relatedId: vendor._id
    });

    return res.status(201).json({
      success: true,
      vendor,
      message: 'Vendor created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// updateVendor(req, res, next)
const updateVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Merge fields
    Object.assign(vendor, req.body);
    await vendor.save();

    // Log action
    await logActivity({
      user: req.user.id,
      action: 'VENDOR_UPDATED',
      module: 'vendor',
      description: `Vendor updated: ${vendor.companyName}`,
      entityType: 'Vendor',
      entityId: vendor._id,
      entityNumber: vendor.vendorId,
      req
    });

    return res.status(200).json({
      success: true,
      vendor,
      message: 'Vendor updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// deleteVendor(req, res, next)
const deleteVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Soft delete vendor status to inactive
    vendor.status = 'inactive';
    await vendor.save();

    // Log action
    await logActivity({
      user: req.user.id,
      action: 'VENDOR_DELETED',
      module: 'vendor',
      description: `Vendor soft deleted: ${vendor.companyName}`,
      entityType: 'Vendor',
      entityId: vendor._id,
      entityNumber: vendor.vendorId,
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Vendor deleted successfully (soft delete)'
    });
  } catch (error) {
    next(error);
  }
};

// updateVendorStatus(req, res, next)
const updateVendorStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['active', 'inactive', 'blacklisted', 'pending'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const oldStatus = vendor.status;
    vendor.status = status;
    await vendor.save();

    // Log action
    await logActivity({
      user: req.user.id,
      action: 'VENDOR_STATUS_UPDATED',
      module: 'vendor',
      description: `Vendor status updated from ${oldStatus} to ${status} for ${vendor.companyName}`,
      entityType: 'Vendor',
      entityId: vendor._id,
      entityNumber: vendor.vendorId,
      metadata: { oldStatus, newStatus: status },
      req
    });

    return res.status(200).json({
      success: true,
      vendor,
      message: `Vendor status updated to ${status}`
    });
  } catch (error) {
    next(error);
  }
};

// getVendorStats(req, res, next)
const getVendorStats = async (req, res, next) => {
  try {
    const stats = await Vendor.aggregate([
      {
        $facet: {
          totalCount: [
            { $count: "count" }
          ],
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          byCategory: [
            { $group: { _id: "$category", count: { $sum: 1 } } }
          ],
          topSpend: [
            { $sort: { totalSpend: -1 } },
            { $limit: 5 },
            {
              $project: {
                companyName: 1,
                vendorId: 1,
                contactPerson: 1,
                email: 1,
                totalSpend: 1,
                rating: 1
              }
            }
          ]
        }
      }
    ]);

    const totalVendors = stats[0]?.totalCount[0]?.count || 0;
    const byStatus = stats[0]?.byStatus || [];
    const byCategory = stats[0]?.byCategory || [];
    const topSpend = stats[0]?.topSpend || [];

    return res.status(200).json({
      success: true,
      data: {
        totalVendors,
        byStatus,
        byCategory,
        topSpend
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  updateVendorStatus,
  getVendorStats
};

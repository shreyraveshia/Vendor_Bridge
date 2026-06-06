const User = require('../models/User.model');
const Vendor = require('../models/Vendor.model');
const RFQ = require('../models/RFQ.model');
const Quotation = require('../models/Quotation.model');
const Approval = require('../models/Approval.model');
const PurchaseOrder = require('../models/PurchaseOrder.model');
const Invoice = require('../models/Invoice.model');
const ActivityLog = require('../models/ActivityLog.model');
const Notification = require('../models/Notification.model');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new user
// @route   POST /api/admin/users
// @access  Private/Admin
const createUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role, company, phone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      company,
      phone
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role
// @route   PATCH /api/admin/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (!['admin', 'procurement_officer', 'manager', 'vendor'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user status
// @route   PATCH /api/admin/users/:id/status
// @access  Private/Admin
const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deactivating own account
    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own admin account' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User status changed to ${user.isActive ? 'active' : 'inactive'}`,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get database collections document counts
// @route   GET /api/admin/db-stats
// @access  Private/Admin
const getDatabaseStats = async (req, res, next) => {
  try {
    const [
      users,
      vendors,
      rfqs,
      quotations,
      approvals,
      purchaseOrders,
      invoices,
      activityLogs,
      notifications
    ] = await Promise.all([
      User.countDocuments({}),
      Vendor.countDocuments({}),
      RFQ.countDocuments({}),
      Quotation.countDocuments({}),
      Approval.countDocuments({}),
      PurchaseOrder.countDocuments({}),
      Invoice.countDocuments({}),
      ActivityLog.countDocuments({}),
      Notification.countDocuments({})
    ]);

    res.status(200).json({
      success: true,
      stats: {
        users,
        vendors,
        rfqs,
        quotations,
        approvals,
        purchaseOrders,
        invoices,
        activityLogs,
        notifications
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear activity logs
// @route   POST /api/admin/clear-logs
// @access  Private/Admin
const clearActivityLogs = async (req, res, next) => {
  try {
    await ActivityLog.deleteMany({});
    
    // Log the clear action itself so the system keeps a trail of who wiped it
    await ActivityLog.create({
      user: req.user.id,
      action: 'SYSTEM_LOGS_CLEARED',
      module: 'auth',
      description: 'Audit activity logs register cleared by Administrator',
      status: 'success',
      ipAddress: req.ip || '127.0.0.1'
    });

    res.status(200).json({
      success: true,
      message: 'System audit logs cleared successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUserRole,
  toggleUserStatus,
  getDatabaseStats,
  clearActivityLogs
};

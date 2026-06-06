const ActivityLog = require('../models/ActivityLog.model');

// ─── getAllLogs ───────────────────────────────────────────────────────────────
// Admin only — full log access with filters
const getAllLogs = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip  = (page - 1) * limit;

    const query = {};

    // Filters
    if (req.query.module) query.module = req.query.module;
    if (req.query.action) query.action = new RegExp(req.query.action, 'i');
    if (req.query.user)   query.user   = req.query.user;
    if (req.query.status) query.status = req.query.status;
    if (req.query.entityType) query.entityType = req.query.entityType;

    // Date range on createdAt
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate)   query.createdAt.$lte = new Date(req.query.endDate);
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'firstName lastName email role'),
      ActivityLog.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      logs
    });
  } catch (error) {
    next(error);
  }
};

// ─── getMyLogs ────────────────────────────────────────────────────────────────
// Any authenticated user — own logs only
const getMyLogs = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const query = { user: req.user.id };

    if (req.query.module) query.module = req.query.module;
    if (req.query.action) query.action = new RegExp(req.query.action, 'i');
    if (req.query.status) query.status = req.query.status;

    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate)   query.createdAt.$lte = new Date(req.query.endDate);
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ActivityLog.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      logs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllLogs, getMyLogs };

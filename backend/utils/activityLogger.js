const ActivityLog = require('../models/ActivityLog.model');

/**
 * Reusable helper to log user and system activities into the ActivityLog collection.
 */
const logActivity = async ({ user, action, module, description, entityType, entityId, entityNumber, metadata, req, status='success' }) => {
  try {
    await ActivityLog.create({
      user, action, module, description,
      entityType, entityId, entityNumber, metadata,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent'),
      status
    });
  } catch(e) {
    console.error('ActivityLog error:', e);
  }
};

module.exports = logActivity;

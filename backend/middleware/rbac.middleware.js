const PERMISSIONS = {
  admin: ['*'],  // all permissions
  manager: ['approval:read','approval:write','rfq:read','vendor:read',
             'quotation:read','purchase_order:read','invoice:read',
             'report:read','notification:read','activity_log:read'],
  procurement_officer: ['vendor:read','vendor:write','rfq:read','rfq:write',
                        'quotation:read','quotation:write','approval:read',
                        'purchase_order:read','purchase_order:write',
                        'invoice:read','invoice:write','report:read',
                        'notification:read','activity_log:read'],
  vendor: ['rfq:read','quotation:read','quotation:write',
           'purchase_order:read','notification:read']
};

/**
 * checkPermission middleware factory: Asserts that the current user's role
 * has access to the specified permission or possesses the admin wildcard ('*').
 */
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const role = req.user.role;
    const permissionsList = PERMISSIONS[role] || [];

    if (permissionsList.includes('*') || permissionsList.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions'
    });
  };
};

module.exports = { PERMISSIONS, checkPermission };

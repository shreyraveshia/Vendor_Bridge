export const ROLE_PERMISSIONS = {
  admin: [
    'access_admin_panel',
    'manage_users',
    'seed_database',
    'clear_audit_logs',
    'view_reports',
    'export_reports',
    'manage_vendors',
    'manage_rfqs',
    'manage_quotations',
    'approve_requests',
    'manage_pos',
    'manage_invoices',
    'view_activity_logs'
  ],
  procurement_officer: [
    'view_reports',
    'export_reports',
    'manage_vendors',
    'manage_rfqs',
    'view_quotations',
    'compare_quotations',
    'manage_pos',
    'manage_invoices',
    'view_activity_logs'
  ],
  manager: [
    'view_reports',
    'view_vendors',
    'view_rfqs',
    'approve_requests',
    'view_pos',
    'view_invoices',
    'view_activity_logs'
  ],
  vendor: [
    'submit_quotation',
    'view_assigned_rfqs',
    'view_own_pos',
    'view_own_invoices',
    'view_own_activity_logs'
  ]
};

/**
 * Verify whether a specific user role has permissions to perform an action
 */
export const canAccess = (userRole, permission) => {
  if (!userRole) return false;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
};

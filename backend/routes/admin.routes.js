const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  createUser,
  updateUserRole,
  toggleUserStatus,
  getDatabaseStats,
  clearActivityLogs
} = require('../controllers/admin.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

// Apply protection & authorization to all routes in this router
router.use(protect);
router.use(authorize('admin'));

// /api/admin/users
router.route('/users')
  .get(getAllUsers)
  .post(createUser);

// /api/admin/users/:id/role
router.patch('/users/:id/role', updateUserRole);

// /api/admin/users/:id/status
router.patch('/users/:id/status', toggleUserStatus);

// /api/admin/db-stats
router.get('/db-stats', getDatabaseStats);

// /api/admin/clear-logs
router.post('/clear-logs', clearActivityLogs);

module.exports = router;

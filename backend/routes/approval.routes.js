const express = require('express');
const router = express.Router();
const {
  getAllApprovals,
  getApprovalById,
  createApproval,
  approveRequest,
  rejectRequest,
  checkOverdue
} = require('../controllers/approval.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

// All routes require authentication
router.use(protect);

// GET /api/approvals  – visible to all authenticated roles (filtered by role inside controller)
router.get('/', getAllApprovals);

// GET /api/approvals/overdue  – admin/manager only
router.get('/overdue', authorize('admin', 'manager'), checkOverdue);

// GET /api/approvals/:id
router.get('/:id', getApprovalById);

// POST /api/approvals  – procurement_officer or admin can initiate
router.post('/', authorize('admin', 'procurement_officer'), createApproval);

// PATCH /api/approvals/:id/approve  – manager or admin
router.patch('/:id/approve', authorize('admin', 'manager'), approveRequest);

// PATCH /api/approvals/:id/reject  – manager or admin
router.patch('/:id/reject', authorize('admin', 'manager'), rejectRequest);

module.exports = router;

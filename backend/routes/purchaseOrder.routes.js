const express = require('express');
const router = express.Router();
const {
  getAllPOs,
  getPOById,
  createPO,
  updatePOStatus,
  deletePO,
  getPOStats
} = require('../controllers/purchaseOrder.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

// All routes require authentication
router.use(protect);

// GET /api/purchase-orders/stats  – admin/manager/procurement_officer only
router.get('/stats', authorize('admin', 'manager', 'procurement_officer'), getPOStats);

// GET /api/purchase-orders  – all roles (vendor sees only their own)
router.get('/', getAllPOs);

// GET /api/purchase-orders/:id
router.get('/:id', getPOById);

// POST /api/purchase-orders  – procurement_officer or admin
router.post('/', authorize('admin', 'procurement_officer'), createPO);

// PATCH /api/purchase-orders/:id/status  – admin, manager, procurement_officer
router.patch('/:id/status', authorize('admin', 'manager', 'procurement_officer'), updatePOStatus);

// DELETE /api/purchase-orders/:id  – admin only (draft POs only)
router.delete('/:id', authorize('admin'), deletePO);

module.exports = router;

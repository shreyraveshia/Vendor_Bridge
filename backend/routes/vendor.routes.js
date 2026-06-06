const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const vc = require('../controllers/vendor.controller');

// All vendor routes require authentication
router.use(protect);

router.get('/',          authorize('admin','procurement_officer','manager'), vc.getAllVendors);
router.get('/stats',     authorize('admin','procurement_officer'), vc.getVendorStats);
router.get('/:id',       authorize('admin','procurement_officer','manager'), vc.getVendorById);
router.post('/',         authorize('admin','procurement_officer'), vc.createVendor);
router.put('/:id',       authorize('admin','procurement_officer'), vc.updateVendor);
router.patch('/:id/status', authorize('admin'), vc.updateVendorStatus);
router.delete('/:id',    authorize('admin'), vc.deleteVendor);

module.exports = router;

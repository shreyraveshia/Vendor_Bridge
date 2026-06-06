const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const rc = require('../controllers/rfq.controller');

// All RFQ routes require authentication
router.use(protect);

router.get('/',          rc.getAllRFQs);
router.get('/stats',     authorize('admin', 'procurement_officer'), rc.getRFQStats);
router.get('/:id',       rc.getRFQById);
router.post('/',         authorize('admin', 'procurement_officer'), rc.createRFQ);
router.put('/:id',       authorize('admin', 'procurement_officer'), rc.updateRFQ);
router.patch('/:id/publish', authorize('admin', 'procurement_officer'), rc.publishRFQ);
router.patch('/:id/close',   authorize('admin', 'procurement_officer', 'manager'), rc.closeRFQ);
router.delete('/:id',    authorize('admin'), rc.deleteRFQ);

module.exports = router;

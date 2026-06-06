const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const qc = require('../controllers/quotation.controller');

// All quotation routes require authentication
router.use(protect);

router.get('/',                  qc.getAllQuotations);
router.get('/compare/:rfqId',    authorize('admin', 'procurement_officer', 'manager'), qc.getComparisonData);
router.get('/:id',               qc.getQuotationById);
router.post('/',                 authorize('admin', 'procurement_officer', 'vendor'), qc.submitQuotation);
router.put('/:id',               authorize('admin', 'procurement_officer', 'vendor'), qc.updateQuotation);
router.patch('/:id/shortlist',   authorize('admin', 'procurement_officer'), qc.shortlistQuotation);
router.patch('/:id/reject',      authorize('admin', 'procurement_officer', 'manager'), qc.rejectQuotation);

module.exports = router;

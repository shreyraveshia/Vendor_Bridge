const express = require('express');
const router = express.Router();
const {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  generatePDF,
  sendInvoiceEmail,
  updateInvoiceStatus,
  exportInvoicesCSV
} = require('../controllers/invoice.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

// All routes require authentication
router.use(protect);

// GET /api/invoices/export/csv  — must be before /:id to avoid collision
router.get('/export/csv', authorize('admin', 'procurement_officer', 'manager'), exportInvoicesCSV);

// GET /api/invoices  — all roles (vendor sees only their own)
router.get('/', getAllInvoices);

// GET /api/invoices/:id
router.get('/:id', getInvoiceById);

// GET /api/invoices/:id/pdf  — all roles (vendor access checked inside)
router.get('/:id/pdf', generatePDF);

// POST /api/invoices  — procurement_officer, admin
router.post('/', authorize('admin', 'procurement_officer'), createInvoice);

// POST /api/invoices/:id/send-email  — procurement_officer, admin
router.post('/:id/send-email', authorize('admin', 'procurement_officer'), sendInvoiceEmail);

// PATCH /api/invoices/:id/status  — procurement_officer, admin
router.patch('/:id/status', authorize('admin', 'procurement_officer'), updateInvoiceStatus);

module.exports = router;

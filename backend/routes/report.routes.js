const express = require('express');
const router  = express.Router();
const {
  getDashboardStats,
  getVendorAnalytics,
  getProcurementStats,
  getSpendingSummary,
  exportReportCSV
} = require('../controllers/report.controller');
const { protect }   = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(protect);

// GET /api/reports/dashboard    — all authenticated roles
router.get('/dashboard', getDashboardStats);

// GET /api/reports/vendors      — admin, procurement_officer, manager
router.get('/vendors', authorize('admin', 'procurement_officer', 'manager'), getVendorAnalytics);

// GET /api/reports/procurement  — admin, procurement_officer, manager
router.get('/procurement', authorize('admin', 'procurement_officer', 'manager'), getProcurementStats);

// GET /api/reports/spending     — admin, procurement_officer, manager  (?period=week|month|quarter|year)
router.get('/spending', authorize('admin', 'procurement_officer', 'manager'), getSpendingSummary);

// GET /api/reports/export       — admin, procurement_officer  (?type=vendors|rfqs|pos|invoices)
router.get('/export', authorize('admin', 'procurement_officer'), exportReportCSV);

module.exports = router;

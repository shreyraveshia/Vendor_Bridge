const express = require('express');
const router  = express.Router();
const { getAllLogs, getMyLogs } = require('../controllers/activityLog.controller');
const { protect }   = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(protect);

// GET /api/activity-logs       — admin only
router.get('/', authorize('admin'), getAllLogs);

// GET /api/activity-logs/mine  — any authenticated user (own logs)
router.get('/mine', getMyLogs);

module.exports = router;

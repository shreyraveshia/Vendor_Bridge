const express = require('express');
const router  = express.Router();
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification
} = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes require authentication — all scoped to req.user
router.use(protect);

// GET  /api/notifications              — list with pagination + isRead filter
router.get('/', getMyNotifications);

// GET  /api/notifications/unread-count — badge count (must be before /:id)
router.get('/unread-count', getUnreadCount);

// PATCH /api/notifications/read-all    — mark all as read (must be before /:id)
router.patch('/read-all', markAllAsRead);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', markAsRead);

// DELETE /api/notifications/:id
router.delete('/:id', deleteNotification);

module.exports = router;

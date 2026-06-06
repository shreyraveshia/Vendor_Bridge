const Notification = require('../models/Notification.model');

// ─── getMyNotifications ───────────────────────────────────────────────────────
const getMyNotifications = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const query = { recipient: req.user.id };

    // Optional isRead filter — '?isRead=true' or '?isRead=false'
    if (req.query.isRead !== undefined) {
      query.isRead = req.query.isRead === 'true';
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: req.user.id, isRead: false })
    ]);

    return res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      unreadCount,
      notifications
    });
  } catch (error) {
    next(error);
  }
};

// ─── markAsRead ───────────────────────────────────────────────────────────────
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id   // ownership check
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or does not belong to you'
      });
    }

    if (notification.isRead) {
      return res.status(200).json({
        success: true,
        notification,
        message: 'Already marked as read'
      });
    }

    notification.isRead = true;
    notification.readAt  = new Date();
    await notification.save();

    return res.status(200).json({
      success: true,
      notification,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// ─── markAllAsRead ────────────────────────────────────────────────────────────
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount,
      message: `${result.modifiedCount} notification(s) marked as read`
    });
  } catch (error) {
    next(error);
  }
};

// ─── getUnreadCount ───────────────────────────────────────────────────────────
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });

    return res.status(200).json({ success: true, count });
  } catch (error) {
    next(error);
  }
};

// ─── deleteNotification ───────────────────────────────────────────────────────
const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id   // ownership check
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or does not belong to you'
      });
    }

    await notification.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification
};

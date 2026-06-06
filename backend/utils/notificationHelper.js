const Notification = require('../models/Notification.model');

/**
 * Reusable helper to create a single notification for a recipient.
 */
const createNotification = async ({ recipient, title, message, type='system', priority='normal', link, relatedModel, relatedId }) => {
  try {
    await Notification.create({ recipient, title, message, type, priority, link, relatedModel, relatedId });
  } catch(e) {
    console.error('Notification error:', e);
  }
};

/**
 * Reusable helper to create notifications in bulk for a list of recipients.
 */
const createBulkNotifications = async (recipients, data) => {
  try {
    if (!recipients || recipients.length === 0) return;
    const notifications = recipients.map(r => ({ ...data, recipient: r }));
    await Notification.insertMany(notifications);
  } catch(e) {
    console.error('Bulk notification error:', e);
  }
};

module.exports = { createNotification, createBulkNotifications };

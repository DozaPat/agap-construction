const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const { isFirebaseConfigured } = require('../services/firebaseMessagingService');

const serializeNotification = (notification) => ({
  _id: notification._id,
  category: notification.category,
  title: notification.title,
  message: notification.message,
  data: notification.data || {},
  readAt: notification.readAt,
  createdAt: notification.createdAt,
  updatedAt: notification.updatedAt
});

const getNotifications = async (req, res) => {
  try {
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 50;
    const filter = { user: req.user._id };
    if (req.query.unreadOnly === 'true') filter.readAt = null;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(limit),
      Notification.countDocuments({ user: req.user._id, readAt: null })
    ]);

    res.json({
      notifications: notifications.map(serializeNotification),
      unreadCount,
      pushConfigured: isFirebaseConfigured()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid notification' });
    }
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { readAt: new Date() } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(serializeNotification(notification));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, readAt: null },
      { $set: { readAt: new Date() } }
    );
    res.json({ updatedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const registerDeviceToken = async (req, res) => {
  try {
    const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
    const platform = req.body.platform;
    if (token.length < 20 || !['android', 'ios', 'web'].includes(platform)) {
      return res.status(400).json({ message: 'Enter a valid push token and platform' });
    }

    await PushSubscription.findOneAndUpdate(
      { token },
      {
        $set: {
          user: req.user._id,
          platform,
          deviceName: typeof req.body.deviceName === 'string'
            ? req.body.deviceName.trim().slice(0, 100)
            : '',
          lastSeenAt: new Date()
        }
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json({ registered: true, pushConfigured: isFirebaseConfigured() });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const unregisterDeviceToken = async (req, res) => {
  try {
    const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
    if (token) {
      await PushSubscription.deleteOne({ token, user: req.user._id });
    }
    res.json({ registered: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerDeviceToken,
  unregisterDeviceToken
};

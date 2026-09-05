const express = require('express');
const {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerDeviceToken,
  unregisterDeviceToken
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.get('/', getNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.post('/device-token', registerDeviceToken);
router.delete('/device-token', unregisterDeviceToken);
router.patch('/:id/read', markNotificationRead);

module.exports = router;

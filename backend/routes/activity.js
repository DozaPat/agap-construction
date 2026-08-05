const express = require('express');
const { getRecentActivities } = require('../controllers/activityController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getRecentActivities);

module.exports = router;

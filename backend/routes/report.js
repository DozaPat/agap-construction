const express = require('express');
const { getDetailedReport } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/detailed', protect, getDetailedReport);

module.exports = router;

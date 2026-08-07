const express = require('express');
const {
  getAttendanceSheet,
  saveAttendanceSheet
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getAttendanceSheet);
router.put('/', protect, saveAttendanceSheet);

module.exports = router;

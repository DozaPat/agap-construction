const express = require('express');
const {
  getPayrollLedger,
  getAttendanceSheet,
  saveAttendanceSheet,
  getLiveAttendance,
  getAttendanceHistory,
  recordTimeIn,
  recordTimeOut,
  correctAttendanceEntry
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/payroll', protect, getPayrollLedger);
router.get('/live/history', protect, getAttendanceHistory);
router.get('/live', protect, getLiveAttendance);
router.post('/live/time-in', protect, recordTimeIn);
router.post('/live/:entryId/time-out', protect, recordTimeOut);
router.patch(
  '/live/:entryId',
  protect,
  authorize('admin', 'manager'),
  correctAttendanceEntry
);
router.get('/', protect, getAttendanceSheet);
router.put('/', protect, saveAttendanceSheet);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  getTools,
  getTool,
  createTool,
  updateTool,
  checkOutTool,
  checkInTool,
  deleteTool
} = require('../controllers/toolController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getTools)
  .post(protect, createTool);

router.post('/:id/check-out', protect, checkOutTool);
router.post('/:id/check-in', protect, checkInTool);

router.route('/:id')
  .get(protect, getTool)
  .put(protect, updateTool)
  .delete(protect, deleteTool);

module.exports = router;

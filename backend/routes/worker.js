const express = require('express');
const router = express.Router();
const {
  getWorkers,
  getWorker,
  createWorker,
  updateWorker,
  deleteWorker
} = require('../controllers/workerController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getWorkers)
  .post(protect, createWorker);

router.route('/:id')
  .get(protect, getWorker)
  .put(protect, updateWorker)
  .delete(protect, deleteWorker);

module.exports = router;
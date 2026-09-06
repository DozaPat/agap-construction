const express = require('express');
const router = express.Router();
const {
  getMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial
} = require('../controllers/materialController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getMaterials)
  .post(protect, authorize('admin'), createMaterial);

router.route('/:id')
  .get(protect, getMaterial)
  .put(protect, authorize('admin'), updateMaterial)
  .delete(protect, authorize('admin'), deleteMaterial);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  getMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial
} = require('../controllers/materialController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getMaterials)
  .post(protect, createMaterial);

router.route('/:id')
  .get(protect, getMaterial)
  .put(protect, updateMaterial)
  .delete(protect, deleteMaterial);

module.exports = router;
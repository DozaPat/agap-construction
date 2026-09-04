const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  updateProjectProgress,
  deleteProject
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getProjects)
  .post(protect, authorize('admin'), createProject);

router.route('/:id')
  .get(protect, getProject)
  .put(protect, authorize('admin'), updateProject)
  .delete(protect, authorize('admin'), deleteProject);

router.patch(
  '/:id/progress',
  protect,
  authorize('admin', 'manager'),
  updateProjectProgress
);

module.exports = router;

const express = require('express');
const { getUsers, createUser, updateUser, unlockUser, resetPassword } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect, authorize('admin'));
router.route('/').get(getUsers).post(createUser);
router.put('/:id', updateUser);
router.post('/:id/unlock', unlockUser);
router.post('/:id/reset-password', resetPassword);

module.exports = router;

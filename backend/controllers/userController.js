const crypto = require('crypto');
const User = require('../models/User');
const Project = require('../models/Project');
const Expense = require('../models/Expense');
const Tool = require('../models/Tool');
const AttendanceSheet = require('../models/AttendanceSheet');
const Activity = require('../models/Activity');
const { recordActivity } = require('../services/activityService');

const safeFields = 'username name email phone role status assignedProjects mustChangePassword failedLoginAttempts lockUntil lastLoginAt createdAt updatedAt';

const validateProjects = async (projectIds = []) => {
  const ids = [...new Set(projectIds.map(String))];
  const count = await Project.countDocuments({ _id: { $in: ids } });
  return count === ids.length;
};

const ensureAdminRemains = async (target, updates = {}) => {
  const removesAdmin = target.role === 'admin' && (
    updates.role === 'manager' || updates.status === 'inactive'
  );
  if (!removesAdmin) return true;
  return (await User.countDocuments({ role: 'admin', status: { $ne: 'inactive' } })) > 1;
};

const getDeletionBlocker = async (user, currentUserId) => {
  if (String(user._id) === String(currentUserId)) {
    return 'You cannot delete the account you are currently using.';
  }
  if (user.lastLoginAt) {
    return 'This account has signed in before and must be deactivated to preserve its history.';
  }
  if (
    user.role === 'admin' &&
    (await User.countDocuments({ role: 'admin', status: { $ne: 'inactive' } })) <= 1
  ) {
    return 'The last active administrator cannot be deleted.';
  }

  const [project, expense, tool, attendance, activity, createdUser] = await Promise.all([
    Project.exists({ manager: user._id }),
    Expense.exists({ paidBy: user._id }),
    Tool.exists({ checkedOutBy: user._id }),
    AttendanceSheet.exists({ $or: [{ createdBy: user._id }, { updatedBy: user._id }] }),
    Activity.exists({ actor: user._id }),
    User.exists({ createdBy: user._id })
  ]);

  if (project || expense || tool || attendance || activity || createdUser) {
    return 'This account has system history and cannot be permanently deleted. Deactivate it instead.';
  }
  return null;
};

const getUsers = async (req, res) => {
  try {
    const query = {};
    if (req.query.role && ['admin', 'manager'].includes(req.query.role)) query.role = req.query.role;
    if (req.query.status && ['active', 'inactive', 'locked'].includes(req.query.status)) query.status = req.query.status;
    if (req.query.search) {
      const search = String(req.query.search).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const users = await User.find(query).select(safeFields)
      .populate('assignedProjects', 'name status').sort({ createdAt: -1 });
    const results = await Promise.all(users.map(async (user) => {
      const deleteBlockedReason = await getDeletionBlocker(user, req.user._id);
      return {
        ...user.toObject(),
        canDelete: !deleteBlockedReason,
        deleteBlockedReason
      };
    }));
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { username, name, email, phone, role = 'manager', assignedProjects = [], temporaryPassword } = req.body;
    if (!username?.trim() || !name?.trim() || !temporaryPassword) {
      return res.status(400).json({ message: 'Name, username, and temporary password are required' });
    }
    if (temporaryPassword.length < 8) {
      return res.status(400).json({ message: 'Temporary password must contain at least 8 characters' });
    }
    if (!(await validateProjects(assignedProjects))) {
      return res.status(400).json({ message: 'One or more assigned projects are invalid' });
    }
    const duplicate = await User.findOne({ $or: [
      { username: username.trim() },
      ...(email?.trim() ? [{ email: email.trim().toLowerCase() }] : [])
    ] });
    if (duplicate) return res.status(409).json({ message: 'Username or email already exists' });

    const user = await User.create({
      username: username.trim(), name: name.trim(), email: email?.trim() || undefined,
      phone: phone?.trim(), role: role === 'admin' ? 'admin' : 'manager',
      assignedProjects, password: temporaryPassword, mustChangePassword: true,
      status: 'active', createdBy: req.user._id
    });
    await recordActivity({ action: 'created', entityType: 'user', entityId: user._id, entityName: user.name, actor: req.user._id });
    res.status(201).json(await User.findById(user._id).select(safeFields).populate('assignedProjects', 'name status'));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const updates = {};
    ['name', 'email', 'phone', 'role', 'status', 'assignedProjects'].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) updates[field] = req.body[field];
    });
    if (updates.role && !['admin', 'manager'].includes(updates.role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    if (updates.status && !['active', 'inactive'].includes(updates.status)) {
      return res.status(400).json({ message: 'Invalid account status' });
    }
    if (updates.assignedProjects && !(await validateProjects(updates.assignedProjects))) {
      return res.status(400).json({ message: 'One or more assigned projects are invalid' });
    }
    if (String(user._id) === String(req.user._id) && (updates.status === 'inactive' || updates.role === 'manager')) {
      return res.status(409).json({ message: 'You cannot deactivate or demote your own account' });
    }
    if (!(await ensureAdminRemains(user, updates))) {
      return res.status(409).json({ message: 'At least one active administrator is required' });
    }
    const invalidateSessions = updates.role !== undefined || updates.status !== undefined;
    Object.assign(user, updates);
    if (invalidateSessions) user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    await user.save({ validateBeforeSave: true });
    await recordActivity({ action: 'updated', entityType: 'user', entityId: user._id, entityName: user.name, actor: req.user._id });
    res.json(await User.findById(user._id).select(safeFields).populate('assignedProjects', 'name status'));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Email already exists' });
    res.status(400).json({ message: error.message });
  }
};

const unlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.status = 'active';
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    await user.save({ validateBeforeSave: false });
    res.json(await User.findById(user._id).select(safeFields).populate('assignedProjects', 'name status'));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const temporaryPassword = req.body?.temporaryPassword || `Agap-${crypto.randomBytes(5).toString('base64url')}!`;
    if (temporaryPassword.length < 8) return res.status(400).json({ message: 'Temporary password must contain at least 8 characters' });
    user.password = temporaryPassword;
    user.mustChangePassword = true;
    user.status = 'active';
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
    res.json({ message: 'Password reset successfully', temporaryPassword });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const blocker = await getDeletionBlocker(user, req.user._id);
    if (blocker) return res.status(409).json({ message: blocker });

    await user.deleteOne();
    await recordActivity({
      action: 'deleted',
      entityType: 'user',
      entityId: user._id,
      entityName: user.name,
      actor: req.user._id
    });
    res.json({ message: 'Unused user account deleted permanently' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUsers, createUser, updateUser, unlockUser, resetPassword, deleteUser };

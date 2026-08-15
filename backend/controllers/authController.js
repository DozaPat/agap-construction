const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { clearAuthCookie } = require('../middleware/authMiddleware');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

const generateToken = (user) => {
  return jwt.sign({
    id: user._id,
    role: user.role,
    tokenVersion: Number(user.tokenVersion || 0)
  }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

const publicUser = (user, token) => ({
  _id: user._id,
  username: user.username,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status || 'active',
  assignedProjects: user.assignedProjects || [],
  mustChangePassword: Boolean(user.mustChangePassword),
  token
});

const issueSession = (res, user) => {
  const token = generateToken(user);
  res.cookie('token', token, cookieOptions());
  return publicUser(user, token);
};

// @desc    Register new user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
  const { username, name, email, password, role, assignedProjects = [] } = req.body;

  try {
    if (!username?.trim() || !name?.trim() || !password) {
      return res.status(400).json({ message: 'Username, name, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Temporary password must contain at least 8 characters' });
    }
    const userExists = await User.findOne({
      $or: [
        { username: username.trim() },
        ...(email?.trim() ? [{ email: email.trim().toLowerCase() }] : [])
      ]
    });
    if (userExists) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    const user = await User.create({
      username: username.trim(),
      name: name.trim(),
      email: email?.trim() || undefined,
      password,
      role: role === 'admin' ? 'admin' : 'manager',
      assignedProjects,
      mustChangePassword: true,
      createdBy: req.user._id
    });
    const result = user.toObject();
    delete result.password;
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username?.trim() || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username: username.trim() });
    if (!user) return res.status(401).json({ message: 'Invalid username or password' });

    if ((user.status || 'active') === 'inactive') {
      return res.status(403).json({ message: 'This account is inactive. Contact an administrator.' });
    }
    if (user.status === 'locked' && user.lockUntil && user.lockUntil > new Date()) {
      const minutes = Math.max(1, Math.ceil((user.lockUntil - new Date()) / 60000));
      return res.status(423).json({
        message: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`
      });
    }
    if (user.status === 'locked') {
      user.status = 'active';
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
    }

    if (!(await user.comparePassword(password))) {
      user.failedLoginAttempts = Number(user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.status = 'locked';
        user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      }
      await user.save({ validateBeforeSave: false });
      return res.status(401).json({
        message: user.status === 'locked'
          ? 'Too many failed attempts. This account is locked for 15 minutes.'
          : 'Invalid username or password'
      });
    }

    user.status = 'active';
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });
    res.json(issueSession(res, user));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const logoutUser = async (req, res) => {
  try {
    req.user.tokenVersion = Number(req.user.tokenVersion || 0) + 1;
    await req.user.save({ validateBeforeSave: false });
    clearAuthCookie(res);
    res.json({ message: 'Signed out successfully' });
  } catch (error) {
    clearAuthCookie(res);
    res.status(500).json({ message: 'The local session was cleared, but server logout could not be confirmed' });
  }
};

const getCurrentUser = (req, res) => res.json(publicUser(req.user));

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must contain at least 8 characters' });
    }
    const user = await User.findById(req.user._id);
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    user.mustChangePassword = false;
    user.failedLoginAttempts = 0;
    user.status = 'active';
    user.lockUntil = undefined;
    await user.save();
    res.json(issueSession(res, user));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { registerUser, loginUser, logoutUser, getCurrentUser, changePassword };

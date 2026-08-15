const jwt = require('jsonwebtoken');
const User = require('../models/User');

const clearAuthCookie = (res) => res.clearCookie('token', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
});

const protect = async (req, res, next) => {
  let token;

  if (req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ message: 'This account no longer exists' });
    }

    if ((user.status || 'active') === 'inactive') {
      clearAuthCookie(res);
      return res.status(403).json({ message: 'This account is inactive. Contact an administrator.' });
    }

    if (user.status === 'locked' && user.lockUntil && user.lockUntil > new Date()) {
      clearAuthCookie(res);
      return res.status(423).json({ message: 'This account is temporarily locked. Try again later.' });
    }

    if (user.status === 'locked' && (!user.lockUntil || user.lockUntil <= new Date())) {
      user.status = 'active';
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
      await user.save({ validateBeforeSave: false });
    }

    if (Number(decoded.tokenVersion || 0) !== Number(user.tokenVersion || 0)) {
      clearAuthCookie(res);
      return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    }

    const allowedPasswordSetupPath = req.baseUrl === '/api/auth' &&
      ['/me', '/change-password', '/logout'].includes(req.path);
    if (user.mustChangePassword && !allowedPasswordSetupPath) {
      return res.status(428).json({ message: 'Change your temporary password before continuing' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to perform this action' });
  }
  next();
};

module.exports = { protect, authorize, clearAuthCookie };

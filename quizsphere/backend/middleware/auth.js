const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Not authorized, please login' });
  try {
    const d = jwt.verify(token, process.env.JWT_SECRET);
    const u = await User.findById(d.id).select('-password');
    if (!u) return res.status(401).json({ message: 'User not found' });
    req.user = u;
    next();
  } catch (e) {
    res.status(401).json({ message: 'Session expired, please login again' });
  }
};

// Role-based access control
exports.allow = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Access denied for your role' });

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const ah = require('../utils/asyncHandler');

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const out = (u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role });

router.post('/register', ah(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'All fields are required' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(400).json({ message: 'Email already registered' });
  const u = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    role: role === 'teacher' ? 'teacher' : 'student',
  });
  res.status(201).json({ token: sign(u), user: out(u) });
}));

router.post('/login', ah(async (req, res) => {
  const { email, password } = req.body;
  const u = await User.findOne({ email: String(email || '').toLowerCase() });
  if (!u || !(await bcrypt.compare(password || '', u.password))) return res.status(400).json({ message: 'Invalid email or password' });
  res.json({ token: sign(u), user: out(u) });
}));

router.get('/me', protect, (req, res) => res.json(out(req.user)));

module.exports = router;

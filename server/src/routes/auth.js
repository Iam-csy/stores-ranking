const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { auth } = require('../middleware');
const { wrap, fail, validate, createUser } = require('../utils');

router.post('/signup', wrap(async (req, res) => {
  await createUser(req.body, 'user');
  res.status(201).json({ message: 'Account created' });
}));

router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const [[u]] = await db.query('SELECT * FROM users WHERE email=?', [email || '']);
  if (!u || !(await bcrypt.compare(password || '', u.password))) fail(401, 'Invalid email or password');
  const user = { id: u.id, name: u.name, email: u.email, role: u.role };
  res.json({ token: jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '8h' }), user });
}));

router.put('/password', auth(), wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  validate({ password: newPassword }, { password: 'password' });
  const [[u]] = await db.query('SELECT password FROM users WHERE id=?', [req.user.id]);
  if (!(await bcrypt.compare(currentPassword || '', u.password))) fail(400, 'Current password is incorrect');
  await db.query('UPDATE users SET password=? WHERE id=?', [await bcrypt.hash(newPassword, 10), req.user.id]);
  res.json({ message: 'Password updated' });
}));

module.exports = router;

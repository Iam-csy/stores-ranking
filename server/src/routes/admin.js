const router = require('express').Router();
const db = require('../db');
const { auth } = require('../middleware');
const { wrap, fail, validate, createUser, orderBy } = require('../utils');
router.use(auth('admin'));

router.get('/stats', wrap(async (req, res) => {
  const [[r]] = await db.query(
    'SELECT (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM stores) stores, (SELECT COUNT(*) FROM ratings) ratings');
  res.json(r);
}));

router.post('/users', wrap(async (req, res) => {
  if (!['admin', 'user', 'owner'].includes(req.body.role)) fail(400, 'Choose a valid role');
  await createUser(req.body, req.body.role);
  res.status(201).json({ message: 'User created' });
}));

router.get('/users', wrap(async (req, res) => {
  const { name = '', email = '', address = '', role = '' } = req.query;
  const [rows] = await db.query(
    `SELECT id,name,email,address,role FROM users
     WHERE name LIKE ? AND email LIKE ? AND address LIKE ? AND (?='' OR role=?)
     ORDER BY ${orderBy(req.query, { name: 'name', email: 'email', address: 'address', role: 'role' }, 'name')}`,
    [`%${name}%`, `%${email}%`, `%${address}%`, role, role]);
  res.json(rows);
}));

router.get('/users/:id', wrap(async (req, res) => {
  const [[u]] = await db.query('SELECT id,name,email,address,role FROM users WHERE id=?', [req.params.id]);
  if (!u) fail(404, 'User not found');
  if (u.role === 'owner') {
    const [[r]] = await db.query(
      'SELECT ROUND(AVG(r.rating),1) rating FROM stores s JOIN ratings r ON r.store_id=s.id WHERE s.owner_id=?', [u.id]);
    u.rating = r.rating;
  }
  res.json(u);
}));

router.post('/stores', wrap(async (req, res) => {
  const { name, email, address, ownerId } = req.body;
  validate(req.body, { name: 'storeName', email: 'email', address: 'address' });
  if (ownerId) {
    const [[o]] = await db.query("SELECT id FROM users WHERE id=? AND role='owner'", [ownerId]);
    if (!o) fail(400, 'Owner must be a user with the Store Owner role');
  }
  try {
    await db.query('INSERT INTO stores (name,email,address,owner_id) VALUES (?,?,?,?)', [name, email, address, ownerId || null]);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') fail(409, 'Store email already exists');
    throw e;
  }
  res.status(201).json({ message: 'Store created' });
}));

router.get('/stores', wrap(async (req, res) => {
  const { name = '', email = '', address = '' } = req.query;
  const [rows] = await db.query(
    `SELECT s.id,s.name,s.email,s.address,ROUND(AVG(r.rating),1) rating
     FROM stores s LEFT JOIN ratings r ON r.store_id=s.id
     WHERE s.name LIKE ? AND s.email LIKE ? AND s.address LIKE ?
     GROUP BY s.id
     ORDER BY ${orderBy(req.query, { name: 's.name', email: 's.email', address: 's.address', rating: 'rating' }, 'name')}`,
    [`%${name}%`, `%${email}%`, `%${address}%`]);
  res.json(rows);
}));

module.exports = router;

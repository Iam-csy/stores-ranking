const bcrypt = require('bcryptjs');
const db = require('./db');

const rules = {
  name: v => typeof v === 'string' && v.length >= 20 && v.length <= 60 ? null : 'Name must be 20-60 characters',
  storeName: v => typeof v === 'string' && v.trim() && v.length <= 60 ? null : 'Store name is required (max 60 characters)',
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '') && v.length <= 255 ? null : 'Enter a valid email',
  address: v => typeof v === 'string' && v.trim() && v.length <= 400 ? null : 'Address is required (max 400 characters)',
  password: v => /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/.test(v || '') ? null : 'Password must be 8-16 characters with one uppercase letter and one special character',
};

const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const wrap = fn => (req, res, next) => fn(req, res, next).catch(e =>
  e.status ? res.status(e.status).json({ message: e.message }) : next(e));

// map = { bodyField: ruleName }
const validate = (body, map) => {
  const errs = Object.entries(map).map(([f, r]) => rules[r](body[f])).filter(Boolean);
  if (errs.length) fail(400, errs.join('. '));
};
const USER_RULES = { name: 'name', email: 'email', address: 'address', password: 'password' };

async function createUser(b, role) {
  validate(b, USER_RULES);
  try {
    const [r] = await db.query(
      'INSERT INTO users (name,email,password,address,role) VALUES (?,?,?,?,?)',
      [b.name, b.email, await bcrypt.hash(b.password, 10), b.address, role]);
    return r.insertId;
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') fail(409, 'Email is already registered');
    throw e;
  }
}

// Whitelisted ORDER BY to prevent SQL injection
const orderBy = (q, map, def) => `${map[q.sort] || map[def]} ${q.order === 'desc' ? 'DESC' : 'ASC'}`;

module.exports = { wrap, fail, validate, createUser, orderBy, USER_RULES };

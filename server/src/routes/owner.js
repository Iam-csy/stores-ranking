const router = require('express').Router();
const db = require('../db');
const { auth } = require('../middleware');
const { wrap, orderBy } = require('../utils');
router.use(auth('owner'));

router.get('/dashboard', wrap(async (req, res) => {
  const [[store]] = await db.query(
    `SELECT s.id,s.name,ROUND(AVG(r.rating),1) average, COUNT(r.id) total
     FROM stores s LEFT JOIN ratings r ON r.store_id=s.id WHERE s.owner_id=? GROUP BY s.id LIMIT 1`, [req.user.id]);
  if (!store) return res.json({ store: null, raters: [] });
  const [raters] = await db.query(
    `SELECT u.id,u.name,u.email,r.rating,r.updated_at date
     FROM ratings r JOIN users u ON u.id=r.user_id WHERE r.store_id=?
     ORDER BY ${orderBy(req.query, { name: 'u.name', email: 'u.email', rating: 'r.rating', date: 'r.updated_at' }, 'name')}`,
    [store.id]);
  res.json({ store, raters });
}));

module.exports = router;

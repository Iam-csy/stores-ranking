const router = require('express').Router();
const db = require('../db');
const { auth } = require('../middleware');
const { wrap, fail, orderBy } = require('../utils');
router.use(auth('user'));

router.get('/stores', wrap(async (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const [rows] = await db.query(
    `SELECT s.id,s.name,s.address,ROUND(AVG(r.rating),1) overall, mine.rating myRating
     FROM stores s
     LEFT JOIN ratings r ON r.store_id=s.id
     LEFT JOIN ratings mine ON mine.store_id=s.id AND mine.user_id=?
     WHERE s.name LIKE ? OR s.address LIKE ?
     GROUP BY s.id, mine.rating
     ORDER BY ${orderBy(req.query, { name: 's.name', address: 's.address', overall: 'overall', myRating: 'myRating' }, 'name')}`,
    [req.user.id, q, q]);
  res.json(rows);
}));

// Submit or modify (one rating per user per store)
router.put('/stores/:id/rating', wrap(async (req, res) => {
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) fail(400, 'Rating must be between 1 and 5');
  const [[s]] = await db.query('SELECT id FROM stores WHERE id=?', [req.params.id]);
  if (!s) fail(404, 'Store not found');
  await db.query(
    'INSERT INTO ratings (user_id,store_id,rating) VALUES (?,?,?) ON DUPLICATE KEY UPDATE rating=VALUES(rating)',
    [req.user.id, s.id, rating]);
  res.json({ message: 'Rating saved' });
}));

module.exports = router;

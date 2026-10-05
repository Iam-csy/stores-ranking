const jwt = require('jsonwebtoken');
exports.auth = (...roles) => (req, res, next) => {
  const token = (req.headers.authorization || '').split(' ')[1];
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); }
  catch { return res.status(401).json({ message: 'Please log in again' }); }
  if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ message: 'Access denied' });
  next();
};

const bcrypt = require('bcryptjs');
const db = require('./db');
(async () => {
  await db.query(
    "INSERT IGNORE INTO users (name,email,password,address,role) VALUES (?,?,?,?,'admin')",
    ['System Administrator Account', 'admin@example.com', await bcrypt.hash('Admin@1234', 10), 'Head Office']);
  console.log('Admin ready: admin@example.com / Admin@1234');
  process.exit(0);
})();

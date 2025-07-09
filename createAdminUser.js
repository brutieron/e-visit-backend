// createAdminUser.js
const bcrypt = require('bcryptjs');
const db = require('./config/db'); // Adjust path if needed

const createAdminUser = async () => {
  const name = 'Admin';
  const email = 'admin@evisit.com';
  const plainPassword = 'admin123';
  const role = 'admin';
  const is_verified = 1;

  try {
    // Check if admin exists
    const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.log('⚠️ Admin user already exists.');
      process.exit();
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Insert admin
    await db.query(
      `INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, role, is_verified]
    );

    console.log('✅ Admin user created successfully:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${plainPassword}`);
    process.exit();
  } catch (err) {
    console.error('❌ Failed to create admin user:', err);
    process.exit(1);
  }
};

createAdminUser();

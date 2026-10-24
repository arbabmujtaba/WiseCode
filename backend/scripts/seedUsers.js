// Creates (or resets) the test accounts in the real MongoDB database.
// Usage: npm run seed:users
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/User');

const ACCOUNTS = [
  {
    firstName: 'Test',
    lastName: 'User',
    emailId: process.env.TEST_USER_EMAIL || 'test@wisecode.dev',
    password: process.env.TEST_USER_PASSWORD || 'Test@12345',
    role: 'user',
  },
  {
    firstName: 'Admin',
    lastName: 'User',
    emailId: process.env.TEST_ADMIN_EMAIL || 'admin@wisecode.dev',
    password: process.env.TEST_ADMIN_PASSWORD || 'Admin@12345',
    role: 'admin',
  },
];

(async () => {
  try {
    await mongoose.connect(process.env.DB_CONNECT_STRING);
    for (const { password, emailId, ...rest } of ACCOUNTS) {
      const hash = await bcrypt.hash(password, 10);
      const existing = await User.findOne({ emailId });
      if (existing) {
        existing.set({ ...rest, password: hash });
        await existing.save();
        console.log(`Reset   ${rest.role.padEnd(5)} ${emailId} / ${password}`);
      } else {
        await User.create({ ...rest, emailId, password: hash });
        console.log(`Created ${rest.role.padEnd(5)} ${emailId} / ${password}`);
      }
    }
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();

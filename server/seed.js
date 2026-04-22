require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedUsers = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    // Clear existing users to start fresh
    console.log('Clearing existing users...');
    await User.deleteMany({});

    const usersToSeed = [
      { username: 'admin', email: 'admin@cyrils.com', password: 'password123', role: 'SuperAdmin' },
      { username: 'manager', email: 'manager@cyrils.com', password: 'password123', role: 'Manager' },
      { username: 'sales', email: 'sales@cyrils.com', password: 'password123', role: 'Sales' },
      { username: 'kitchen', email: 'kitchen@cyrils.com', password: 'password123', role: 'Kitchen' },
      { username: 'store', email: 'store@cyrils.com', password: 'password123', role: 'Store' },
    ];

    console.log('Inserting seed users...');
    for (const u of usersToSeed) {
      const newUser = new User(u);
      await newUser.save();
      console.log(`Created user: ${u.username} (${u.role}) - ${u.email}`);
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedUsers();

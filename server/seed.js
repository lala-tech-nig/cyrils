require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedUsers = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    // Check for existing users and register new ones
    const usersToSeed = [
      { username: 'admin', email: 'admin@cyrils.com', password: 'password123', role: 'SuperAdmin' },
      { username: 'manager', email: 'manager@cyrils.com', password: 'password123', role: 'Manager' },
      { username: 'sales', email: 'sales@cyrils.com', password: 'password123', role: 'Sales' },
      { username: 'salestest', email: 'salestest@cyrils.com', password: 'password123', role: 'Sales' },
      { username: 'kitchen', email: 'kitchen@cyrils.com', password: 'password123', role: 'Kitchen' },
      { username: 'store', email: 'store@cyrils.com', password: 'password123', role: 'Store' },
      { username: 'eatery', email: 'eatery@cyrils.com', password: 'password123', role: 'Eatery' },
      { username: 'aliyah', email: 'aliyah@cyrils.com', password: 'password123', role: 'Sales' },
      { username: 'aishat', email: 'aishat@cyrils.com', password: 'Aishat420', role: 'Sales' },
      { username: 'queen', email: 'queen@cyrils.com', password: 'password123', role: 'Sales' },
      { username: 'finance', email: 'finance@cyrils.com', password: 'password123', role: 'Finance' },
    ];

    console.log('Checking and registering seed users...');
    for (const u of usersToSeed) {
      const existingUser = await User.findOne({ username: u.username });
      if (existingUser) {
        console.log(`User ${u.username} already exists, skipping.`);
      } else {
        const newUser = new User(u);
        await newUser.save();
        console.log(`Created user: ${u.username} (${u.role}) - ${u.email}`);
      }
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedUsers();

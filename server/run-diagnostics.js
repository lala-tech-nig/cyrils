const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  console.log('1. Connecting to MongoDB to fix manager password...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected!');

  const User = require('./models/User');
  let manager = await User.findOne({ username: 'manager' });
  if (!manager) {
    console.log('Manager user not found! Creating one...');
    manager = new User({
      username: 'manager',
      email: 'manager@cyrils.com',
      password: 'password123',
      role: 'Manager',
      isActive: true
    });
  } else {
    console.log('Manager user found! Setting password to password123 and active status...');
    manager.password = 'password123';
    manager.isActive = true;
  }
  await manager.save();
  console.log('Manager user updated successfully!');
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');

  console.log('\n2. Logging in via HTTP to get JWT token...');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'manager',
      password: 'password123'
    })
  });

  if (!loginRes.ok) {
    const errBody = await loginRes.json();
    console.error('Login response was not OK:', errBody);
    return;
  }

  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Login successful! Token acquired.');

  const headers = { Authorization: `Bearer ${token}` };

  const endpoints = [
    { name: '/stats', url: 'http://localhost:5000/api/stats' },
    { name: '/attendance/report', url: 'http://localhost:5000/api/attendance/report' },
    { name: '/promotions/all', url: 'http://localhost:5000/api/promotions/all' },
    { name: '/products', url: 'http://localhost:5000/api/products' },
    { name: '/settings', url: 'http://localhost:5000/api/settings' },
    { name: '/orders/pr', url: 'http://localhost:5000/api/orders/pr' }
  ];

  console.log('\n3. Testing dashboard endpoints...');
  for (const ep of endpoints) {
    console.log(`Testing endpoint ${ep.name}...`);
    try {
      const res = await fetch(ep.url, { headers });
      if (res.ok) {
        const data = await res.json();
        console.log(`✅ ${ep.name}: SUCCESS (${res.status}) - Data count/size:`, Array.isArray(data) ? data.length : typeof data);
      } else {
        console.error(`❌ ${ep.name}: FAILED`);
        console.error(`   Status: ${res.status}`);
        try {
          const errData = await res.json();
          console.error('   Body:', errData);
        } catch {
          const errText = await res.text();
          console.error('   Body (text):', errText.slice(0, 500));
        }
      }
    } catch (err) {
      console.error(`❌ ${ep.name}: FAILED with error:`, err.message);
    }
  }
}

run().catch(console.error);

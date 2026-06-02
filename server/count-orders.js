const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Order = require('./models/Order');
  const Product = require('./models/Product');
  const User = require('./models/User');

  const orderCount = await Order.countDocuments({});
  const productCount = await Product.countDocuments({});
  const userCount = await User.countDocuments({});

  console.log('Orders in DB:', orderCount);
  console.log('Products in DB:', productCount);
  console.log('Users in DB:', userCount);

  await mongoose.disconnect();
}

run().catch(console.error);

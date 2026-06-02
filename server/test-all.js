const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected!');

  try {
    const Order = require('./models/Order');
    const User = require('./models/User');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    console.log('Running Promise.all...');
    const t0 = Date.now();
    const [todayOrders, monthOrders, topItems, staffCount, users] = await Promise.all([
      Order.find({ createdAt: { $gte: startOfDay } }),
      Order.find({ createdAt: { $gte: startOfMonth } }),
      Order.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            qty: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.quantity', '$items.priceAtTime'] } }
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            name: { $ifNull: ['$productInfo.name', 'Unknown'] },
            qty: 1,
            revenue: 1
          }
        },
        { $sort: { qty: -1 } },
        { $limit: 20 }
      ]),
      User.countDocuments({ isActive: true }),
      User.find({ isActive: true }).select('username role createdAt')
    ]);

    const t1 = Date.now();
    console.log(`Queries completed in ${t1 - t0}ms!`);
    console.log('todayOrders count:', todayOrders.length);
    console.log('monthOrders count:', monthOrders.length);
    console.log('topItems count:', topItems.length);
  } catch (err) {
    console.error('FAILED WITH ERROR:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected!');
  }
}

run().catch(console.error);

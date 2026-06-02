const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Order = require('./models/Order');

  console.log('Running aggregation...');
  const t0 = Date.now();
  
  const topItemsAgg = await Order.aggregate([
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
    { $limit: 15 }
  ]);

  const t1 = Date.now();
  console.log(`Aggregation completed in ${t1 - t0}ms!`);
  console.log('Top Items:', topItemsAgg);

  await mongoose.disconnect();
}

run().catch(console.error);

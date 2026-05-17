const cron = require('node-cron');
const DailySnapshot = require('./models/DailySnapshot');
const Order = require('./models/Order');
const Expense = require('./models/Expense');
const Inventory = require('./models/Inventory');
const Attendance = require('./models/Attendance');

// Run every day at 00:00 (Midnight)
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily midnight snapshot...');
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Calculate Total Revenue for yesterday
    const orders = await Order.find({ createdAt: { $gte: yesterday, $lt: today }, status: { $ne: 'Cancelled' } });
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    // Calculate Total Expenses for yesterday
    const expenses = await Expense.find({ createdAt: { $gte: yesterday, $lt: today } });
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    // Calculate Total Inventory Value (Current Snapshot)
    const inventory = await Inventory.find();
    let totalInventoryValue = 0;
    inventory.forEach(item => {
      const value = item.quantityInStock * (item.averageCostPerUnit || 0);
      totalInventoryValue += value;
    });

    // Calculate Active Staff yesterday
    const attendanceLogs = await Attendance.find({ date: { $gte: yesterday, $lt: today } });
    const activeStaffCount = new Set(attendanceLogs.map(log => log.user.toString())).size;

    // Save Snapshot
    const snapshot = new DailySnapshot({
      date: yesterday,
      totalRevenue,
      totalExpenses,
      totalInventoryValue,
      activeStaffCount,
      details: {
        orderCount: orders.length,
        expenseCount: expenses.length
      }
    });

    await snapshot.save();
    console.log(`Successfully saved daily snapshot for ${yesterday.toLocaleDateString()}`);
  } catch (err) {
    console.error('Error running daily midnight snapshot:', err);
  }
});

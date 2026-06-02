require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for dev
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // Initialize cron jobs
    require('./cron');
  })
  .catch(err => console.error('Could not connect to MongoDB:', err));

// Socket.io configuration
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Example: Client places an order
  socket.on('new_order', (orderData) => {
    console.log('New order received via socket:', orderData);
    // Broadcast to POS dashboard
    io.emit('order_received', orderData);
  });

  socket.on('join_department', (role) => {
    socket.join(role);
    console.log(`Socket ${socket.id} joined room ${role}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Pass IO to routes via middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Global Activity Logger Middleware
app.use((req, res, next) => {
  // Only log state-mutating requests (POST, PUT, DELETE)
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    // Skip auth routes to avoid logging passwords
    if (req.originalUrl.includes('/api/auth')) return next();

    // Hook into response finish to capture req.user (populated by protect middleware) and status
    res.on('finish', async () => {
      try {
        const ActivityLog = require('./models/ActivityLog');
        
        // Remove sensitive info from body just in case
        const safeBody = { ...req.body };
        delete safeBody.password;
        delete safeBody.token;

        const logEntry = new ActivityLog({
          user: req.user ? req.user.id : null,
          username: req.user ? req.user.username : 'Guest/System',
          role: req.user ? req.user.role : 'System',
          action: req.method,
          endpoint: req.originalUrl,
          details: safeBody,
          status: res.statusCode,
          ipAddress: req.ip
        });

        await logEntry.save();
      } catch (err) {
        console.error('Failed to log activity:', err);
      }
    });
  }
  next();
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/products', require('./routes/products'));
app.use('/api/users', require('./routes/users'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/promotions', require('./routes/promotions'));
app.use('/api/transfers', require('./routes/transfers'));
app.use('/api/kitchen', require('./routes/kitchen'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/kitchen-requests', require('./routes/kitchenRequests'));
app.use('/api/eatery-requests', require('./routes/eateryRequests'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/snapshots', require('./routes/snapshots'));

app.get('/', (req, res) => {
  res.send('Cyrils Foods API is running');
});

// 404 Handler
app.use((req, res, next) => {
  console.log(`404 NOT FOUND: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

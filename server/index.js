// Load environment variables BEFORE importing anything that reads process.env
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./utils/db');
const categoryRoutes = require('./routes/categoryRoutes');
const menuItemRoutes = require('./routes/menuItemRoutes');
const tableRoutes = require('./routes/tableRoutes');
const staffRoutes = require('./routes/staffRoutes');
const orderRoutes = require('./routes/orderRoutes');
const authRoutes = require('./routes/authRoutes');
const staffAuthRoutes = require('./routes/staffAuthRoutes');
const kitchenRoutes = require('./routes/kitchenRoutes');
const path = require('path');
const Restaurant = require('./models/Restaurant');
const menuItemController = require('./controllers/menuItemController');
const feedbackRoutes = require('./routes/feedbackRoutes');
const commentRoutes = require('./routes/commentRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('Created uploads directory');
}
const app = express();
// Behind a reverse proxy (Render/Vercel/etc.) to ensure correct secure cookie behavior
app.set('trust proxy', 1);

// Derive allowed origins from env for production safety and include sane defaults
const rawAllowed = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '';
const allowedOrigins = [
  // explicit env-configured
  ...rawAllowed.split(',').map(s => s.trim()).filter(Boolean),
  // local dev
  'http://localhost:3000',
  // your deployed frontend
  'https://jury-within-singer-cabinets.trycloudflare.com',
  'https://production-web-kappa.vercel.app',
];

const corsOrigin = function(origin, callback) {
  // Allow requests without Origin (server-server, curl)
  if (!origin) return callback(null, true);
  // Direct match against allowlist
  if (allowedOrigins.includes(origin)) return callback(null, true);
  // Allow all vercel.app subdomains if needed
  try {
    const { hostname } = new URL(origin);
    if (hostname.endsWith('.vercel.app')) return callback(null, true);
  } catch (_) {}
  return callback(new Error('Not allowed by CORS'));
};

// CORS should be applied as early as possible
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
}));
// Handle preflight across all routes (Express 5 + path-to-regexp v6: avoid bare '*')
app.options(/.*/, cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
}));

// Security & performance middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));
app.use(compression());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));
app.use(cookieParser());
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');

// Socket.IO CORS aligned with HTTP CORS
const io = new Server(server, { cors: { origin: corsOrigin, credentials: true } });

// Enhanced Socket.io connection for real-time order updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join restaurant room for real-time updates
  socket.on('joinRestaurant', (restaurantId) => {
    socket.join(`restaurant_${restaurantId}`);
    console.log(`Client ${socket.id} joined restaurant ${restaurantId}`);
  });

  // Join kitchen room for kitchen staff
  socket.on('joinKitchen', (restaurantId) => {
    socket.join(`kitchen_${restaurantId}`);
    console.log(`Kitchen staff ${socket.id} joined kitchen ${restaurantId}`);
  });

  // Handle order status updates
  socket.on('orderStatusUpdate', (data) => {
    socket.to(`restaurant_${data.restaurantId}`).emit('orderStatusUpdated', data);
    socket.to(`kitchen_${data.restaurantId}`).emit('orderStatusUpdated', data);
  });

  // Handle new orders
  socket.on('newOrder', (data) => {
    socket.to(`restaurant_${data.restaurantId}`).emit('newOrderReceived', data);
    socket.to(`kitchen_${data.restaurantId}`).emit('newOrderReceived', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available in controllers via req.io
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(express.json());

// Connect to MongoDB
connectDB().catch(err => {
  console.error('DB connection error:', err);
  process.exit(1);
});

// Root route
app.get('/', (req, res) => {
  res.send('CoptOfRestorent API is running');
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/restaurants/:restaurantId/orders', orderRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/restaurants/:restaurantId/categories', categoryRoutes);
app.use('/api/restaurants/:restaurantId/menu', menuItemRoutes);
app.use('/admin/:restaurantId/menu', menuItemRoutes); // Admin menu endpoint
app.use('/api/restaurants/:restaurantId/tables', tableRoutes);
app.use('/api/restaurants/:restaurantId/orders', orderRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/staff-auth', staffAuthRoutes); // New staff authentication routes
app.use('/api/kitchen', kitchenRoutes); // New kitchen management routes
app.use('/api/feedback', feedbackRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/chatbot', chatbotRoutes);

// Register public menu route for QR code users
app.get('/api/restaurants/menu/public/:restaurantId', menuItemController.listMenuItemsPublic);

// Legacy public QR URL: /r/:restaurantSlug/menu/:tableNumber
app.get('/r/:restaurantSlug/menu/:tableNumber', async (req, res, next) => {
  try {
    const { restaurantSlug, tableNumber } = req.params;
    const restaurant = await Restaurant.findOne({ slug: restaurantSlug });
    if (!restaurant) return res.status(404).send('Restaurant not found');
    // Optionally, add slug for SEO: /r/:restaurantId-:slug/menu/:tableNumber
    return res.redirect(301, `/r/${restaurant._id}-${restaurant.slug}/menu/${tableNumber}`);
  } catch (err) {
    next(err);
  }
});

// Note: legacy slug-based redirects removed for Express 5 compatibility. Re-add if needed with explicit middleware.

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
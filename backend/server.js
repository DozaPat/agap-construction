require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { startNotificationScheduler } = require('./services/notificationScheduler');

const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  });
  if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'no-store');
  }
  next();
});

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'https://agap-construction.vercel.app'
];
const configuredOrigins = (process.env.CLIENT_URLS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...defaultAllowedOrigins, ...configuredOrigins]);

app.use(cors({
  origin(origin, callback) {
    const isAllowedVercelPreview =
      typeof origin === 'string' &&
      /^https:\/\/agap-construction(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin);

    if (!origin || allowedOrigins.has(origin) || isAllowedVercelPreview) {
      return callback(null, true);
    }

    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Idempotency-Key']
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const userRoutes = require('./routes/user');
app.use('/api/users', userRoutes);

const projectRoutes = require('./routes/project');
app.use('/api/projects', projectRoutes);

const workerRoutes = require('./routes/worker');
app.use('/api/workers', workerRoutes);

const materialRoutes = require('./routes/material');
const attendanceRoutes = require('./routes/attendance');
app.use('/api/attendance', attendanceRoutes);

app.use('/api/materials', materialRoutes);

const toolRoutes = require('./routes/tool');
app.use('/api/tools', toolRoutes);

const expenseRoutes = require('./routes/expense');
app.use('/api/expenses', expenseRoutes);

const activityRoutes = require('./routes/activity');
app.use('/api/activities', activityRoutes);

const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

const reportRoutes = require('./routes/report');
app.use('/api/reports', reportRoutes);

const notificationRoutes = require('./routes/notification');
app.use('/api/notifications', notificationRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('✅ AGAP Construction Backend is running successfully!');
});

app.use((req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = Number.isInteger(err.status) ? err.status : 500;
  if (statusCode >= 500) console.error(err);

  let message = err.message || 'Something went wrong!';
  if (statusCode === 413) {
    message = 'Request body is too large';
  } else if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    message = 'Something went wrong!';
  }

  res.status(statusCode).json({ message });
});

// Start Server
const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required');
    }
    await connectDB();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
    startNotificationScheduler();
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exitCode = 1;
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };

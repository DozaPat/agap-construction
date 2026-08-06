require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

const app = express();

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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Idempotency-Key']
}));

app.use(express.json());
app.use(cookieParser());

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const projectRoutes = require('./routes/project');
app.use('/api/projects', projectRoutes);

const workerRoutes = require('./routes/worker');
app.use('/api/workers', workerRoutes);

const materialRoutes = require('./routes/material');
app.use('/api/materials', materialRoutes);

const toolRoutes = require('./routes/tool');
app.use('/api/tools', toolRoutes);

const expenseRoutes = require('./routes/expense');
app.use('/api/expenses', expenseRoutes);

const activityRoutes = require('./routes/activity');
app.use('/api/activities', activityRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('✅ AGAP Construction Backend is running successfully!');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Something went wrong!' });
});

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exitCode = 1;
  }
};

startServer();

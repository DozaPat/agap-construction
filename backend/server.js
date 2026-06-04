require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

const app = express();

// ==================== CORS FIX FOR VERCEL ====================
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://agap-construction.vercel.app',           // ← Add your actual Vercel URL here
    'https://agap-construction-*.vercel.app'          // ← This covers preview URLs
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
  }
};

startServer();
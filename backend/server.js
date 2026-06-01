require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5500', 'http://localhost:5500'],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);

// Add this after: app.use('/api/auth', authRoutes);
const projectRoutes = require('./routes/project');
app.use('/api/projects', projectRoutes);

// Add after: app.use('/api/projects', projectRoutes);
const workerRoutes = require('./routes/worker');
app.use('/api/workers', workerRoutes);

// Add after: app.use('/api/workers', workerRoutes);
const materialRoutes = require('./routes/material');
app.use('/api/materials', materialRoutes);

// Add after: app.use('/api/materials', materialRoutes);
const toolRoutes = require('./routes/tool');
app.use('/api/tools', toolRoutes);

// Add after: app.use('/api/tools', toolRoutes);
const expenseRoutes = require('./routes/expense');
app.use('/api/expenses', expenseRoutes);

// Report Route
const { generateReport } = require('./controllers/reportController');
app.get('/api/reports/generate/:projectId', generateReport);

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
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
  }
};

// ──────── SEED ROUTE (Run once) ────────
app.get('/api/seed', async (req, res) => {
  try {
    const User = require('./models/User');

    // Admin
    let admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      admin = await User.create({
        username: 'admin',
        name: 'Agap Admin',
        email: 'admin@agapconstruction.com',
        password: 'admin123',
        role: 'admin'
      });
      console.log('✅ Admin created');
    }

    // Manager
    let manager = await User.findOne({ username: 'manager' });
    if (!manager) {
      manager = await User.create({
        username: 'manager',
        name: 'Juan Manager',
        email: 'manager@agapconstruction.com',
        password: 'manager123',
        role: 'manager'
      });
      console.log('✅ Manager created');
    }

    res.json({ 
      message: '✅ Users seeded successfully!',
      users: {
        admin: { username: 'admin', password: 'admin123' },
        manager: { username: 'manager', password: 'manager123' }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

startServer();
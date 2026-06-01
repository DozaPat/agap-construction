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

// ──────── TEMPORARY MANAGER SEED ROUTE (DELETE AFTER USE) ────────
app.get('/api/seed-manager', async (req, res) => {
  try {
    const User = require('./models/User');

    const managerExists = await User.findOne({ username: 'manager' });
    
    if (managerExists) {
      return res.json({ message: '✅ Manager user already exists!' });
    }

    const manager = await User.create({
      username: 'manager',
      name: 'Juan Dela Cruz',
      email: 'manager@agapconstruction.com',
      password: 'manager123',           // Change later if you want
      role: 'manager'
    });

    res.json({ 
      message: '✅ Manager user created successfully!',
      manager: {
        username: manager.username,
        name: manager.name,
        role: manager.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

startServer();
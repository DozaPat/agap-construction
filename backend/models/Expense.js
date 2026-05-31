const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  description: { 
    type: String, 
    required: true,
    trim: true 
  },
  category: { 
    type: String, 
    required: true,
    enum: [
      'Labor', 
      'Material', 
      'Tool', 
      'Equipment Rental', 
      'Transportation', 
      'Permits & Fees', 
      'Miscellaneous'
    ]
  },
  amount: { 
    type: Number, 
    required: true,
    min: 0 
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  project: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project',
    required: true 
  },
  paidBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  notes: {
    type: String,
    trim: true
  }
}, { 
  timestamps: true 
});

const Expense = mongoose.model('Expense', expenseSchema);
module.exports = Expense;
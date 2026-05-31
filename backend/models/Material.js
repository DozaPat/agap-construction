const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  category: { 
    type: String, 
    required: true,
    enum: [
      'Cement', 
      'Steel', 
      'Sand', 
      'Gravel', 
      'Lumber', 
      'Paint', 
      'Electrical', 
      'Plumbing', 
      'Hardware', 
      'Other'
    ]
  },
  quantity: { 
    type: Number, 
    required: true,
    min: 0 
  },
  unit: { 
    type: String, 
    required: true,
    enum: ['bags', 'kg', 'tons', 'pieces', 'liters', 'meters', 'boxes', 'rolls']
  },
  unitPrice: { 
    type: Number, 
    required: true,
    min: 0 
  },
  supplier: {
    type: String,
    trim: true
  },
  project: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project' 
  },
  reorderPoint: {
    type: Number,
    default: 20
  },
  stockLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, { 
  timestamps: true 
});

const Material = mongoose.model('Material', materialSchema);
module.exports = Material;
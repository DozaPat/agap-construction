const mongoose = require('mongoose');
const { randomBytes } = require('crypto');

const generateMaterialId = () =>
  `MAT-${Date.now().toString(36).toUpperCase()}-${randomBytes(3)
    .toString('hex')
    .toUpperCase()}`;

const materialSchema = new mongoose.Schema({
  materialId: {
    type: String,
    unique: true,
    sparse: true,
    immutable: true
  },
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
    ref: 'Project',
    required: true
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

materialSchema.pre('validate', function assignMaterialId() {
  if (this.isNew && !this.materialId) {
    this.materialId = generateMaterialId();
  }
});

const Material = mongoose.model('Material', materialSchema);
module.exports = Material;
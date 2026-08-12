const mongoose = require('mongoose');
const { randomBytes } = require('crypto');

const generateToolId = () =>
  `TL-${Date.now().toString(36).toUpperCase()}-${randomBytes(3)
    .toString('hex')
    .toUpperCase()}`;

const toolSchema = new mongoose.Schema({
  toolId: {
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
      'Power Tool', 
      'Hand Tool', 
      'Safety Equipment', 
      'Measuring Tool', 
      'Cutting Tool', 
      'Welding Tool', 
      'Plumbing Tool', 
      'Electrical Tool', 
      'Other'
    ]
  },
  quantity: { 
    type: Number, 
    required: true,
    min: 0 
  },
  condition: { 
    type: String, 
    enum: ['good', 'needs repair', 'damaged'], 
    default: 'good' 
  },
  status: { 
    type: String, 
    enum: ['available', 'in-use', 'under-maintenance'], 
    default: 'available' 
  },
  project: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project' 
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    default: null
  },
  checkedOutAt: {
    type: Date,
    default: null
  },
  expectedReturnDate: {
    type: Date,
    default: null
  },
  checkedInAt: {
    type: Date,
    default: null
  },
  checkedOutBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastMaintenance: { 
    type: Date 
  },
  notes: {
    type: String,
    trim: true
  }
}, { 
  timestamps: true 
});

toolSchema.pre('validate', function prepareTool() {
  if (this.isNew && !this.toolId) {
    this.toolId = generateToolId();
  }

  if (this.status === 'in-use') {
    if (!this.project) this.invalidate('project', 'A project is required for tools in use');
    if (!this.assignedTo) this.invalidate('assignedTo', 'A worker is required for tools in use');
    if (!this.checkedOutAt) this.invalidate('checkedOutAt', 'Checkout date is required');
    if (!this.expectedReturnDate) this.invalidate('expectedReturnDate', 'Expected return date is required');

    if (
      this.checkedOutAt &&
      this.expectedReturnDate &&
      this.expectedReturnDate < this.checkedOutAt
    ) {
      this.invalidate('expectedReturnDate', 'Expected return date cannot be before checkout date');
    }
  }
});

const Tool = mongoose.model('Tool', toolSchema);
module.exports = Tool;

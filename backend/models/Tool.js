const mongoose = require('mongoose');

const toolSchema = new mongoose.Schema({
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

const Tool = mongoose.model('Tool', toolSchema);
module.exports = Tool;
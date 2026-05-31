const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  position: { 
    type: String, 
    required: true,
    enum: [
      'Mason', 
      'Carpenter', 
      'Welder', 
      'Electrician', 
      'Plumber', 
      'Painter', 
      'Laborer', 
      'Foreman', 
      'Supervisor', 
      'Other'
    ]
  },
  phone: { 
    type: String, 
    required: true,
    trim: true 
  },
  dailySalary: { 
    type: Number, 
    required: true,
    min: 0 
  },
  availability: { 
    type: Boolean, 
    default: true 
  },
  assignedProjects: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project' 
  }],
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  },
  notes: {
    type: String,
    trim: true
  }
}, { 
  timestamps: true 
});

const Worker = mongoose.model('Worker', workerSchema);
module.exports = Worker;
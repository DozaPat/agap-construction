const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  description: { 
    type: String,
    trim: true 
  },
  location: { 
    type: String, 
    required: true,
    trim: true 
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date 
  },
  budget: { 
    type: Number, 
    required: true,
    min: 0 
  },
  status: { 
    type: String, 
    enum: ['pending', 'in-progress', 'completed', 'delayed', 'cancelled'], 
    default: 'pending' 
  },
  progress: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 100 
  },
  manager: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  workers: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Worker' 
  }],
  totalExpenses: {
    type: Number,
    default: 0
  },
  requestKey: {
    type: String,
    unique: true,
    sparse: true,
    select: false
  }
}, {
  timestamps: true
});

projectSchema.pre('validate', function validateProjectDatesAndProgress() {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'End date cannot be earlier than the start date');
  }

  if (this.progress >= 100 || this.status === 'completed') {
    this.progress = 100;
    this.status = 'completed';
  }
});

const Project = mongoose.model('Project', projectSchema);
module.exports = Project;
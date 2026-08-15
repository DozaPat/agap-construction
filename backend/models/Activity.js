const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['created', 'updated', 'deleted'],
    required: true
  },
  entityType: {
    type: String,
    enum: ['project', 'worker', 'material', 'tool', 'expense', 'user'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  entityName: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

activitySchema.index({ createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);
module.exports = Activity;

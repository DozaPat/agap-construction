const mongoose = require('mongoose');

const attendanceDaysSchema = new mongoose.Schema({
  monday: { type: Boolean, default: false },
  tuesday: { type: Boolean, default: false },
  wednesday: { type: Boolean, default: false },
  thursday: { type: Boolean, default: false },
  friday: { type: Boolean, default: false },
  saturday: { type: Boolean, default: false },
  sunday: { type: Boolean, default: false }
}, { _id: false });

const attendanceRecordSchema = new mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true
  },
  workerName: {
    type: String,
    required: true,
    trim: true
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  dailySalary: {
    type: Number,
    required: true,
    min: 0
  },
  days: {
    type: attendanceDaysSchema,
    default: () => ({})
  },
  bonus: {
    type: Number,
    default: 0,
    min: 0
  },
  overtime: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

const attendanceSheetSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  weekStart: {
    type: Date,
    required: true
  },
  records: {
    type: [attendanceRecordSchema],
    default: []
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

attendanceSheetSchema.index({ project: 1, weekStart: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceSheet', attendanceSheetSchema);

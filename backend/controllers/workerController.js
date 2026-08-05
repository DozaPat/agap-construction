const Worker = require('../models/Worker');
const { recordActivity } = require('../services/activityService');

// Get all workers
const getWorkers = async (req, res) => {
  try {
    const workers = await Worker.find()
      .populate('assignedProjects', 'name location');
    res.json(workers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single worker
const getWorker = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id)
      .populate('assignedProjects', 'name');
    if (!worker) return res.status(404).json({ message: 'Worker not found' });
    res.json(worker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new worker
const createWorker = async (req, res) => {
  try {
    const worker = await Worker.create(req.body);
    await recordActivity({
      action: 'created',
      entityType: 'worker',
      entityId: worker._id,
      entityName: worker.name,
      actor: req.user?._id
    });
    res.status(201).json(worker);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update worker
const updateWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!worker) return res.status(404).json({ message: 'Worker not found' });
    await recordActivity({
      action: 'updated',
      entityType: 'worker',
      entityId: worker._id,
      entityName: worker.name,
      actor: req.user?._id
    });
    res.json(worker);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete worker
const deleteWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndDelete(req.params.id);
    if (!worker) return res.status(404).json({ message: 'Worker not found' });
    await recordActivity({
      action: 'deleted',
      entityType: 'worker',
      entityId: worker._id,
      entityName: worker.name,
      actor: req.user?._id
    });
    res.json({ message: 'Worker deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getWorkers,
  getWorker,
  createWorker,
  updateWorker,
  deleteWorker
};

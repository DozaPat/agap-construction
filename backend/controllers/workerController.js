const Worker = require('../models/Worker');
const Project = require('../models/Project');
const { recordActivity } = require('../services/activityService');
const { isProjectOperational, projectStatusMessage } = require('../utils/projectLifecycle');

const validateAssignments = async (assignedProjects = [], existingProjectIds = []) => {
  const projectIds = [...new Set(assignedProjects.map(String))];
  const allProjectIds = [...new Set([...projectIds, ...existingProjectIds.map(String)])];
  if (!allProjectIds.length) return null;
  const projects = await Project.find({ _id: { $in: allProjectIds } }).select('name status');
  if (projects.filter((project) => projectIds.includes(String(project._id))).length !== projectIds.length) {
    return 'One or more selected projects no longer exist.';
  }
  const existingIds = new Set(existingProjectIds.map(String));
  const newLockedProject = projects.find((project) =>
    !isProjectOperational(project.status) && !existingIds.has(String(project._id))
  );
  if (newLockedProject) {
    return projectStatusMessage(newLockedProject.status, 'assign workers to it');
  }
  const requestedIds = new Set(projectIds);
  const removedLockedProject = projects.find((project) =>
    !isProjectOperational(project.status) &&
    existingIds.has(String(project._id)) &&
    !requestedIds.has(String(project._id))
  );
  return removedLockedProject
    ? projectStatusMessage(removedLockedProject.status, 'remove its assigned workers')
    : null;
};

// Get all workers
const getWorkers = async (req, res) => {
  try {
    const workers = await Worker.find()
      .populate('assignedProjects', 'name location status');
    res.json(workers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single worker
const getWorker = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id)
      .populate('assignedProjects', 'name status');
    if (!worker) return res.status(404).json({ message: 'Worker not found' });
    res.json(worker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new worker
const createWorker = async (req, res) => {
  try {
    const assignmentError = await validateAssignments(req.body.assignedProjects);
    if (assignmentError) return res.status(409).json({ message: assignmentError });
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
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: 'Worker not found' });
    if (req.body.assignedProjects) {
      const assignmentError = await validateAssignments(
        req.body.assignedProjects,
        worker.assignedProjects
      );
      if (assignmentError) return res.status(409).json({ message: assignmentError });
    }
    Object.assign(worker, req.body);
    await worker.save();
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
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: 'Worker not found' });
    const lockedProject = await Project.findOne({
      status: { $in: ['pending', 'completed', 'cancelled'] },
      $or: [
        { _id: { $in: worker.assignedProjects || [] } },
        { workers: worker._id }
      ]
    }).select('status');
    if (lockedProject) {
      return res.status(409).json({
        message: projectStatusMessage(
          lockedProject.status,
          'delete a worker recorded in its history'
        )
      });
    }
    await worker.deleteOne();
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

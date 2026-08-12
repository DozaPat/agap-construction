const mongoose = require('mongoose');
const Tool = require('../models/Tool');
const Worker = require('../models/Worker');
const Project = require('../models/Project');
const { recordActivity } = require('../services/activityService');

const toolPopulation = [
  { path: 'project', select: 'name' },
  { path: 'assignedTo', select: 'name position status' }
];

const serializeTool = (tool) => {
  const value = tool.toObject ? tool.toObject() : tool;
  return {
    ...value,
    toolId: value.toolId || `TL-${String(value._id).slice(-8).toUpperCase()}`
  };
};

const populateTool = (query) => query.populate(toolPopulation);

const requireAdmin = (req, res) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ message: 'Only administrators can manage tool assignments' });
    return false;
  }
  return true;
};

const getTools = async (req, res) => {
  try {
    const filter = {};
    if (req.query.project) {
      if (!mongoose.isValidObjectId(req.query.project)) {
        return res.status(400).json({ message: 'Invalid project' });
      }
      filter.project = req.query.project;
    }

    const tools = await populateTool(Tool.find(filter).sort({ createdAt: -1 }));
    res.json(tools.map(serializeTool));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTool = async (req, res) => {
  try {
    const tool = await populateTool(Tool.findById(req.params.id));
    if (!tool) return res.status(404).json({ message: 'Tool not found' });
    res.json(serializeTool(tool));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createTool = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { name, category, quantity, condition = 'good', project, notes } = req.body;
    if (!project) return res.status(400).json({ message: 'Select a project first' });

    const projectExists = await Project.exists({ _id: project });
    if (!projectExists) return res.status(404).json({ message: 'Project not found' });

    const tool = await Tool.create({
      name,
      category,
      quantity,
      condition,
      project,
      notes,
      status: condition === 'good' ? 'available' : 'under-maintenance'
    });

    await recordActivity({
      action: 'created',
      entityType: 'tool',
      entityId: tool._id,
      entityName: tool.name,
      actor: req.user?._id
    });

    const populated = await populateTool(Tool.findById(tool._id));
    res.status(201).json(serializeTool(populated));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateTool = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) return res.status(404).json({ message: 'Tool not found' });

    const previousProject = String(tool.project || '');
    const previousCondition = tool.condition;

    const allowedFields = ['name', 'category', 'quantity', 'condition', 'project', 'notes'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) tool[field] = req.body[field];
    });

    if (!tool.project) return res.status(400).json({ message: 'A project is required' });
    if (tool.status === 'in-use') {
      if (req.body.project && String(req.body.project) !== previousProject) {
        return res.status(400).json({ message: 'Check the tool in before changing its project' });
      }
      if (req.body.condition && req.body.condition !== previousCondition) {
        return res.status(400).json({ message: 'Use Check In to record the returning condition' });
      }
    } else {
      tool.status = tool.condition === 'good' ? 'available' : 'under-maintenance';
    }

    await tool.save();
    await recordActivity({
      action: 'updated',
      entityType: 'tool',
      entityId: tool._id,
      entityName: tool.name,
      actor: req.user?._id
    });

    const populated = await populateTool(Tool.findById(tool._id));
    res.json(serializeTool(populated));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const checkOutTool = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { project: projectId, worker: workerId, checkoutDate, expectedReturnDate } = req.body;
    if (!projectId || !workerId || !checkoutDate || !expectedReturnDate) {
      return res.status(400).json({
        message: 'Project, worker, checkout date, and expected return date are required'
      });
    }

    const tool = await Tool.findById(req.params.id);
    if (!tool) return res.status(404).json({ message: 'Tool not found' });
    if (tool.status === 'in-use') {
      return res.status(409).json({ message: 'This tool is already checked out' });
    }
    if (tool.condition !== 'good') {
      return res.status(400).json({ message: 'Only tools in good condition can be checked out' });
    }

    const [project, worker] = await Promise.all([
      Project.findById(projectId).select('name workers'),
      Worker.findOne({ _id: workerId, status: 'active' }).select('name assignedProjects')
    ]);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!worker) return res.status(404).json({ message: 'Active worker not found' });

    const workerIsAssigned =
      worker.assignedProjects.some((id) => String(id) === String(projectId)) ||
      project.workers.some((id) => String(id) === String(workerId));
    if (!workerIsAssigned) {
      return res.status(400).json({ message: 'Worker is not assigned to the selected project' });
    }

    const checkedOutAt = new Date(checkoutDate);
    const returnDate = new Date(expectedReturnDate);
    if (Number.isNaN(checkedOutAt.getTime()) || Number.isNaN(returnDate.getTime())) {
      return res.status(400).json({ message: 'Enter valid checkout and return dates' });
    }
    if (returnDate < checkedOutAt) {
      return res.status(400).json({ message: 'Expected return date cannot be before checkout date' });
    }

    tool.project = projectId;
    tool.assignedTo = workerId;
    tool.checkedOutAt = checkedOutAt;
    tool.expectedReturnDate = returnDate;
    tool.checkedOutBy = req.user._id;
    tool.checkedInAt = null;
    tool.status = 'in-use';
    await tool.save();

    await recordActivity({
      action: 'updated',
      entityType: 'tool',
      entityId: tool._id,
      entityName: `${tool.name} checked out to ${worker.name}`,
      actor: req.user._id
    });

    const populated = await populateTool(Tool.findById(tool._id));
    res.json(serializeTool(populated));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const checkInTool = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { condition } = req.body;
    if (!['good', 'needs repair'].includes(condition)) {
      return res.status(400).json({ message: 'Returning condition must be Good or Needs Repair' });
    }

    const tool = await Tool.findById(req.params.id);
    if (!tool) return res.status(404).json({ message: 'Tool not found' });
    if (tool.status !== 'in-use') {
      return res.status(409).json({ message: 'This tool is not currently checked out' });
    }

    tool.condition = condition;
    tool.status = condition === 'good' ? 'available' : 'under-maintenance';
    tool.assignedTo = null;
    tool.checkedOutAt = null;
    tool.expectedReturnDate = null;
    tool.checkedOutBy = null;
    tool.checkedInAt = new Date();
    if (condition === 'needs repair') tool.lastMaintenance = new Date();
    await tool.save();

    await recordActivity({
      action: 'updated',
      entityType: 'tool',
      entityId: tool._id,
      entityName: `${tool.name} checked in`,
      actor: req.user._id
    });

    const populated = await populateTool(Tool.findById(tool._id));
    res.json(serializeTool(populated));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteTool = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) return res.status(404).json({ message: 'Tool not found' });
    if (tool.status === 'in-use') {
      return res.status(409).json({ message: 'Check the tool in before deleting it' });
    }

    await tool.deleteOne();
    await recordActivity({
      action: 'deleted',
      entityType: 'tool',
      entityId: tool._id,
      entityName: tool.name,
      actor: req.user?._id
    });
    res.json({ message: 'Tool deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTools,
  getTool,
  createTool,
  updateTool,
  checkOutTool,
  checkInTool,
  deleteTool
};

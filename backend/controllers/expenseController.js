const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Project = require('../models/Project');
const { recordActivity } = require('../services/activityService');
const { getProjectLifecycle, isProjectOperational, projectStatusMessage } = require('../utils/projectLifecycle');
const { projectScopeFilter, requireProjectAccess } = require('../utils/accessControl');

const categories = [
  'Labor', 'Material', 'Tool', 'Equipment Rental', 'Transportation',
  'Permits & Fees', 'Miscellaneous'
];
const editableFields = ['description', 'category', 'amount', 'date', 'project', 'notes'];
const pickFields = (body) => editableFields.reduce((result, field) => {
  if (Object.prototype.hasOwnProperty.call(body, field)) result[field] = body[field];
  return result;
}, {});
const populateExpense = (query) => query
  .populate('project', 'name budget status')
  .populate('paidBy', 'name');

const getExpenses = async (req, res) => {
  try {
    const filter = await projectScopeFilter(req.user);
    if (req.query.project) {
      if (!mongoose.isValidObjectId(req.query.project)) {
        return res.status(400).json({ message: 'Invalid project' });
      }
      if (!(await requireProjectAccess(req, res, req.query.project))) return;
      filter.project = req.query.project;
    }
    if (req.query.category) {
      if (!categories.includes(req.query.category)) {
        return res.status(400).json({ message: 'Invalid expense category' });
      }
      filter.category = req.query.category;
    }
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = new Date(`${req.query.from}T00:00:00.000Z`);
      if (req.query.to) filter.date.$lte = new Date(`${req.query.to}T23:59:59.999Z`);
    }
    if (req.query.search) {
      filter.description = { $regex: String(req.query.search).slice(0, 100), $options: 'i' };
    }
    const expenses = await populateExpense(Expense.find(filter).sort({ date: -1, createdAt: -1 }));
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getExpense = async (req, res) => {
  try {
    const expense = await populateExpense(Expense.findById(req.params.id));
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (!(await requireProjectAccess(req, res, expense.project?._id))) return;
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createExpense = async (req, res) => {
  try {
    const data = pickFields(req.body);
    if (!data.project) return res.status(400).json({ message: 'Project is required' });
    if (!(await requireProjectAccess(req, res, data.project))) return;
    const lifecycle = await getProjectLifecycle(data.project);
    if (!lifecycle.project) return res.status(404).json({ message: lifecycle.message });
    if (lifecycle.message) return res.status(409).json({ message: projectStatusMessage(lifecycle.project.status, 'record expenses for it') });
    const expense = await Expense.create({ ...data, paidBy: req.user._id });
    await recordActivity({
      action: 'created', entityType: 'expense', entityId: expense._id,
      entityName: expense.description, actor: req.user._id
    });
    res.status(201).json(await populateExpense(Expense.findById(expense._id)));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (!(await requireProjectAccess(req, res, expense.project))) return;
    const currentProject = await Project.findById(expense.project).select('status');
    if (!currentProject) return res.status(404).json({ message: 'Project not found' });
    if (!isProjectOperational(currentProject.status)) {
      return res.status(409).json({ message: projectStatusMessage(currentProject.status, 'edit its expenses') });
    }
    if (req.body.project && String(req.body.project) !== String(expense.project)) {
      if (!(await requireProjectAccess(req, res, req.body.project))) return;
      const lifecycle = await getProjectLifecycle(req.body.project);
      if (!lifecycle.project) return res.status(404).json({ message: lifecycle.message });
      if (lifecycle.message) return res.status(409).json({ message: projectStatusMessage(lifecycle.project.status, 'move expenses to it') });
    }
    Object.assign(expense, pickFields(req.body));
    await expense.save();
    await recordActivity({
      action: 'updated', entityType: 'expense', entityId: expense._id,
      entityName: expense.description, actor: req.user?._id
    });
    res.json(await populateExpense(Expense.findById(expense._id)));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id).populate('project', 'status');
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (!(await requireProjectAccess(req, res, expense.project?._id))) return;
    if (!isProjectOperational(expense.project.status)) {
      return res.status(409).json({ message: projectStatusMessage(expense.project.status, 'delete its expenses') });
    }
    await expense.deleteOne();
    await recordActivity({
      action: 'deleted', entityType: 'expense', entityId: expense._id,
      entityName: expense.description, actor: req.user?._id
    });
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getExpenses, getExpense, createExpense, updateExpense, deleteExpense };

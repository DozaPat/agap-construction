const Expense = require('../models/Expense');
const { recordActivity } = require('../services/activityService');

// Get all expenses
const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find()
      .populate('project', 'name')
      .populate('paidBy', 'name')
      .sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single expense
const getExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('project', 'name');
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new expense
const createExpense = async (req, res) => {
  try {
    const expense = await Expense.create(req.body);
    await recordActivity({
      action: 'created',
      entityType: 'expense',
      entityId: expense._id,
      entityName: expense.description,
      actor: req.user?._id
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update expense
const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    await recordActivity({
      action: 'updated',
      entityType: 'expense',
      entityId: expense._id,
      entityName: expense.description,
      actor: req.user?._id
    });
    res.json(expense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete expense
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    await recordActivity({
      action: 'deleted',
      entityType: 'expense',
      entityId: expense._id,
      entityName: expense.description,
      actor: req.user?._id
    });
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense
};

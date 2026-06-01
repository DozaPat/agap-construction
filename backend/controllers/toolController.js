const Tool = require('../models/Tool');

// Get all tools
const getTools = async (req, res) => {
  try {
    const tools = await Tool.find()
      .populate('project', 'name');
    res.json(tools);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single tool
const getTool = async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id)
      .populate('project', 'name');
    if (!tool) return res.status(404).json({ message: 'Tool not found' });
    res.json(tool);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new tool
const createTool = async (req, res) => {
  try {
    const tool = await Tool.create(req.body);
    res.status(201).json(tool);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update tool
const updateTool = async (req, res) => {
  try {
    const tool = await Tool.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!tool) return res.status(404).json({ message: 'Tool not found' });
    res.json(tool);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete tool
const deleteTool = async (req, res) => {
  try {
    const tool = await Tool.findByIdAndDelete(req.params.id);
    if (!tool) return res.status(404).json({ message: 'Tool not found' });
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
  deleteTool
};
const Material = require('../models/Material');

// Get all materials
const getMaterials = async (req, res) => {
  try {
    const materials = await Material.find()
      .populate('project', 'name');
    res.json(materials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single material
const getMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id)
      .populate('project', 'name');
    if (!material) return res.status(404).json({ message: 'Material not found' });
    res.json(material);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new material
const createMaterial = async (req, res) => {
  try {
    const material = await Material.create(req.body);
    res.status(201).json(material);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update material
const updateMaterial = async (req, res) => {
  try {
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!material) return res.status(404).json({ message: 'Material not found' });
    res.json(material);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete material
const deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findByIdAndDelete(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material not found' });
    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial
};
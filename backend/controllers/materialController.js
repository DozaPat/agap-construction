const Material = require('../models/Material');
const { recordActivity } = require('../services/activityService');

const serializeMaterial = (materialDocument) => {
  const material = materialDocument.toObject();
  const materialId =
    material.materialId ||
    `MAT-${material._id.toString().slice(-8).toUpperCase()}`;
  const reorderPoint = Number(material.reorderPoint ?? 20);

  return {
    ...material,
    materialId,
    totalValue: Number(material.quantity || 0) * Number(material.unitPrice || 0),
    isLowStock: Number(material.quantity || 0) <= reorderPoint
  };
};

const editableFields = [
  'name',
  'category',
  'quantity',
  'unit',
  'unitPrice',
  'supplier',
  'project',
  'reorderPoint'
];

const pickMaterialFields = (body) => editableFields.reduce((fields, key) => {
  if (Object.prototype.hasOwnProperty.call(body, key)) fields[key] = body[key];
  return fields;
}, {});

// Get all materials
const getMaterials = async (req, res) => {
  try {
    const filter = req.query.project ? { project: req.query.project } : {};
    const materials = await Material.find(filter)
      .populate('project', 'name')
      .sort({ createdAt: -1 });
    res.json(materials.map(serializeMaterial));
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
    res.json(serializeMaterial(material));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new material
const createMaterial = async (req, res) => {
  try {
    const material = await Material.create(pickMaterialFields(req.body));
    await recordActivity({
      action: 'created',
      entityType: 'material',
      entityId: material._id,
      entityName: material.name,
      actor: req.user?._id
    });
    res.status(201).json(serializeMaterial(material));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update material
const updateMaterial = async (req, res) => {
  try {
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      pickMaterialFields(req.body),
      { new: true, runValidators: true }
    );
    if (!material) return res.status(404).json({ message: 'Material not found' });
    await recordActivity({
      action: 'updated',
      entityType: 'material',
      entityId: material._id,
      entityName: material.name,
      actor: req.user?._id
    });
    res.json(serializeMaterial(material));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete material
const deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findByIdAndDelete(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material not found' });
    await recordActivity({
      action: 'deleted',
      entityType: 'material',
      entityId: material._id,
      entityName: material.name,
      actor: req.user?._id
    });
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

const Project = require('../models/Project');

const getAccessibleProjectIds = async (user) => {
  if (user.role === 'admin') return null;

  const assigned = (user.assignedProjects || []).map((project) =>
    String(project?._id || project)
  );
  const managed = await Project.find({ manager: user._id }).distinct('_id');
  return [...new Set([...assigned, ...managed.map(String)])];
};

const canAccessProject = async (user, projectId) => {
  if (user.role === 'admin') return true;
  if (!projectId) return false;
  const ids = await getAccessibleProjectIds(user);
  return ids.includes(String(projectId?._id || projectId));
};

const requireProjectAccess = async (req, res, projectId) => {
  const allowed = await canAccessProject(req.user, projectId);
  if (!allowed) {
    res.status(403).json({ message: 'You are not assigned to this project' });
    return false;
  }
  return true;
};

const projectScopeFilter = async (user, field = 'project') => {
  const ids = await getAccessibleProjectIds(user);
  return ids === null ? {} : { [field]: { $in: ids } };
};

module.exports = {
  getAccessibleProjectIds,
  canAccessProject,
  requireProjectAccess,
  projectScopeFilter
};

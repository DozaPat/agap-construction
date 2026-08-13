const Project = require('../models/Project');

const OPERATIONAL_PROJECT_STATUSES = ['in-progress', 'delayed'];

const isProjectOperational = (status) =>
  OPERATIONAL_PROJECT_STATUSES.includes(status);

const projectStatusMessage = (status, action = 'add operational records') => {
  if (status === 'pending') {
    return `This project is pending. Update it to In Progress before you ${action}.`;
  }
  if (status === 'completed') {
    return `This project is already completed. Historical records remain available, but you cannot ${action}.`;
  }
  if (status === 'cancelled') {
    return `This project was cancelled by the admin. Historical records remain available, but you cannot ${action}.`;
  }
  return null;
};

const getProjectLifecycle = async (projectId) => {
  const project = await Project.findById(projectId).select('name status');
  if (!project) return { project: null, message: 'Project not found' };
  return {
    project,
    message: isProjectOperational(project.status)
      ? null
      : projectStatusMessage(project.status)
  };
};

module.exports = {
  OPERATIONAL_PROJECT_STATUSES,
  isProjectOperational,
  projectStatusMessage,
  getProjectLifecycle
};

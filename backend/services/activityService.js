const Activity = require('../models/Activity');

const actionLabels = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted'
};

const entityLabels = {
  project: 'project',
  worker: 'worker',
  material: 'material',
  tool: 'tool',
  expense: 'expense'
};

const recordActivity = async ({
  action,
  entityType,
  entityId,
  entityName,
  actor
}) => {
  try {
    const verb = actionLabels[action] || action;
    const subject = entityLabels[entityType] || entityType;

    await Activity.create({
      action,
      entityType,
      entityId,
      entityName,
      actor,
      message: `${verb} ${subject} "${entityName}"`
    });
  } catch (error) {
    console.error('Activity logging failed:', error.message);
  }
};

module.exports = { recordActivity };

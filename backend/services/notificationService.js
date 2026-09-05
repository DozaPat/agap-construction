const Notification = require('../models/Notification');
const Project = require('../models/Project');
const User = require('../models/User');
const { sendPushToUsers } = require('./firebaseMessagingService');

const uniqueIds = (values) => [...new Set(values.filter(Boolean).map(String))];

const getProjectRecipientIds = async (projectId) => {
  const project = await Project.findById(projectId).select('manager').lean();
  const users = await User.find({
    status: 'active',
    $or: [
      { role: 'admin' },
      { assignedProjects: projectId },
      ...(project?.manager ? [{ _id: project.manager }] : [])
    ]
  }).select('_id').lean();
  return uniqueIds(users.map((user) => user._id));
};

const getAllActiveRecipientIds = async () => {
  const users = await User.find({
    status: 'active',
    role: { $in: ['admin', 'manager'] }
  }).select('_id').lean();
  return users.map((user) => String(user._id));
};

const createNotifications = async ({
  userIds,
  category,
  title,
  message,
  data = {},
  deliveryKey
}) => {
  const recipients = uniqueIds(userIds);
  if (!recipients.length) return [];

  const created = [];
  for (const userId of recipients) {
    const result = await Notification.updateOne(
      { deliveryKey: `${deliveryKey}:${userId}` },
      {
        $setOnInsert: {
          user: userId,
          category,
          title,
          message,
          data,
          deliveryKey: `${deliveryKey}:${userId}`
        }
      },
      { upsert: true }
    );
    if (result.upsertedId) created.push({ userId, notificationId: result.upsertedId });
  }

  if (created.length) {
    await sendPushToUsers(
      created.map((item) => item.userId),
      {
        title,
        message,
        data: {
          ...data,
          category,
          notificationId: String(created[0].notificationId)
        }
      }
    );
  }
  return created;
};

const notifyProjectUpdate = async ({ project, title, message, eventKey }) => {
  try {
    const userIds = await getProjectRecipientIds(project._id || project);
    await createNotifications({
      userIds,
      category: 'project',
      title,
      message,
      data: {
        route: 'projects',
        projectId: String(project._id || project)
      },
      deliveryKey: `project:${project._id || project}:${eventKey}`
    });
  } catch (error) {
    console.error('Project notification failed:', error.message);
  }
};

const notifyLowStock = async ({ material, projectId, projectName }) => {
  try {
    const userIds = await getProjectRecipientIds(projectId);
    await createNotifications({
      userIds,
      category: 'inventory',
      title: 'Low material stock',
      message: `${material.name} has ${material.quantity} ${material.unit} remaining${projectName ? ` for ${projectName}` : ''}.`,
      data: {
        route: 'materials',
        materialId: String(material._id),
        projectId: String(projectId)
      },
      deliveryKey: `material-low:${material._id}:${material.quantity}`
    });
  } catch (error) {
    console.error('Material notification failed:', error.message);
  }
};

const notifyToolAlert = async ({ tool, projectId, projectName, reason, eventKey }) => {
  try {
    const userIds = await getProjectRecipientIds(projectId);
    await createNotifications({
      userIds,
      category: 'tool',
      title: 'Urgent tool alert',
      message: `${tool.name}${projectName ? ` at ${projectName}` : ''}: ${reason}`,
      data: {
        route: 'tools',
        toolId: String(tool._id),
        projectId: String(projectId)
      },
      deliveryKey: `tool:${tool._id}:${eventKey}`
    });
  } catch (error) {
    console.error('Tool notification failed:', error.message);
  }
};

module.exports = {
  createNotifications,
  getAllActiveRecipientIds,
  getProjectRecipientIds,
  notifyLowStock,
  notifyProjectUpdate,
  notifyToolAlert
};

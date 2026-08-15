const Project = require('../models/Project');
const Expense = require('../models/Expense');
const AttendanceSheet = require('../models/AttendanceSheet');
const Worker = require('../models/Worker');
const Material = require('../models/Material');
const Tool = require('../models/Tool');
const { recordActivity } = require('../services/activityService');
const { isProjectOperational } = require('../utils/projectLifecycle');
const { getAccessibleProjectIds, requireProjectAccess } = require('../utils/accessControl');

const editableFields = [
  'name',
  'description',
  'location',
  'startDate',
  'endDate',
  'budget',
  'status',
  'progress',
  'workers'
];

const pickProjectFields = (body) => editableFields.reduce((result, field) => {
  if (Object.prototype.hasOwnProperty.call(body, field)) {
    result[field] = field === 'endDate' && body[field] === '' ? null : body[field];
  }
  return result;
}, {});

const addExpenseTotals = async (projects) => {
  if (!projects.length) return [];

  const projectIds = projects.map((project) => project._id);
  const [expenseTotals, payrollTotals] = await Promise.all([
    Expense.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$project', total: { $sum: '$amount' } } }
    ]),
    AttendanceSheet.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $unwind: '$records' },
      {
        $group: {
          _id: '$project',
          total: {
            $sum: {
              $add: [
                {
                  $multiply: [
                    { $ifNull: ['$records.dailySalary', 0] },
                    {
                      $add: [
                        { $cond: ['$records.days.monday', 1, 0] },
                        { $cond: ['$records.days.tuesday', 1, 0] },
                        { $cond: ['$records.days.wednesday', 1, 0] },
                        { $cond: ['$records.days.thursday', 1, 0] },
                        { $cond: ['$records.days.friday', 1, 0] },
                        { $cond: ['$records.days.saturday', 1, 0] },
                        { $cond: ['$records.days.sunday', 1, 0] }
                      ]
                    }
                  ]
                },
                { $ifNull: ['$records.bonus', 0] },
                { $ifNull: ['$records.overtime', 0] }
              ]
            }
          }
        }
      }
    ])
  ]);
  const expensesByProject = new Map(
    expenseTotals.map((item) => [item._id.toString(), item.total])
  );
  const payrollByProject = new Map(
    payrollTotals.map((item) => [item._id.toString(), item.total])
  );

  return projects.map((project) => {
    const projectId = project._id.toString();
    const recordedExpenses = expensesByProject.get(projectId) || 0;
    const totalPayroll = payrollByProject.get(projectId) || 0;

    return {
      ...project.toObject(),
      recordedExpenses,
      totalPayroll,
      totalExpenses: recordedExpenses + totalPayroll
    };
  });
};

// @desc    Get all projects
// @route   GET /api/projects
const getProjects = async (req, res) => {
  try {
    const accessibleIds = await getAccessibleProjectIds(req.user);
    const projects = await Project.find(
      accessibleIds === null ? {} : { _id: { $in: accessibleIds } }
    )
      .populate('manager', 'name role')
      .populate('workers', 'name position');
    res.json(await addExpenseTotals(projects));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
const getProject = async (req, res) => {
  try {
    if (!(await requireProjectAccess(req, res, req.params.id))) return;
    const project = await Project.findById(req.params.id)
      .populate('manager', 'name role')
      .populate('workers', 'name position');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const projectId = project._id;
    const listedWorkerIds = project.workers.map((worker) => worker._id);
    const [projectsWithTotals, workers, materials, tools] = await Promise.all([
      addExpenseTotals([project]),
      Worker.find({
        $or: [
          { assignedProjects: projectId },
          { _id: { $in: listedWorkerIds } }
        ]
      }).select('name position phone status availability'),
      Material.find({ project: projectId })
        .select('name category quantity unit unitPrice stockLevel reorderPoint'),
      Tool.find({ project: projectId })
        .select('name category quantity condition status')
    ]);

    res.json({
      ...projectsWithTotals[0],
      resources: { workers, materials, tools }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new project
// @route   POST /api/projects
const createProject = async (req, res) => {
  try {
    const requestKey = req.get('X-Idempotency-Key');
    const projectData = {
      ...pickProjectFields(req.body),
      manager: req.user._id
    };

    if (requestKey) projectData.requestKey = requestKey.slice(0, 100);

    const project = await Project.create(projectData);
    await recordActivity({
      action: 'created',
      entityType: 'project',
      entityId: project._id,
      entityName: project.name,
      actor: req.user?._id
    });
    res.status(201).json(project);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.requestKey) {
      const project = await Project.findOne({
        requestKey: req.get('X-Idempotency-Key')?.slice(0, 100)
      }).select('+requestKey');
      if (project) return res.status(200).json(project);
    }

    res.status(400).json({ message: error.message });
  }
};
// @desc    Update project
// @route   PUT /api/projects/:id
const updateProject = async (req, res) => {
  try {
    if (!(await requireProjectAccess(req, res, req.params.id))) return;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const previousStatus = project.status;
    Object.assign(project, pickProjectFields(req.body));
    await project.save();

    if (
      isProjectOperational(previousStatus) &&
      ['completed', 'cancelled'].includes(project.status)
    ) {
      await Tool.updateMany(
        { project: project._id, status: 'in-use' },
        {
          $set: {
            status: 'available',
            condition: 'good',
            assignedTo: null,
            checkedOutAt: null,
            expectedReturnDate: null,
            checkedOutBy: null,
            checkedInAt: new Date()
          }
        }
      );
    }
    await recordActivity({
      action: 'updated',
      entityType: 'project',
      entityId: project._id,
      entityName: project.name,
      actor: req.user?._id
    });
    res.json(project);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
const deleteProject = async (req, res) => {
  try {
    if (!(await requireProjectAccess(req, res, req.params.id))) return;
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await recordActivity({
      action: 'deleted',
      entityType: 'project',
      entityId: project._id,
      entityName: project.name,
      actor: req.user?._id
    });
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject
};

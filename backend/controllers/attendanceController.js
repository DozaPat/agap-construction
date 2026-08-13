const mongoose = require('mongoose');
const AttendanceSheet = require('../models/AttendanceSheet');
const Project = require('../models/Project');
const Worker = require('../models/Worker');

const dayKeys = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

const normalizeWeekStart = (value) => {
  const date = value
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date();

  if (Number.isNaN(date.getTime())) return null;

  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const getProjectWorkers = async (projectId) => {
  const project = await Project.findById(projectId).select('name workers');
  if (!project) return null;

  const workers = await Worker.find({
    status: 'active',
    $or: [
      { assignedProjects: project._id },
      { _id: { $in: project.workers || [] } }
    ]
  }).select('name position dailySalary status');

  return {
    project,
    workers: workers.sort((a, b) => a.name.localeCompare(b.name))
  };
};

const createEmptyRecord = (worker) => ({
  worker: worker._id,
  workerName: worker.name,
  position: worker.position,
  dailySalary: worker.dailySalary,
  days: dayKeys.reduce((days, key) => ({ ...days, [key]: false }), {}),
  bonus: 0,
  overtime: 0
});

const serializeRecord = (record) => ({
  worker: record.worker,
  workerName: record.workerName,
  position: record.position,
  dailySalary: record.dailySalary,
  days: dayKeys.reduce(
    (days, key) => ({ ...days, [key]: Boolean(record.days?.[key]) }),
    {}
  ),
  bonus: Number(record.bonus || 0),
  overtime: Number(record.overtime || 0)
});

const calculatePayroll = (record) => {
  const daysPresent = dayKeys.reduce(
    (total, key) => total + (record.days?.[key] ? 1 : 0),
    0
  );
  const dailySalary = Number(record.dailySalary || 0);
  const baseSalary = daysPresent * dailySalary;
  const bonus = Number(record.bonus || 0);
  const overtime = Number(record.overtime || 0);
  return {
    daysPresent,
    dailySalary,
    baseSalary,
    bonus,
    overtime,
    total: baseSalary + bonus + overtime
  };
};

// GET /api/attendance/payroll?project=:projectId&from=YYYY-MM-DD&to=YYYY-MM-DD
const getPayrollLedger = async (req, res) => {
  try {
    const filter = {};
    if (req.query.project) {
      if (!mongoose.isValidObjectId(req.query.project)) {
        return res.status(400).json({ message: 'Invalid project' });
      }
      filter.project = req.query.project;
    }
    if (req.query.from || req.query.to) {
      filter.weekStart = {};
      if (req.query.from) filter.weekStart.$gte = new Date(`${req.query.from}T00:00:00.000Z`);
      if (req.query.to) filter.weekStart.$lte = new Date(`${req.query.to}T23:59:59.999Z`);
    }

    const sheets = await AttendanceSheet.find(filter)
      .populate('project', 'name')
      .sort({ weekStart: -1 })
      .lean();

    const payroll = sheets.flatMap((sheet) => sheet.records.map((record) => ({
      _id: `${sheet._id}-${record.worker}`,
      sheetId: sheet._id,
      project: sheet.project,
      weekStart: sheet.weekStart,
      worker: record.worker,
      workerName: record.workerName,
      position: record.position,
      ...calculatePayroll(record),
      updatedAt: sheet.updatedAt
    }))).filter((record) => record.total > 0);

    res.json(payroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/attendance?project=:projectId&weekStart=YYYY-MM-DD
const getAttendanceSheet = async (req, res) => {
  try {
    const { project: projectId, weekStart: requestedWeek } = req.query;
    if (!projectId) {
      return res.status(400).json({ message: 'Please select a project' });
    }

    const weekStart = normalizeWeekStart(requestedWeek);
    if (!weekStart) {
      return res.status(400).json({ message: 'Invalid week start date' });
    }

    const projectWorkers = await getProjectWorkers(projectId);
    if (!projectWorkers) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const sheet = await AttendanceSheet.findOne({
      project: projectId,
      weekStart
    }).lean();

    const existingRecords = (sheet?.records || []).map(serializeRecord);
    const activeExistingWorkers = await Worker.find({
      _id: { $in: existingRecords.map((record) => record.worker) },
      status: 'active'
    }).select('_id').lean();
    const activeExistingWorkerIds = new Set(
      activeExistingWorkers.map((worker) => worker._id.toString())
    );
    const visibleExistingRecords = existingRecords.filter((record) =>
      activeExistingWorkerIds.has(record.worker.toString())
    );
    const existingWorkerIds = new Set(
      visibleExistingRecords.map((record) => record.worker.toString())
    );
    const newRecords = projectWorkers.workers
      .filter((worker) => !existingWorkerIds.has(worker._id.toString()))
      .map(createEmptyRecord);

    const records = [...visibleExistingRecords, ...newRecords]
      .sort((a, b) => a.workerName.localeCompare(b.workerName));

    res.json({
      _id: sheet?._id || null,
      project: {
        _id: projectWorkers.project._id,
        name: projectWorkers.project.name
      },
      weekStart: weekStart.toISOString(),
      records,
      updatedAt: sheet?.updatedAt || null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/attendance
const saveAttendanceSheet = async (req, res) => {
  try {
    const { project: projectId, weekStart: requestedWeek, records = [] } = req.body;
    if (!projectId) {
      return res.status(400).json({ message: 'Please select a project' });
    }

    const weekStart = normalizeWeekStart(requestedWeek);
    if (!weekStart) {
      return res.status(400).json({ message: 'Invalid week start date' });
    }

    const projectWorkers = await getProjectWorkers(projectId);
    if (!projectWorkers) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const workersById = new Map(
      projectWorkers.workers.map((worker) => [worker._id.toString(), worker])
    );
    const existingSheet = await AttendanceSheet.findOne({
      project: projectId,
      weekStart
    }).lean();
    const existingRecordsByWorker = new Map(
      (existingSheet?.records || []).map((record) => [
        record.worker.toString(),
        record
      ])
    );
    const seenWorkerIds = new Set();

    const sanitizedRecords = records
      .map((record) => {
        const workerId = String(record.worker);
        const worker = workersById.get(workerId);
        const historicalRecord = existingRecordsByWorker.get(workerId);
        if ((!worker && !historicalRecord) || seenWorkerIds.has(workerId)) {
          return null;
        }
        seenWorkerIds.add(workerId);

        return {
          worker: worker?._id || historicalRecord.worker,
          workerName: worker?.name || historicalRecord.workerName,
          position: worker?.position || historicalRecord.position,
          dailySalary: worker?.dailySalary ?? historicalRecord.dailySalary,
          days: dayKeys.reduce(
            (days, key) => ({ ...days, [key]: Boolean(record.days?.[key]) }),
            {}
          ),
          bonus: Math.max(0, Number(record.bonus) || 0),
          overtime: Math.max(0, Number(record.overtime) || 0)
        };
      })
      .filter(Boolean);
    const savedWorkerIds = new Set(
      sanitizedRecords.map((record) => record.worker.toString())
    );
    const preservedHistoricalRecords = (existingSheet?.records || [])
      .filter((record) => !savedWorkerIds.has(record.worker.toString()));
    const recordsToSave = [
      ...preservedHistoricalRecords,
      ...sanitizedRecords
    ];

    const sheet = await AttendanceSheet.findOneAndUpdate(
      { project: projectId, weekStart },
      {
        $set: {
          records: recordsToSave,
          updatedBy: req.user._id
        },
        $setOnInsert: {
          createdBy: req.user._id
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    ).lean();

    res.json({
      _id: sheet._id,
      project: {
        _id: projectWorkers.project._id,
        name: projectWorkers.project.name
      },
      weekStart: sheet.weekStart,
      records: sanitizedRecords.map(serializeRecord),
      updatedAt: sheet.updatedAt
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getPayrollLedger,
  getAttendanceSheet,
  saveAttendanceSheet
};

const mongoose = require('mongoose');
const AttendanceSheet = require('../models/AttendanceSheet');
const Project = require('../models/Project');
const Worker = require('../models/Worker');
const { isProjectOperational, projectStatusMessage } = require('../utils/projectLifecycle');
const { projectScopeFilter, requireProjectAccess } = require('../utils/accessControl');

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
  const project = await Project.findById(projectId).select('name status workers');
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

const dateKey = (value) => new Date(value).toISOString().slice(0, 10);

const businessDateKey = (value) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: process.env.BUSINESS_TIME_ZONE || 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const normalizeWorkDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || dateKey(date) !== value ? null : date;
};

const weekDetails = (workDate) => {
  const date = new Date(workDate);
  const dayIndex = (date.getUTCDay() + 6) % 7;
  const weekStart = new Date(date);
  weekStart.setUTCDate(date.getUTCDate() - dayIndex);
  weekStart.setUTCHours(0, 0, 0, 0);
  return { weekStart, dayKey: dayKeys[dayIndex] };
};

const parseTimestamp = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const serializeEntry = (entry, project = null) => {
  const timeIn = new Date(entry.timeIn);
  const timeOut = entry.timeOut ? new Date(entry.timeOut) : null;
  return {
    _id: entry._id,
    worker: entry.worker,
    workerName: entry.workerName,
    position: entry.position,
    dailySalary: Number(entry.dailySalary || 0),
    workDate: entry.workDate,
    timeIn,
    timeOut,
    durationMinutes: timeOut
      ? Math.max(0, Math.round((timeOut.getTime() - timeIn.getTime()) / 60000))
      : null,
    notes: entry.notes || '',
    correctionReason: entry.correctionReason || '',
    updatedAt: entry.updatedAt || null,
    ...(project ? { project } : {})
  };
};

const findEntrySheet = async (entryId) => {
  if (!mongoose.isValidObjectId(entryId)) return null;
  const sheet = await AttendanceSheet.findOne({ 'entries._id': entryId });
  if (!sheet) return null;
  const entry = sheet.entries.id(entryId);
  return entry ? { sheet, entry } : null;
};

const setPayrollPresence = (sheet, worker, workDate, present) => {
  const { dayKey } = weekDetails(workDate);
  let record = sheet.records.find((item) => String(item.worker) === String(worker._id));
  if (!record && present) {
    sheet.records.push(createEmptyRecord(worker));
    record = sheet.records[sheet.records.length - 1];
  }
  if (record) record.days[dayKey] = present;
};

const mobileProject = (project) => ({
  _id: project._id,
  name: project.name,
  location: project.location || '',
  status: project.status
});

// GET /api/attendance/live?project=:projectId&date=YYYY-MM-DD
const getLiveAttendance = async (req, res) => {
  try {
    const { project: projectId, date: requestedDate } = req.query;
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'Please select a valid project' });
    }
    if (!(await requireProjectAccess(req, res, projectId))) return;
    const workDate = normalizeWorkDate(requestedDate);
    if (!workDate) return res.status(400).json({ message: 'Select a valid attendance date' });

    const projectWorkers = await getProjectWorkers(projectId);
    if (!projectWorkers) return res.status(404).json({ message: 'Project not found' });
    const project = await Project.findById(projectId).select('name location status');
    const { weekStart } = weekDetails(workDate);
    const sheet = await AttendanceSheet.findOne({ project: projectId, weekStart }).lean();
    const entries = (sheet?.entries || []).filter(
      (entry) => dateKey(entry.workDate) === dateKey(workDate)
    );
    const entriesByWorker = new Map(
      entries.map((entry) => [String(entry.worker), serializeEntry(entry)])
    );
    const workers = projectWorkers.workers.map((worker) => ({
      _id: worker._id,
      name: worker.name,
      position: worker.position,
      dailySalary: worker.dailySalary,
      entry: entriesByWorker.get(String(worker._id)) || null
    }));
    const currentWorkerIds = new Set(workers.map((worker) => String(worker._id)));
    entries.forEach((entry) => {
      if (!currentWorkerIds.has(String(entry.worker))) {
        workers.push({
          _id: entry.worker,
          name: entry.workerName,
          position: entry.position,
          dailySalary: Number(entry.dailySalary || 0),
          entry: serializeEntry(entry)
        });
      }
    });
    workers.sort((a, b) => a.name.localeCompare(b.name));

    const operational = isProjectOperational(projectWorkers.project.status);
    res.json({
      project: mobileProject(project),
      date: workDate,
      readOnly: !operational,
      statusMessage: operational
        ? null
        : projectStatusMessage(projectWorkers.project.status, 'record attendance'),
      workers,
      updatedAt: sheet?.updatedAt || null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/attendance/live/history?project=:projectId&from=YYYY-MM-DD&to=YYYY-MM-DD
const getAttendanceHistory = async (req, res) => {
  try {
    const { project: projectId, worker: workerId } = req.query;
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'Please select a valid project' });
    }
    if (workerId && !mongoose.isValidObjectId(workerId)) {
      return res.status(400).json({ message: 'Select a valid worker' });
    }
    if (!(await requireProjectAccess(req, res, projectId))) return;
    const to = normalizeWorkDate(req.query.to || businessDateKey(new Date()));
    const defaultFrom = new Date(to || new Date());
    defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 30);
    const from = normalizeWorkDate(req.query.from || dateKey(defaultFrom));
    if (!from || !to || from > to) {
      return res.status(400).json({ message: 'Select a valid attendance date range' });
    }
    const { weekStart: fromWeek } = weekDetails(from);
    const { weekStart: toWeek } = weekDetails(to);
    const sheets = await AttendanceSheet.find({
      project: projectId,
      weekStart: { $gte: fromWeek, $lte: toWeek }
    }).populate('project', 'name location status').lean();

    const history = sheets.flatMap((sheet) => (sheet.entries || [])
      .filter((entry) => {
        const workTime = new Date(entry.workDate).getTime();
        return workTime >= from.getTime() &&
          workTime <= to.getTime() &&
          (!workerId || String(entry.worker) === String(workerId));
      })
      .map((entry) => serializeEntry(entry, mobileProject(sheet.project))));
    history.sort((a, b) => new Date(b.timeIn) - new Date(a.timeIn));
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/attendance/live/time-in
const recordTimeIn = async (req, res) => {
  try {
    const { project: projectId, worker: workerId } = req.body;
    if (!mongoose.isValidObjectId(projectId) || !mongoose.isValidObjectId(workerId)) {
      return res.status(400).json({ message: 'Select a valid project and worker' });
    }
    if (!(await requireProjectAccess(req, res, projectId))) return;
    const workDate = normalizeWorkDate(req.body.date || businessDateKey(new Date()));
    if (!workDate) return res.status(400).json({ message: 'Select a valid attendance date' });
    if (dateKey(workDate) !== businessDateKey(new Date())) {
      return res.status(409).json({
        message: 'Time-in can only be recorded for today. Use a correction for historical records.'
      });
    }

    const projectWorkers = await getProjectWorkers(projectId);
    if (!projectWorkers) return res.status(404).json({ message: 'Project not found' });
    if (!isProjectOperational(projectWorkers.project.status)) {
      return res.status(409).json({
        message: projectStatusMessage(projectWorkers.project.status, 'record attendance')
      });
    }
    const worker = projectWorkers.workers.find((item) => String(item._id) === String(workerId));
    if (!worker) {
      return res.status(409).json({ message: 'This active worker is not assigned to the selected project' });
    }

    const { weekStart } = weekDetails(workDate);
    let sheet = await AttendanceSheet.findOne({ project: projectId, weekStart });
    if (!sheet) {
      sheet = new AttendanceSheet({
        project: projectId,
        weekStart,
        records: [],
        entries: [],
        createdBy: req.user._id,
        updatedBy: req.user._id
      });
    }
    const existing = sheet.entries.find((entry) =>
      String(entry.worker) === String(workerId) && dateKey(entry.workDate) === dateKey(workDate)
    );
    if (existing) {
      return res.status(409).json({ message: `${worker.name} already has a time-in for this date` });
    }

    const now = new Date();
    sheet.entries.push({
      worker: worker._id,
      workerName: worker.name,
      position: worker.position,
      dailySalary: worker.dailySalary,
      workDate,
      timeIn: now,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });
    setPayrollPresence(sheet, worker, workDate, true);
    sheet.updatedBy = req.user._id;
    await sheet.save();
    res.status(201).json(serializeEntry(sheet.entries[sheet.entries.length - 1]));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// POST /api/attendance/live/:entryId/time-out
const recordTimeOut = async (req, res) => {
  try {
    const result = await findEntrySheet(req.params.entryId);
    if (!result) return res.status(404).json({ message: 'Attendance entry not found' });
    if (!(await requireProjectAccess(req, res, result.sheet.project))) return;
    if (result.entry.timeOut) {
      return res.status(409).json({ message: `${result.entry.workerName} is already timed out` });
    }
    result.entry.timeOut = new Date();
    result.entry.updatedBy = req.user._id;
    result.sheet.updatedBy = req.user._id;
    await result.sheet.save();
    res.json(serializeEntry(result.entry));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PATCH /api/attendance/live/:entryId
const correctAttendanceEntry = async (req, res) => {
  try {
    const result = await findEntrySheet(req.params.entryId);
    if (!result) return res.status(404).json({ message: 'Attendance entry not found' });
    if (!(await requireProjectAccess(req, res, result.sheet.project))) return;
    const timeIn = parseTimestamp(req.body.timeIn);
    const timeOut = parseTimestamp(req.body.timeOut);
    const reason = typeof req.body.correctionReason === 'string'
      ? req.body.correctionReason.trim()
      : '';
    if (!timeIn || businessDateKey(timeIn) !== dateKey(result.entry.workDate)) {
      return res.status(400).json({ message: 'Time-in must be on the attendance date' });
    }
    if (req.body.timeOut && !timeOut) {
      return res.status(400).json({ message: 'Select a valid time-out' });
    }
    if (timeOut && timeOut <= timeIn) {
      return res.status(400).json({ message: 'Time-out must be later than time-in' });
    }
    if (!reason) return res.status(400).json({ message: 'Enter a reason for the correction' });

    result.entry.timeIn = timeIn;
    result.entry.timeOut = timeOut;
    result.entry.notes = typeof req.body.notes === 'string' ? req.body.notes.trim() : '';
    result.entry.correctionReason = reason;
    result.entry.updatedBy = req.user._id;
    const worker = {
      _id: result.entry.worker,
      name: result.entry.workerName,
      position: result.entry.position,
      dailySalary: result.entry.dailySalary
    };
    setPayrollPresence(result.sheet, worker, result.entry.workDate, true);
    result.sheet.updatedBy = req.user._id;
    await result.sheet.save();
    res.json(serializeEntry(result.entry));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/attendance/payroll?project=:projectId&from=YYYY-MM-DD&to=YYYY-MM-DD
const getPayrollLedger = async (req, res) => {
  try {
    const filter = await projectScopeFilter(req.user);
    if (req.query.project) {
      if (!mongoose.isValidObjectId(req.query.project)) {
        return res.status(400).json({ message: 'Invalid project' });
      }
      if (!(await requireProjectAccess(req, res, req.query.project))) return;
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
    if (!(await requireProjectAccess(req, res, projectId))) return;

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
    const operational = isProjectOperational(projectWorkers.project.status);
    let visibleExistingRecords = existingRecords;
    if (operational) {
      const activeExistingWorkers = await Worker.find({
        _id: { $in: existingRecords.map((record) => record.worker) },
        status: 'active'
      }).select('_id').lean();
      const activeExistingWorkerIds = new Set(
        activeExistingWorkers.map((worker) => worker._id.toString())
      );
      visibleExistingRecords = existingRecords.filter((record) =>
        activeExistingWorkerIds.has(record.worker.toString())
      );
    }
    const existingWorkerIds = new Set(
      visibleExistingRecords.map((record) => record.worker.toString())
    );
    const newRecords = operational
      ? projectWorkers.workers
        .filter((worker) => !existingWorkerIds.has(worker._id.toString()))
        .map(createEmptyRecord)
      : [];

    const records = [...visibleExistingRecords, ...newRecords]
      .sort((a, b) => a.workerName.localeCompare(b.workerName));

    res.json({
      _id: sheet?._id || null,
      project: {
        _id: projectWorkers.project._id,
        name: projectWorkers.project.name,
        status: projectWorkers.project.status
      },
      readOnly: !operational,
      statusMessage: operational
        ? null
        : projectStatusMessage(projectWorkers.project.status, 'add workers or record attendance'),
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
    if (!(await requireProjectAccess(req, res, projectId))) return;

    const weekStart = normalizeWeekStart(requestedWeek);
    if (!weekStart) {
      return res.status(400).json({ message: 'Invalid week start date' });
    }

    const projectWorkers = await getProjectWorkers(projectId);
    if (!projectWorkers) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (!isProjectOperational(projectWorkers.project.status)) {
      return res.status(409).json({
        message: projectStatusMessage(
          projectWorkers.project.status,
          'add workers or update attendance and payroll'
        )
      });
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
        name: projectWorkers.project.name,
        status: projectWorkers.project.status
      },
      readOnly: false,
      statusMessage: null,
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
  saveAttendanceSheet,
  getLiveAttendance,
  getAttendanceHistory,
  recordTimeIn,
  recordTimeOut,
  correctAttendanceEntry
};

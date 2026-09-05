const AttendanceSheet = require('../models/AttendanceSheet');
const Tool = require('../models/Tool');
const {
  createNotifications,
  getAllActiveRecipientIds,
  getProjectRecipientIds,
  notifyToolAlert
} = require('./notificationService');

const businessClock = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: process.env.BUSINESS_TIME_ZONE || 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour)
  };
};

const sendMorningAttendanceReminder = async (clock) => {
  if (clock.hour < 7 || clock.hour >= 12) return;
  const userIds = await getAllActiveRecipientIds();
  await createNotifications({
    userIds,
    category: 'attendance',
    title: 'Attendance reminder',
    message: 'Review today’s project attendance and record worker time-ins.',
    data: { route: 'workforce', section: 'attendance' },
    deliveryKey: `attendance-morning:${clock.date}`
  });
};

const sendOpenTimeOutReminders = async (clock) => {
  if (clock.hour < 16) return;
  const workDate = new Date(`${clock.date}T00:00:00.000Z`);
  const sheets = await AttendanceSheet.find({
    entries: { $elemMatch: { workDate, timeOut: null } }
  }).select('project entries').populate('project', 'name').lean();

  for (const sheet of sheets) {
    const openCount = sheet.entries.filter((entry) =>
      !entry.timeOut && new Date(entry.workDate).getTime() === workDate.getTime()
    ).length;
    if (!openCount || !sheet.project) continue;
    const userIds = await getProjectRecipientIds(sheet.project._id);
    await createNotifications({
      userIds,
      category: 'attendance',
      title: 'Time-out reminder',
      message: `${openCount} worker${openCount === 1 ? '' : 's'} at ${sheet.project.name} still need${openCount === 1 ? 's' : ''} a time-out.`,
      data: {
        route: 'workforce',
        section: 'attendance',
        projectId: String(sheet.project._id)
      },
      deliveryKey: `attendance-timeout:${clock.date}:${sheet.project._id}:${openCount}`
    });
  }
};

const sendOverdueToolAlerts = async (clock, now) => {
  const overdueTools = await Tool.find({
    status: 'in-use',
    expectedReturnDate: { $lt: now }
  }).select('name project expectedReturnDate').populate('project', 'name').lean();
  for (const tool of overdueTools) {
    if (!tool.project) continue;
    await notifyToolAlert({
      tool,
      projectId: tool.project._id,
      projectName: tool.project.name,
      reason: 'expected return date has passed',
      eventKey: `overdue:${clock.date}`
    });
  }
};

const runNotificationJobs = async (now = new Date()) => {
  try {
    const clock = businessClock(now);
    await sendMorningAttendanceReminder(clock);
    await sendOpenTimeOutReminders(clock);
    await sendOverdueToolAlerts(clock, now);
  } catch (error) {
    console.error('Scheduled notification check failed:', error.message);
  }
};

const startNotificationScheduler = () => {
  const initialCheck = setTimeout(() => runNotificationJobs(), 5_000);
  initialCheck.unref?.();
  const timer = setInterval(() => runNotificationJobs(), 5 * 60 * 1000);
  timer.unref?.();
  return timer;
};

module.exports = { businessClock, runNotificationJobs, startNotificationScheduler };

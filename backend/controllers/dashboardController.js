const mongoose = require('mongoose');
const Project = require('../models/Project');
const Worker = require('../models/Worker');
const Material = require('../models/Material');
const Tool = require('../models/Tool');
const Expense = require('../models/Expense');
const AttendanceSheet = require('../models/AttendanceSheet');
const Activity = require('../models/Activity');

const dayKeys = [
  'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'saturday', 'sunday'
];

const numberValue = (value) => Number(value || 0);
const startOfDay = (value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};
const endOfDay = (value) => {
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};
const inRange = (value, from, to) => {
  const date = new Date(value);
  return (!from || date >= from) && (!to || date <= to);
};
const projectIdOf = (value) => String(value?._id || value || '');
const attendancePayroll = (record) => {
  const daysPresent = dayKeys.reduce(
    (total, day) => total + (record.days?.[day] ? 1 : 0),
    0
  );
  return {
    daysPresent,
    total: daysPresent * numberValue(record.dailySalary) +
      numberValue(record.bonus) + numberValue(record.overtime)
  };
};

const buildSpendingTrend = (expenses, sheets, from, to) => {
  const today = new Date();
  const trendTo = to || today;
  const trendFrom = from || new Date(Date.UTC(
    trendTo.getUTCFullYear(), trendTo.getUTCMonth() - 5, 1
  ));
  const durationDays = Math.max(1, Math.ceil((trendTo - trendFrom) / 86400000));
  const mode = durationDays <= 14 ? 'day' : durationDays <= 90 ? 'week' : 'month';
  const buckets = [];

  if (mode === 'day') {
    for (let cursor = new Date(trendFrom); cursor <= trendTo; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const start = new Date(cursor);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setUTCHours(23, 59, 59, 999);
      buckets.push({
        key: start.toISOString().slice(0, 10),
        label: start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        start,
        end
      });
    }
  } else if (mode === 'week') {
    for (let cursor = new Date(trendFrom); cursor <= trendTo; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
      const start = new Date(cursor);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 6);
      end.setUTCHours(23, 59, 59, 999);
      buckets.push({
        key: start.toISOString().slice(0, 10),
        label: start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        start,
        end: end > trendTo ? trendTo : end
      });
    }
  } else {
    const cursor = new Date(Date.UTC(trendFrom.getUTCFullYear(), trendFrom.getUTCMonth(), 1));
    while (cursor <= trendTo) {
      const start = new Date(cursor);
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      buckets.push({
        key: `${start.getUTCFullYear()}-${start.getUTCMonth()}`,
        label: start.toLocaleDateString('en-PH', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
        start,
        end: end > trendTo ? trendTo : end
      });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }

  return {
    mode,
    points: buckets.map((bucket) => {
      const recorded = expenses
        .filter((expense) => inRange(expense.date, bucket.start, bucket.end))
        .reduce((sum, expense) => sum + numberValue(expense.amount), 0);
      const payroll = sheets
        .filter((sheet) => inRange(sheet.weekStart, bucket.start, bucket.end))
        .reduce((sum, sheet) => sum + sheet.records.reduce(
          (sheetTotal, record) => sheetTotal + attendancePayroll(record).total,
          0
        ), 0);
      return { label: bucket.label, recorded, payroll, total: recorded + payroll };
    })
  };
};

const getDashboardSummary = async (req, res) => {
  try {
    const { project: selectedProjectId, from: fromText, to: toText } = req.query;
    if (selectedProjectId && !mongoose.isValidObjectId(selectedProjectId)) {
      return res.status(400).json({ message: 'Invalid project' });
    }

    const from = fromText ? startOfDay(fromText) : null;
    const to = toText ? endOfDay(toText) : null;
    if ((fromText && !from) || (toText && !to)) {
      return res.status(400).json({ message: 'Enter a valid dashboard date range' });
    }
    if (from && to && from > to) {
      return res.status(400).json({ message: 'The start date cannot be after the end date' });
    }

    const allProjects = await Project.find().sort({ createdAt: -1 }).lean();
    if (selectedProjectId && !allProjects.some((project) => String(project._id) === selectedProjectId)) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const projects = selectedProjectId
      ? allProjects.filter((project) => String(project._id) === selectedProjectId)
      : allProjects;
    const projectIds = projects.map((project) => project._id);
    const selectedWorkerIds = projects.flatMap((project) => project.workers || []);
    const projectFilter = selectedProjectId ? { project: selectedProjectId } : {};
    const workerFilter = selectedProjectId
      ? { $or: [{ assignedProjects: selectedProjectId }, { _id: { $in: selectedWorkerIds } }] }
      : {};

    const [expenses, attendanceSheets, workers, materials, tools, activities] = await Promise.all([
      Expense.find(projectFilter).lean(),
      AttendanceSheet.find(projectFilter).lean(),
      Worker.find(workerFilter).lean(),
      Material.find(projectFilter).populate('project', 'name').lean(),
      Tool.find(projectFilter)
        .populate('project', 'name')
        .populate('assignedTo', 'name position')
        .lean(),
      Activity.find().populate('actor', 'name role').sort({ createdAt: -1 }).limit(20).lean()
    ]);

    const periodExpenses = expenses.filter((expense) => inRange(expense.date, from, to));
    const periodSheets = attendanceSheets.filter((sheet) => inRange(sheet.weekStart, from, to));
    const allPayroll = attendanceSheets.reduce((total, sheet) => total + sheet.records.reduce(
      (sheetTotal, record) => sheetTotal + attendancePayroll(record).total,
      0
    ), 0);
    const periodPayroll = periodSheets.reduce((total, sheet) => total + sheet.records.reduce(
      (sheetTotal, record) => sheetTotal + attendancePayroll(record).total,
      0
    ), 0);
    const recordedExpenses = expenses.reduce((sum, expense) => sum + numberValue(expense.amount), 0);
    const periodRecordedExpenses = periodExpenses.reduce(
      (sum, expense) => sum + numberValue(expense.amount), 0
    );
    const totalBudget = projects.reduce((sum, project) => sum + numberValue(project.budget), 0);
    const totalSpent = recordedExpenses + allPayroll;
    const periodSpent = periodRecordedExpenses + periodPayroll;
    const budgetRemaining = totalBudget - totalSpent;
    const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const activeWorkers = workers.filter((worker) => worker.status === 'active');
    let attendanceOpportunities = 0;
    let attendancePresent = 0;
    const presentWorkerIds = new Set();
    periodSheets.forEach((sheet) => sheet.records.forEach((record) => {
      const payroll = attendancePayroll(record);
      attendancePresent += payroll.daysPresent;
      attendanceOpportunities += dayKeys.length;
      if (payroll.daysPresent > 0) presentWorkerIds.add(String(record.worker));
    }));

    const lowStockMaterials = materials.filter(
      (material) => numberValue(material.quantity) <= numberValue(material.reorderPoint ?? 20)
    );
    const inventoryValue = materials.reduce(
      (sum, material) => sum + numberValue(material.quantity) * numberValue(material.unitPrice), 0
    );
    const repairTools = tools.filter(
      (tool) => tool.condition !== 'good' || tool.status === 'under-maintenance'
    );
    const overdueTools = tools.filter(
      (tool) => tool.status === 'in-use' && tool.expectedReturnDate && new Date(tool.expectedReturnDate) < new Date()
    );
    const delayedProjects = projects.filter((project) =>
      project.status === 'delayed' || (
        project.status !== 'completed' && project.status !== 'cancelled' &&
        project.endDate && new Date(project.endDate) < new Date()
      )
    );

    const expensesByProject = new Map();
    expenses.forEach((expense) => {
      const id = projectIdOf(expense.project);
      expensesByProject.set(id, (expensesByProject.get(id) || 0) + numberValue(expense.amount));
    });
    const payrollByProject = new Map();
    attendanceSheets.forEach((sheet) => {
      const id = projectIdOf(sheet.project);
      const total = sheet.records.reduce(
        (sum, record) => sum + attendancePayroll(record).total, 0
      );
      payrollByProject.set(id, (payrollByProject.get(id) || 0) + total);
    });
    const lowStockByProject = new Map();
    lowStockMaterials.forEach((material) => {
      const id = projectIdOf(material.project);
      lowStockByProject.set(id, (lowStockByProject.get(id) || 0) + 1);
    });
    const overdueByProject = new Map();
    overdueTools.forEach((tool) => {
      const id = projectIdOf(tool.project);
      overdueByProject.set(id, (overdueByProject.get(id) || 0) + 1);
    });

    const projectHealth = projects.map((project) => {
      const id = String(project._id);
      const projectRecorded = expensesByProject.get(id) || 0;
      const projectPayroll = payrollByProject.get(id) || 0;
      const spent = projectRecorded + projectPayroll;
      const utilization = project.budget > 0 ? (spent / project.budget) * 100 : 0;
      const overdue = overdueByProject.get(id) || 0;
      const lowStock = lowStockByProject.get(id) || 0;
      const endDate = project.endDate ? new Date(project.endDate) : null;
      const remainingDays = endDate ? Math.ceil((endDate - new Date()) / 86400000) : null;
      const schedule = project.status === 'completed'
        ? 'Completed'
        : project.status === 'delayed' || (remainingDays !== null && remainingDays < 0)
          ? 'Delayed'
          : remainingDays !== null && remainingDays <= 14 && numberValue(project.progress) < 90
            ? 'Due soon'
            : 'On track';
      let health = 'healthy';
      if (project.status === 'completed') health = 'completed';
      else if (project.status === 'cancelled') health = 'cancelled';
      else if (schedule === 'Delayed' || utilization >= 100) health = 'at-risk';
      else if (schedule === 'Due soon' || utilization >= 80 || lowStock > 0 || overdue > 0) health = 'attention';

      return {
        _id: project._id,
        name: project.name,
        status: project.status,
        progress: numberValue(project.progress),
        budget: numberValue(project.budget),
        recordedExpenses: projectRecorded,
        payroll: projectPayroll,
        spent,
        budgetRemaining: numberValue(project.budget) - spent,
        budgetUtilization: utilization,
        schedule,
        health,
        lowStock,
        overdueTools: overdue
      };
    }).sort((left, right) => {
      const order = { 'at-risk': 0, attention: 1, healthy: 2, completed: 3, cancelled: 4 };
      return order[left.health] - order[right.health] || right.budgetUtilization - left.budgetUtilization;
    });

    const categoryTotals = periodExpenses.reduce((result, expense) => {
      result[expense.category] = (result[expense.category] || 0) + numberValue(expense.amount);
      return result;
    }, {});
    if (periodPayroll > 0) categoryTotals.Labor = (categoryTotals.Labor || 0) + periodPayroll;
    const expenseBreakdown = Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value);

    const alerts = [];
    projectHealth.filter((project) => project.health === 'at-risk').slice(0, 4).forEach((project) => {
      alerts.push({
        id: `project-${project._id}`,
        severity: 'critical',
        type: 'project',
        title: `${project.name} requires attention`,
        detail: project.schedule === 'Delayed'
          ? `Project is delayed at ${project.progress}% progress.`
          : `Project has used ${project.budgetUtilization.toFixed(1)}% of its budget.`,
        link: '/projects'
      });
    });
    lowStockMaterials.slice(0, 4).forEach((material) => alerts.push({
      id: `material-${material._id}`,
      severity: material.quantity <= 0 ? 'critical' : 'warning',
      type: 'material',
      title: `${material.name} needs reordering`,
      detail: `${material.quantity} ${material.unit} remaining for ${material.project?.name || 'a project'}.`,
      link: '/materials'
    }));
    overdueTools.slice(0, 4).forEach((tool) => alerts.push({
      id: `tool-${tool._id}`,
      severity: 'warning',
      type: 'tool',
      title: `${tool.name} is overdue`,
      detail: `Assigned to ${tool.assignedTo?.name || 'a worker'} and due ${new Date(tool.expectedReturnDate).toLocaleDateString('en-PH')}.`,
      link: '/tools'
    }));
    repairTools.slice(0, 3).forEach((tool) => alerts.push({
      id: `repair-${tool._id}`,
      severity: 'info',
      type: 'tool',
      title: `${tool.name} needs repair`,
      detail: `${tool.quantity} unit${tool.quantity === 1 ? '' : 's'} unavailable until repaired.`,
      link: '/tools'
    }));

    const statusOrder = ['pending', 'in-progress', 'delayed', 'completed', 'cancelled'];
    const projectStatuses = statusOrder.map((status) => ({
      name: status,
      value: projects.filter((project) => project.status === status).length
    })).filter((entry) => entry.value > 0);
    const toolStatus = ['available', 'in-use', 'under-maintenance'].map((status) => ({
      name: status,
      value: tools.filter((tool) => tool.status === status)
        .reduce((sum, tool) => sum + numberValue(tool.quantity), 0)
    }));

    const spendingTrend = buildSpendingTrend(periodExpenses, periodSheets, from, to);
    res.json({
      generatedAt: new Date().toISOString(),
      filters: { project: selectedProjectId || 'all', from: fromText || null, to: toText || null },
      projects: allProjects.map((project) => ({ _id: project._id, name: project.name })),
      kpis: {
        activeProjects: projects.filter((project) => project.status === 'in-progress').length,
        projectsCreatedInPeriod: projects.filter((project) => inRange(project.createdAt, from, to)).length,
        totalBudget,
        totalSpent,
        periodSpent,
        recordedExpenses,
        totalPayroll: allPayroll,
        periodPayroll,
        budgetRemaining,
        budgetUtilization,
        totalWorkers: workers.length,
        activeWorkers: activeWorkers.length,
        presentWorkers: presentWorkerIds.size,
        attendanceRate: attendanceOpportunities > 0
          ? (attendancePresent / attendanceOpportunities) * 100
          : 0,
        lowStockMaterials: lowStockMaterials.length,
        inventoryValue,
        totalTools: tools.reduce((sum, tool) => sum + numberValue(tool.quantity), 0),
        repairTools: repairTools.reduce((sum, tool) => sum + numberValue(tool.quantity), 0),
        overdueTools: overdueTools.reduce((sum, tool) => sum + numberValue(tool.quantity), 0),
        delayedProjects: delayedProjects.length,
        urgentAlerts: alerts.filter((alert) => alert.severity !== 'info').length
      },
      spendingTrend,
      expenseBreakdown,
      projectHealth,
      projectStatuses,
      workforceByRole: Object.entries(activeWorkers.reduce((result, worker) => {
        result[worker.position] = (result[worker.position] || 0) + 1;
        return result;
      }, {})).map(([name, value]) => ({ name, value })),
      toolStatus,
      alerts: alerts.slice(0, 12),
      recentActivities: activities
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDashboardSummary };

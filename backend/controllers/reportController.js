const mongoose = require('mongoose');
const Project = require('../models/Project');
const Worker = require('../models/Worker');
const Material = require('../models/Material');
const Tool = require('../models/Tool');
const Expense = require('../models/Expense');
const AttendanceSheet = require('../models/AttendanceSheet');
const { getAccessibleProjectIds } = require('../utils/accessControl');

const dayKeys = [
  'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'saturday', 'sunday'
];
const numberValue = (value) => Number(value || 0);
const idOf = (value) => String(value?._id || value || '');
const asStart = (value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};
const asEnd = (value) => {
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const calculatePayroll = (record) => {
  const daysPresent = dayKeys.reduce(
    (total, day) => total + (record.days?.[day] ? 1 : 0), 0
  );
  const dailySalary = numberValue(record.dailySalary);
  const baseSalary = daysPresent * dailySalary;
  const bonus = numberValue(record.bonus);
  const overtime = numberValue(record.overtime);
  return {
    daysPresent,
    dailySalary,
    baseSalary,
    bonus,
    overtime,
    total: baseSalary + bonus + overtime
  };
};

const buildTrend = (expenses, attendance, reportType, from, to) => {
  const buckets = [];
  if (reportType === 'weekly') {
    for (let cursor = new Date(from); cursor <= to; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const start = new Date(cursor);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setUTCHours(23, 59, 59, 999);
      buckets.push({
        label: start.toLocaleDateString('en-PH', { weekday: 'short', timeZone: 'UTC' }),
        start,
        end
      });
    }
  } else if (reportType === 'monthly') {
    for (let cursor = new Date(from); cursor <= to; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
      const start = new Date(cursor);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 6);
      end.setUTCHours(23, 59, 59, 999);
      buckets.push({
        label: start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        start,
        end: end > to ? to : end
      });
    }
  } else {
    for (let month = 0; month < 12; month += 1) {
      const start = new Date(Date.UTC(from.getUTCFullYear(), month, 1));
      const end = new Date(Date.UTC(from.getUTCFullYear(), month + 1, 0, 23, 59, 59, 999));
      buckets.push({
        label: start.toLocaleDateString('en-PH', { month: 'short', timeZone: 'UTC' }),
        start,
        end
      });
    }
  }

  return buckets.map((bucket) => {
    const recorded = expenses
      .filter((expense) => new Date(expense.date) >= bucket.start && new Date(expense.date) <= bucket.end)
      .reduce((sum, expense) => sum + numberValue(expense.amount), 0);
    const payroll = attendance
      .filter((sheet) => new Date(sheet.weekStart) >= bucket.start && new Date(sheet.weekStart) <= bucket.end)
      .reduce((sum, sheet) => sum + sheet.records.reduce(
        (recordTotal, record) => recordTotal + calculatePayroll(record).total, 0
      ), 0);
    return { label: bucket.label, recorded, payroll, total: recorded + payroll };
  });
};

const getDetailedReport = async (req, res) => {
  try {
    const { project: projectId, from: fromText, to: toText, type = 'monthly' } = req.query;
    if (projectId && !mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'Invalid project selection' });
    }
    if (!['weekly', 'monthly', 'annual'].includes(type)) {
      return res.status(400).json({ message: 'Invalid report type' });
    }
    const from = asStart(fromText);
    const to = asEnd(toText);
    if (!from || !to || from > to) {
      return res.status(400).json({ message: 'Enter a valid report date range' });
    }

    const accessibleIds = await getAccessibleProjectIds(req.user);
    if (projectId && accessibleIds !== null && !accessibleIds.includes(String(projectId))) {
      return res.status(403).json({ message: 'You are not assigned to this project' });
    }
    const projectQuery = projectId
      ? { _id: projectId }
      : accessibleIds === null ? {} : { _id: { $in: accessibleIds } };
    const projects = await Project.find(projectQuery)
      .populate('manager', 'name role')
      .populate('workers', 'name position phone dailySalary status')
      .sort({ name: 1 })
      .lean();
    if (projectId && projects.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const projectIds = projects.map((project) => project._id);
    const listedWorkerIds = projects.flatMap((project) => (project.workers || []).map((worker) => worker._id));

    const [workers, materials, tools, expenses, attendanceSheets] = await Promise.all([
      Worker.find({
        $or: [
          { assignedProjects: { $in: projectIds } },
          { _id: { $in: listedWorkerIds } }
        ]
      })
        .populate('assignedProjects', 'name status')
        .sort({ name: 1 })
        .lean(),
      Material.find({ project: { $in: projectIds } })
        .populate('project', 'name status')
        .sort({ project: 1, name: 1 })
        .lean(),
      Tool.find({ project: { $in: projectIds } })
        .populate('project', 'name status')
        .populate('assignedTo', 'name position')
        .sort({ project: 1, name: 1 })
        .lean(),
      Expense.find({
        project: { $in: projectIds },
        date: { $gte: from, $lte: to }
      })
        .populate('project', 'name status')
        .populate('paidBy', 'name')
        .sort({ date: -1 })
        .lean(),
      AttendanceSheet.find({
        project: { $in: projectIds },
        weekStart: { $gte: from, $lte: to }
      })
        .populate('project', 'name status')
        .sort({ weekStart: -1 })
        .lean()
    ]);

    const payroll = attendanceSheets.flatMap((sheet) => sheet.records.map((record) => ({
      _id: `${sheet._id}-${record.worker}`,
      project: sheet.project,
      weekStart: sheet.weekStart,
      worker: record.worker,
      workerName: record.workerName,
      position: record.position,
      days: record.days,
      ...calculatePayroll(record)
    })));
    const recordedExpenses = expenses.reduce((sum, expense) => sum + numberValue(expense.amount), 0);
    const totalPayroll = payroll.reduce((sum, record) => sum + record.total, 0);
    const totalBudget = projects.reduce((sum, project) => sum + numberValue(project.budget), 0);
    const inventoryValue = materials.reduce(
      (sum, material) => sum + numberValue(material.quantity) * numberValue(material.unitPrice), 0
    );
    const lowStock = materials.filter(
      (material) => numberValue(material.quantity) <= numberValue(material.reorderPoint ?? 20)
    );
    const categories = expenses.reduce((result, expense) => {
      result[expense.category] = (result[expense.category] || 0) + numberValue(expense.amount);
      return result;
    }, {});
    if (totalPayroll > 0) categories.Labor = (categories.Labor || 0) + totalPayroll;
    const projectStatuses = projects.reduce((result, project) => {
      result[project.status] = (result[project.status] || 0) + 1;
      return result;
    }, {});

    const projectExpenseMap = new Map();
    expenses.forEach((expense) => {
      const id = idOf(expense.project);
      projectExpenseMap.set(id, (projectExpenseMap.get(id) || 0) + numberValue(expense.amount));
    });
    const projectPayrollMap = new Map();
    payroll.forEach((record) => {
      const id = idOf(record.project);
      projectPayrollMap.set(id, (projectPayrollMap.get(id) || 0) + record.total);
    });
    const projectSummaries = projects.map((project) => {
      const id = String(project._id);
      const recorded = projectExpenseMap.get(id) || 0;
      const payrollTotal = projectPayrollMap.get(id) || 0;
      return {
        ...project,
        recordedExpenses: recorded,
        payroll: payrollTotal,
        periodSpent: recorded + payrollTotal,
        budgetRemaining: numberValue(project.budget) - recorded - payrollTotal,
        budgetUtilization: project.budget > 0
          ? ((recorded + payrollTotal) / project.budget) * 100
          : 0
      };
    });

    res.json({
      generatedAt: new Date().toISOString(),
      scope: projectId ? projects[0].name : 'All Projects',
      reportType: type,
      period: { from: from.toISOString(), to: to.toISOString() },
      summary: {
        totalProjects: projects.length,
        activeProjects: projects.filter((project) => ['in-progress', 'delayed'].includes(project.status)).length,
        totalBudget,
        recordedExpenses,
        totalPayroll,
        totalSpent: recordedExpenses + totalPayroll,
        budgetRemaining: totalBudget - recordedExpenses - totalPayroll,
        totalWorkers: workers.length,
        activeWorkers: workers.filter((worker) => worker.status === 'active').length,
        materials: materials.length,
        inventoryValue,
        lowStock: lowStock.length,
        tools: tools.reduce((sum, tool) => sum + numberValue(tool.quantity), 0),
        toolsInUse: tools.filter((tool) => tool.status === 'in-use').reduce((sum, tool) => sum + numberValue(tool.quantity), 0),
        toolsNeedingRepair: tools.filter((tool) => tool.condition !== 'good').reduce((sum, tool) => sum + numberValue(tool.quantity), 0),
        attendanceSheets: attendanceSheets.length,
        presentDays: payroll.reduce((sum, record) => sum + record.daysPresent, 0)
      },
      analytics: {
        spendingTrend: buildTrend(expenses, attendanceSheets, type, from, to),
        expenseCategories: Object.entries(categories)
          .map(([name, value]) => ({ name, value }))
          .sort((left, right) => right.value - left.value),
        projectStatuses: Object.entries(projectStatuses).map(([name, value]) => ({ name, value }))
      },
      projects: projectSummaries,
      workers,
      attendance: attendanceSheets,
      payroll,
      materials: materials.map((material) => ({
        ...material,
        totalValue: numberValue(material.quantity) * numberValue(material.unitPrice),
        isLowStock: numberValue(material.quantity) <= numberValue(material.reorderPoint ?? 20)
      })),
      tools,
      expenses
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDetailedReport };

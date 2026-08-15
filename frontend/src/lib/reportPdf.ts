import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DetailedReport } from '../reportTypes';

const NAVY: [number, number, number] = [30, 41, 59];
const ORANGE: [number, number, number] = [245, 158, 11];
const GREEN: [number, number, number] = [16, 185, 129];
const BLUE: [number, number, number] = [59, 130, 246];
const RED: [number, number, number] = [239, 68, 68];
const SLATE: [number, number, number] = [100, 116, 139];
const LIGHT: [number, number, number] = [248, 250, 252];
const BORDER: [number, number, number] = [226, 232, 240];
const PAGE_WIDTH = 210;
const CONTENT_LEFT = 14;
const CONTENT_RIGHT = 196;
const CONTENT_TOP = 32;

const money = (value: number) => `PHP ${Number(value || 0).toLocaleString('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const compactMoney = (value: number) => {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1_000_000_000) return `PHP ${(amount / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(amount) >= 1_000_000) return `PHP ${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `PHP ${(amount / 1_000).toFixed(1)}K`;
  return money(amount);
};

const displayDate = (value?: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
};

const displayStatus = (value?: string) => {
  if (!value) return 'Not set';
  return value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const statusStyle = (value: string) => {
  const normalized = value.toLowerCase();
  if (['completed', 'active', 'available', 'good', 'paid'].includes(normalized)) {
    return { fill: [209, 250, 229] as [number, number, number], text: [4, 120, 87] as [number, number, number] };
  }
  if (['in-progress', 'in progress', 'in-use', 'in use'].includes(normalized)) {
    return { fill: [219, 234, 254] as [number, number, number], text: [29, 78, 216] as [number, number, number] };
  }
  if (['pending', 'needs repair', 'under-maintenance', 'under maintenance'].includes(normalized)) {
    return { fill: [254, 243, 199] as [number, number, number], text: [180, 83, 9] as [number, number, number] };
  }
  if (['delayed', 'cancelled', 'canceled', 'damaged', 'inactive'].includes(normalized)) {
    return { fill: [254, 226, 226] as [number, number, number], text: [185, 28, 28] as [number, number, number] };
  }
  return { fill: [241, 245, 249] as [number, number, number], text: NAVY };
};

const periodLabel = (report: DetailedReport) =>
  `${displayDate(report.period.from)} to ${displayDate(report.period.to)}`;

const reportTypeLabel = (report: DetailedReport) =>
  `${report.reportType.charAt(0).toUpperCase()}${report.reportType.slice(1)} report`;

const drawSectionTitle = (doc: jsPDF, title: string, subtitle?: string) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...NAVY);
  doc.text(title, CONTENT_LEFT, CONTENT_TOP + 2);
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE);
    doc.text(subtitle, CONTENT_LEFT, CONTENT_TOP + 8);
  }
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(1);
  doc.line(CONTENT_LEFT, CONTENT_TOP + 12, 49, CONTENT_TOP + 12);
};

const drawEmptyState = (doc: jsPDF, message: string, y = 52) => {
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(CONTENT_LEFT, y, CONTENT_RIGHT - CONTENT_LEFT, 20, 3, 3, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text(message, PAGE_WIDTH / 2, y + 12, { align: 'center' });
};

const drawKpi = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  detail: string,
  accent: [number, number, number],
) => {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(x, y, width, 29, 3, 3, 'FD');
  doc.setFillColor(...accent);
  doc.roundedRect(x, y, 2.2, 29, 1.1, 1.1, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE);
  doc.text(label, x + 6, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(value.length > 14 ? 12 : 15);
  doc.setTextColor(...NAVY);
  doc.text(value, x + 6, y + 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...accent);
  doc.text(doc.splitTextToSize(detail, width - 10)[0] || '', x + 6, y + 24);
};

const drawSpendingChart = (doc: jsPDF, report: DetailedReport, x: number, y: number, width: number, height: number) => {
  const data = report.analytics.spendingTrend;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(x, y, width, height, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('Spending trend', x + 6, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...SLATE);
  doc.text('Recorded expenses and worker payroll in the selected period', x + 6, y + 13);
  if (data.length === 0 || data.every((item) => item.total === 0)) {
    doc.text('No spending was recorded for this period.', x + width / 2, y + height / 2, { align: 'center' });
    return;
  }

  const chartX = x + 12;
  const chartY = y + 20;
  const chartWidth = width - 18;
  const chartHeight = height - 29;
  const maxValue = Math.max(...data.map((item) => item.total), 1);
  const slot = chartWidth / data.length;
  const barWidth = Math.max(2.5, Math.min(8, slot * 0.48));
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  for (let grid = 0; grid <= 4; grid += 1) {
    const gridY = chartY + (chartHeight * grid) / 4;
    doc.line(chartX, gridY, chartX + chartWidth, gridY);
  }
  data.forEach((item, index) => {
    const center = chartX + slot * index + slot / 2;
    const totalHeight = (item.total / maxValue) * chartHeight;
    const payrollHeight = item.total > 0 ? (item.payroll / item.total) * totalHeight : 0;
    doc.setFillColor(...ORANGE);
    doc.roundedRect(center - barWidth / 2, chartY + chartHeight - totalHeight, barWidth, totalHeight, 0.8, 0.8, 'F');
    if (payrollHeight > 0) {
      doc.setFillColor(...BLUE);
      doc.rect(center - barWidth / 2, chartY + chartHeight - payrollHeight, barWidth, payrollHeight, 'F');
    }
    doc.setFontSize(data.length > 8 ? 5.2 : 6.2);
    doc.setTextColor(...SLATE);
    doc.text(item.label, center, chartY + chartHeight + 5, { align: 'center', maxWidth: slot - 1 });
  });
  doc.setFontSize(6);
  doc.setTextColor(...SLATE);
  doc.text(compactMoney(maxValue), chartX, chartY - 2);
  doc.setFillColor(...ORANGE);
  doc.rect(x + width - 47, y + 6, 3, 3, 'F');
  doc.text('Expenses', x + width - 42, y + 8.5);
  doc.setFillColor(...BLUE);
  doc.rect(x + width - 24, y + 6, 3, 3, 'F');
  doc.text('Payroll', x + width - 19, y + 8.5);
};

const drawHorizontalBars = (
  doc: jsPDF,
  title: string,
  data: { name: string; value: number }[],
  x: number,
  y: number,
  width: number,
  height: number,
  color: [number, number, number],
  formatValue: (value: number) => string,
) => {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(x, y, width, height, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(title, x + 6, y + 8);
  const rows = data.slice(0, 6);
  if (rows.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...SLATE);
    doc.text('No data in the selected scope.', x + width / 2, y + height / 2, { align: 'center' });
    return;
  }
  const maxValue = Math.max(...rows.map((item) => item.value), 1);
  const rowHeight = (height - 16) / rows.length;
  rows.forEach((item, index) => {
    const rowY = y + 14 + index * rowHeight;
    const label = doc.splitTextToSize(item.name, 32)[0] || item.name;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...SLATE);
    doc.text(label, x + 6, rowY + 3);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x + 39, rowY, width - 68, 4.5, 1.2, 1.2, 'F');
    doc.setFillColor(...color);
    doc.roundedRect(x + 39, rowY, Math.max(1.5, ((width - 68) * item.value) / maxValue), 4.5, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(formatValue(item.value), x + width - 6, rowY + 3.2, { align: 'right' });
  });
};

interface TableOptions {
  title: string;
  subtitle: string;
  head: string[];
  body: (string | number)[][];
  statusColumns?: number[];
  rightAlignedColumns?: number[];
}

const addReportTable = (doc: jsPDF, options: TableOptions) => {
  doc.addPage();
  drawSectionTitle(doc, options.title, options.subtitle);
  if (options.body.length === 0) {
    drawEmptyState(doc, `No ${options.title.toLowerCase()} data is available for this report.`);
    return;
  }
  autoTable(doc, {
    startY: 49,
    head: [options.head],
    body: options.body,
    theme: 'grid',
    margin: { top: CONTENT_TOP, bottom: 20, left: CONTENT_LEFT, right: PAGE_WIDTH - CONTENT_RIGHT },
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    styles: {
      font: 'helvetica',
      fontSize: 6.7,
      cellPadding: 2.2,
      textColor: NAVY,
      lineColor: BORDER,
      lineWidth: 0.15,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      minCellHeight: 8,
    },
    alternateRowStyles: { fillColor: LIGHT },
    didParseCell: (cell) => {
      if (cell.section === 'body' && options.rightAlignedColumns?.includes(cell.column.index)) {
        cell.cell.styles.halign = 'right';
      }
      if (cell.section === 'body' && options.statusColumns?.includes(cell.column.index)) {
        const style = statusStyle(String(cell.cell.raw || ''));
        cell.cell.styles.fillColor = style.fill;
        cell.cell.styles.textColor = style.text;
        cell.cell.styles.fontStyle = 'bold';
        cell.cell.styles.halign = 'center';
      }
    },
  });
};

const addHeaderAndFooter = (doc: jsPDF, report: DetailedReport, logoDataUrl?: string) => {
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', CONTENT_LEFT, 6, 15, 15);
      } catch {
        // The text brand remains visible if an unsupported logo file is supplied.
      }
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.text('AGAP Architect Gacad & Partners', logoDataUrl ? 32 : CONTENT_LEFT, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...SLATE);
    doc.text('Construction Management System', logoDataUrl ? 32 : CONTENT_LEFT, 16);
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(0.7);
    doc.line(CONTENT_LEFT, 24, CONTENT_RIGHT, 24);

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(CONTENT_LEFT, 281, CONTENT_RIGHT, 281);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...SLATE);
    doc.text(`${reportTypeLabel(report)} | ${report.scope}`, CONTENT_LEFT, 286);
    doc.text(`Generated ${displayDate(report.generatedAt)}`, PAGE_WIDTH / 2, 286, { align: 'center' });
    doc.text(`Page ${page} of ${totalPages}`, CONTENT_RIGHT, 286, { align: 'right' });
  }
};

const addExecutivePage = (doc: jsPDF, report: DetailedReport) => {
  drawSectionTitle(doc, 'Detailed Construction Management Report', 'Consolidated operational and financial performance report');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(report.scope, CONTENT_LEFT, 53);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text(`${reportTypeLabel(report)} | ${periodLabel(report)}`, CONTENT_LEFT, 59);
  doc.text(`Generated: ${new Date(report.generatedAt).toLocaleString('en-PH')}`, CONTENT_LEFT, 64);

  const utilization = report.summary.totalBudget > 0
    ? (report.summary.totalSpent / report.summary.totalBudget) * 100
    : 0;
  const cardWidth = 42.5;
  const gap = 4;
  const cards = [
    ['Projects', String(report.summary.totalProjects), `${report.summary.activeProjects} active`, ORANGE],
    ['Total budget', compactMoney(report.summary.totalBudget), `${utilization.toFixed(1)}% utilized`, BLUE],
    ['Period spending', compactMoney(report.summary.totalSpent), `${compactMoney(report.summary.totalPayroll)} payroll`, RED],
    ['Budget remaining', compactMoney(report.summary.budgetRemaining), report.summary.budgetRemaining >= 0 ? 'Within total budget' : 'Budget exceeded', GREEN],
    ['Workers', String(report.summary.totalWorkers), `${report.summary.activeWorkers} active`, GREEN],
    ['Materials value', compactMoney(report.summary.inventoryValue), `${report.summary.lowStock} low-stock items`, ORANGE],
    ['Tools', String(report.summary.tools), `${report.summary.toolsInUse} currently in use`, BLUE],
    ['Attendance', String(report.summary.presentDays), `${report.summary.attendanceSheets} weekly sheets`, SLATE],
  ] as const;
  cards.forEach((card, index) => {
    const row = Math.floor(index / 4);
    const column = index % 4;
    drawKpi(doc, CONTENT_LEFT + column * (cardWidth + gap), 73 + row * 34, cardWidth, card[0], card[1], card[2], card[3]);
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text('Executive summary', CONTENT_LEFT, 153);
  const topCategory = report.analytics.expenseCategories[0];
  const highestPeriod = [...report.analytics.spendingTrend].sort((left, right) => right.total - left.total)[0];
  const insights = [
    `Overall budget utilization is ${utilization.toFixed(1)}%, with ${money(report.summary.budgetRemaining)} remaining across the selected project scope.`,
    topCategory
      ? `${topCategory.name} is the leading spending category at ${money(topCategory.value)}.`
      : 'No categorized expenses were recorded for the selected period.',
    highestPeriod && highestPeriod.total > 0
      ? `${highestPeriod.label} recorded the highest spending in this report at ${money(highestPeriod.total)}.`
      : 'No spending peak was identified because the selected period contains no recorded costs.',
    `${report.summary.lowStock} material item(s) require replenishment and ${report.summary.toolsNeedingRepair} tool unit(s) require maintenance attention.`,
    `${report.summary.presentDays} worker-days were logged, producing ${money(report.summary.totalPayroll)} in payroll for the selected period.`,
  ];
  let insightY = 163;
  insights.forEach((insight) => {
    const lines = doc.splitTextToSize(insight, 166);
    doc.setFillColor(...ORANGE);
    doc.circle(CONTENT_LEFT + 2, insightY - 1.2, 1, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text(lines, CONTENT_LEFT + 7, insightY);
    insightY += lines.length * 4.1 + 4;
  });

  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(CONTENT_LEFT, 224, CONTENT_RIGHT - CONTENT_LEFT, 36, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text('Report coverage', CONTENT_LEFT + 6, 233);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...SLATE);
  doc.text('Projects and schedules | Workers and payroll | Materials inventory | Tool custody | Individual expense ledger', CONTENT_LEFT + 6, 241);
  doc.text('The figures in this report are calculated from live AGAP records and restricted to the selected scope and reporting period.', CONTENT_LEFT + 6, 249);
};

const addAnalyticsPage = (doc: jsPDF, report: DetailedReport) => {
  doc.addPage();
  drawSectionTitle(doc, 'Descriptive Analytics', 'Historical results summarized into trends, distributions, totals, and operational exceptions');
  drawSpendingChart(doc, report, CONTENT_LEFT, 51, 182, 80);
  drawHorizontalBars(doc, 'Expense category distribution', report.analytics.expenseCategories, CONTENT_LEFT, 139, 88, 77, ORANGE, compactMoney);
  drawHorizontalBars(doc, 'Project status distribution', report.analytics.projectStatuses, 108, 139, 88, 77, BLUE, (value) => `${value}`);

  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(CONTENT_LEFT, 224, 182, 40, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text('Management interpretation', CONTENT_LEFT + 6, 233);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...SLATE);
  const interpretation = report.summary.totalSpent > report.summary.totalBudget && report.summary.totalBudget > 0
    ? 'Spending exceeds the combined project budget. Review the detailed ledger and payroll tables and prioritize corrective budget action.'
    : report.summary.lowStock > 0 || report.summary.toolsNeedingRepair > 0
      ? 'Financial performance remains measurable within the selected scope, while inventory or maintenance exceptions require operational follow-up.'
      : 'No major inventory or maintenance exception is currently flagged. Continue monitoring spending and project progress against plan.';
  doc.text(doc.splitTextToSize(interpretation, 168), CONTENT_LEFT + 6, 242);
};

export const buildDetailedReportPdf = (report: DetailedReport, logoDataUrl?: string) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({
    title: `AGAP ${reportTypeLabel(report)} - ${report.scope}`,
    subject: 'Construction management descriptive analytics and detailed module report',
    author: 'AGAP Architect Gacad & Partners',
    creator: 'AGAP Construction Management System',
  });

  addExecutivePage(doc, report);
  addAnalyticsPage(doc, report);

  addReportTable(doc, {
    title: 'Projects Portfolio',
    subtitle: 'Schedule, status, progress, budget, expenses, payroll, and remaining funds',
    head: ['Project', 'Location', 'Status', 'Progress', 'Schedule', 'Budget', 'Expenses', 'Payroll', 'Remaining'],
    body: report.projects.map((project) => [
      project.name,
      project.location || '-',
      displayStatus(project.status),
      `${Number(project.progress || 0).toFixed(0)}%`,
      `${displayDate(project.startDate)} - ${displayDate(project.endDate)}`,
      money(project.budget),
      money(project.recordedExpenses),
      money(project.payroll),
      money(project.budgetRemaining),
    ]),
    statusColumns: [2],
    rightAlignedColumns: [3, 5, 6, 7, 8],
  });

  addReportTable(doc, {
    title: 'Workers Directory',
    subtitle: 'Worker roles, contact information, salary rates, status, and assigned projects',
    head: ['Worker', 'Role', 'Phone', 'Daily salary', 'Status', 'Assigned project(s)'],
    body: report.workers.map((worker) => [
      worker.name,
      worker.position,
      worker.phone || '-',
      money(worker.dailySalary),
      displayStatus(worker.status),
      worker.assignedProjects?.map((project) => project.name).join(', ') || 'Not assigned',
    ]),
    statusColumns: [4],
    rightAlignedColumns: [3],
  });

  addReportTable(doc, {
    title: 'Attendance and Payroll',
    subtitle: 'Every saved worker payroll record in the selected reporting period',
    head: ['Week', 'Project', 'Worker', 'Role', 'Present', 'Rate', 'Base', 'Bonus / OT', 'Total'],
    body: report.payroll.map((payroll) => [
      displayDate(payroll.weekStart),
      payroll.project?.name || 'Not assigned',
      payroll.workerName,
      payroll.position,
      `${payroll.daysPresent} day(s)`,
      money(payroll.dailySalary),
      money(payroll.baseSalary),
      money(payroll.bonus + payroll.overtime),
      money(payroll.total),
    ]),
    rightAlignedColumns: [4, 5, 6, 7, 8],
  });

  addReportTable(doc, {
    title: 'Materials Inventory',
    subtitle: 'Material-level quantities, prices, total values, stock health, suppliers, and project use',
    head: ['Material ID', 'Material', 'Category', 'Qty / Unit', 'Unit cost', 'Total value', 'Stock', 'Supplier', 'Project'],
    body: report.materials.map((material) => [
      material.materialId || material._id.slice(-8).toUpperCase(),
      material.name,
      material.category,
      `${material.quantity.toLocaleString()} ${material.unit}`,
      money(material.unitPrice),
      money(material.totalValue),
      material.isLowStock ? 'Low' : displayStatus(material.stockLevel || 'Sufficient'),
      material.supplier || '-',
      material.project?.name || 'Not assigned',
    ]),
    statusColumns: [6],
    rightAlignedColumns: [3, 4, 5],
  });

  addReportTable(doc, {
    title: 'Tools and Equipment',
    subtitle: 'Tool identity, custody, checkout status, condition, and expected return dates',
    head: ['Tool ID', 'Tool', 'Category', 'Qty', 'Condition', 'Status', 'Project', 'Assigned to', 'Return date'],
    body: report.tools.map((tool) => [
      tool.toolId || tool._id.slice(-8).toUpperCase(),
      tool.name,
      tool.category,
      tool.quantity.toLocaleString(),
      displayStatus(tool.condition),
      displayStatus(tool.status),
      tool.project?.name || 'Not assigned',
      tool.assignedTo?.name || 'Not assigned',
      displayDate(tool.expectedReturnDate),
    ]),
    statusColumns: [4, 5],
    rightAlignedColumns: [3],
  });

  addReportTable(doc, {
    title: 'Detailed Expense Ledger',
    subtitle: 'Every individual non-payroll expense recorded during the selected reporting period',
    head: ['Date', 'Description', 'Category', 'Project', 'Recorded by', 'Amount', 'Notes'],
    body: report.expenses.map((expense) => [
      displayDate(expense.date),
      expense.description,
      expense.category,
      expense.project?.name || 'Not assigned',
      expense.paidBy?.name || '-',
      money(expense.amount),
      expense.notes || '-',
    ]),
    rightAlignedColumns: [5],
  });

  addHeaderAndFooter(doc, report, logoDataUrl);
  return doc;
};

export const loadReportLogo = async () => {
  try {
    const response = await fetch('/logo.png');
    if (!response.ok) return undefined;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
};

export const reportFileName = (report: DetailedReport) => {
  const safeScope = report.scope.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  const start = report.period.from.slice(0, 10);
  const end = report.period.to.slice(0, 10);
  return `AGAP-${safeScope || 'projects'}-${report.reportType}-${start}-to-${end}.pdf`;
};

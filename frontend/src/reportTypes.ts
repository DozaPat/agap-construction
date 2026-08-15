export type ReportType = 'weekly' | 'monthly' | 'annual';

export interface NamedReference {
  _id: string;
  name: string;
  status?: string;
  position?: string;
  role?: string;
}

export interface ReportSummary {
  totalProjects: number;
  activeProjects: number;
  totalBudget: number;
  recordedExpenses: number;
  totalPayroll: number;
  totalSpent: number;
  budgetRemaining: number;
  totalWorkers: number;
  activeWorkers: number;
  materials: number;
  inventoryValue: number;
  lowStock: number;
  tools: number;
  toolsInUse: number;
  toolsNeedingRepair: number;
  attendanceSheets: number;
  presentDays: number;
}

export interface SpendingTrendItem {
  label: string;
  recorded: number;
  payroll: number;
  total: number;
}

export interface AnalyticsItem {
  name: string;
  value: number;
}

export interface ReportProject {
  _id: string;
  name: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  budget: number;
  status: string;
  progress: number;
  manager?: NamedReference;
  workers?: NamedReference[];
  recordedExpenses: number;
  payroll: number;
  periodSpent: number;
  budgetRemaining: number;
  budgetUtilization: number;
}

export interface ReportWorker {
  _id: string;
  name: string;
  position: string;
  phone?: string;
  dailySalary: number;
  status: string;
  assignedProjects?: NamedReference[];
}

export interface ReportPayroll {
  _id: string;
  project?: NamedReference;
  weekStart: string;
  workerName: string;
  position: string;
  daysPresent: number;
  dailySalary: number;
  baseSalary: number;
  bonus: number;
  overtime: number;
  total: number;
}

export interface ReportMaterial {
  _id: string;
  materialId?: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalValue: number;
  supplier?: string;
  reorderPoint?: number;
  stockLevel?: string;
  isLowStock: boolean;
  project?: NamedReference;
}

export interface ReportTool {
  _id: string;
  toolId?: string;
  name: string;
  category: string;
  quantity: number;
  condition: string;
  status: string;
  project?: NamedReference;
  assignedTo?: NamedReference;
  checkedOutAt?: string;
  expectedReturnDate?: string;
  lastMaintenance?: string;
  notes?: string;
}

export interface ReportExpense {
  _id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  project?: NamedReference;
  paidBy?: NamedReference;
  notes?: string;
}

export interface DetailedReport {
  generatedAt: string;
  scope: string;
  reportType: ReportType;
  period: { from: string; to: string };
  summary: ReportSummary;
  analytics: {
    spendingTrend: SpendingTrendItem[];
    expenseCategories: AnalyticsItem[];
    projectStatuses: AnalyticsItem[];
  };
  projects: ReportProject[];
  workers: ReportWorker[];
  payroll: ReportPayroll[];
  materials: ReportMaterial[];
  tools: ReportTool[];
  expenses: ReportExpense[];
}

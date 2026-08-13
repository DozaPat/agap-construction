import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FolderKanban,
  Gauge,
  PackageSearch,
  RefreshCw,
  Receipt,
  ShieldAlert,
  TrendingUp,
  Users,
  WalletCards,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

type DatePreset = 'this-week' | 'this-month' | 'last-30' | 'all' | 'custom';
type Health = 'healthy' | 'attention' | 'at-risk' | 'completed' | 'cancelled';
type ActivityEntity = 'project' | 'worker' | 'material' | 'tool' | 'expense';
type ActivityAction = 'created' | 'updated' | 'deleted';

interface DashboardResponse {
  generatedAt: string;
  projects: Array<{ _id: string; name: string }>;
  kpis: {
    activeProjects: number;
    projectsCreatedInPeriod: number;
    totalBudget: number;
    totalSpent: number;
    periodSpent: number;
    recordedExpenses: number;
    totalPayroll: number;
    periodPayroll: number;
    budgetRemaining: number;
    budgetUtilization: number;
    totalWorkers: number;
    activeWorkers: number;
    presentWorkers: number;
    attendanceRate: number;
    lowStockMaterials: number;
    inventoryValue: number;
    totalTools: number;
    repairTools: number;
    overdueTools: number;
    delayedProjects: number;
    urgentAlerts: number;
  };
  spendingTrend: {
    mode: 'day' | 'week' | 'month';
    points: Array<{ label: string; recorded: number; payroll: number; total: number }>;
  };
  expenseBreakdown: Array<{ name: string; value: number }>;
  projectHealth: Array<{
    _id: string;
    name: string;
    status: string;
    progress: number;
    budget: number;
    recordedExpenses: number;
    payroll: number;
    spent: number;
    budgetRemaining: number;
    budgetUtilization: number;
    schedule: string;
    health: Health;
    lowStock: number;
    overdueTools: number;
  }>;
  projectStatuses: Array<{ name: string; value: number }>;
  workforceByRole: Array<{ name: string; value: number }>;
  toolStatus: Array<{ name: string; value: number }>;
  alerts: Array<{
    id: string;
    severity: 'critical' | 'warning' | 'info';
    type: string;
    title: string;
    detail: string;
    link: string;
  }>;
  recentActivities: Array<{
    _id: string;
    action: ActivityAction;
    entityType: ActivityEntity;
    entityId?: string;
    message: string;
    actor?: { name: string; role: string };
    createdAt: string;
  }>;
}

interface KpiCardProps {
  title: string;
  value: ReactNode;
  detail: string;
  icon: LucideIcon;
  tone: 'amber' | 'blue' | 'emerald' | 'red' | 'violet' | 'slate';
  onClick?: () => void;
}

const peso = (amount: number) => new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
}).format(amount);
const compactPeso = (amount: number) => new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(amount);
const localDate = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};
const percentage = (value: number) => `${Math.round(value)}%`;
const titleCase = (value: string) => value
  .split('-')
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

const tones = {
  amber: 'border-l-amber-500 bg-amber-100 text-amber-700',
  blue: 'border-l-blue-500 bg-blue-100 text-blue-700',
  emerald: 'border-l-emerald-500 bg-emerald-100 text-emerald-700',
  red: 'border-l-red-500 bg-red-100 text-red-700',
  violet: 'border-l-violet-500 bg-violet-100 text-violet-700',
  slate: 'border-l-slate-500 bg-slate-100 text-slate-700',
};

const KpiCard = ({ title, value, detail, icon: Icon, tone, onClick }: KpiCardProps) => {
  const [borderClass, iconBackground, iconColor] = tones[tone].split(' ');
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group min-w-0 overflow-hidden rounded-3xl border border-l-4 border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${borderClass}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl" title={String(value)}>
            {value}
          </p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconBackground} ${iconColor}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="mt-5 flex items-end justify-between gap-2">
        <p className="line-clamp-2 text-xs leading-5 text-slate-500">{detail}</p>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1" />
      </div>
    </button>
  );
};

const Panel = ({ title, subtitle, action, children, className = '' }: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={`min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
    <header className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </header>
    {children}
  </section>
);

const statusColors: Record<string, string> = {
  pending: '#F59E0B',
  'in-progress': '#3B82F6',
  delayed: '#EF4444',
  completed: '#10B981',
  cancelled: '#64748B',
};
const expenseColors = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#06B6D4', '#64748B'];
const activityIcons: Record<ActivityEntity, LucideIcon> = {
  project: FolderKanban,
  worker: Users,
  material: PackageSearch,
  tool: Wrench,
  expense: Receipt,
};
const activityRoutes: Record<ActivityEntity, string> = {
  project: '/projects',
  worker: '/workers',
  material: '/materials',
  tool: '/tools',
  expense: '/expenses',
};
const healthStyles: Record<Health, string> = {
  healthy: 'bg-emerald-100 text-emerald-700',
  attention: 'bg-amber-100 text-amber-700',
  'at-risk': 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-slate-100 text-slate-600',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('this-month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [activityModule, setActivityModule] = useState<'all' | ActivityEntity>('all');
  const [activityAction, setActivityAction] = useState<'all' | ActivityAction>('all');

  const dateBounds = useMemo(() => {
    const now = new Date();
    if (datePreset === 'all') return { from: '', to: '' };
    if (datePreset === 'custom') return { from: customFrom, to: customTo };
    if (datePreset === 'last-30') {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      return { from: localDate(from), to: localDate(now) };
    }
    if (datePreset === 'this-week') {
      const from = new Date(now);
      const day = from.getDay();
      from.setDate(from.getDate() - (day === 0 ? 6 : day - 1));
      return { from: localDate(from), to: localDate(now) };
    }
    return {
      from: localDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: localDate(now),
    };
  }, [customFrom, customTo, datePreset]);

  const loadDashboard = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (projectFilter !== 'all') params.set('project', projectFilter);
      if (dateBounds.from) params.set('from', dateBounds.from);
      if (dateBounds.to) params.set('to', dateBounds.to);
      const response = await api.get<DashboardResponse>(`/dashboard/summary?${params.toString()}`);
      setData(response.data);
    } catch (loadError) {
      console.error(loadError);
      setError('Unable to load dashboard analytics. Make sure the backend has finished deploying, then refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateBounds.from, dateBounds.to, projectFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const periodLabel = datePreset === 'all'
    ? 'all time'
    : datePreset === 'this-week'
      ? 'this week'
      : datePreset === 'this-month'
        ? 'this month'
        : datePreset === 'last-30'
          ? 'last 30 days'
          : 'selected range';

  const filteredActivities = useMemo(() => (data?.recentActivities || []).filter((activity) =>
    (activityModule === 'all' || activity.entityType === activityModule) &&
    (activityAction === 'all' || activity.action === activityAction)
  ).slice(0, 8), [activityAction, activityModule, data?.recentActivities]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-9 w-9 animate-spin text-amber-500" />
          <p className="mt-4 text-sm font-medium text-slate-500">Preparing live analytics…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Operations Dashboard</h1>
            <span className="hidden rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">Live</span>
          </div>
          <p className="mt-1 text-slate-600">Financial, workforce, inventory, and project health in one place</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>Updated {data ? formatDistanceToNow(new Date(data.generatedAt), { addSuffix: true }) : '—'}</span>
          <button
            type="button"
            onClick={() => void loadDashboard(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_auto]">
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Project</span>
            <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className="filter-select">
              <option value="all">All Projects</option>
              {data?.projects.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Reporting Period</span>
            <select value={datePreset} onChange={(event) => setDatePreset(event.target.value as DatePreset)} className="filter-select">
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="last-30">Last 30 Days</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="mt-auto inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 font-bold text-white hover:bg-amber-600"
          >
            <FolderKanban className="h-5 w-5" /> Manage Projects
          </button>
        </div>
        {datePreset === 'custom' && (
          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-600">From
              <input type="date" value={customFrom} max={customTo || undefined} onChange={(event) => setCustomFrom(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-amber-500" />
            </label>
            <label className="text-sm font-medium text-slate-600">To
              <input type="date" value={customTo} min={customFrom || undefined} onChange={(event) => setCustomTo(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-amber-500" />
            </label>
          </div>
        )}
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1"><p className="font-semibold">Dashboard unavailable</p><p>{error}</p></div>
          <button type="button" onClick={() => void loadDashboard(true)} className="font-bold underline">Retry</button>
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <KpiCard title="Active Projects" value={data.kpis.activeProjects} detail={`${data.kpis.projectsCreatedInPeriod} created ${periodLabel}`} icon={FolderKanban} tone="amber" onClick={() => navigate('/projects')} />
            <KpiCard title="Total Budget" value={compactPeso(data.kpis.totalBudget)} detail="Combined approved project budget" icon={Banknote} tone="blue" onClick={() => navigate('/projects')} />
            <KpiCard title="Total Spent" value={compactPeso(data.kpis.totalSpent)} detail={`${compactPeso(data.kpis.periodSpent)} spent ${periodLabel}`} icon={WalletCards} tone="violet" onClick={() => navigate('/expenses')} />
            <KpiCard title="Budget Remaining" value={compactPeso(data.kpis.budgetRemaining)} detail={`${percentage(data.kpis.budgetUtilization)} of budget consumed`} icon={CircleDollarSign} tone={data.kpis.budgetUtilization >= 90 ? 'red' : 'emerald'} onClick={() => navigate('/projects')} />
            <KpiCard title="Active Workforce" value={data.kpis.activeWorkers} detail={`${data.kpis.presentWorkers} attended · ${percentage(data.kpis.attendanceRate)} attendance`} icon={Users} tone="emerald" onClick={() => navigate('/workers')} />
            <KpiCard title="Urgent Alerts" value={data.kpis.urgentAlerts} detail={`${data.kpis.lowStockMaterials} low stock · ${data.kpis.overdueTools} overdue tools`} icon={ShieldAlert} tone={data.kpis.urgentAlerts > 0 ? 'red' : 'slate'} />
          </div>

          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.45fr_1fr]">
            <Panel title="Spending Trend" subtitle={`Recorded expenses and payroll for ${periodLabel}`}>
              {data.spendingTrend.points.length === 0 ? (
                <div className="flex h-72 items-center justify-center text-sm text-slate-400">No spending recorded for this period.</div>
              ) : (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.spendingTrend.points} margin={{ left: 0, right: 8 }}>
                      <defs>
                        <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} /><stop offset="95%" stopColor="#F59E0B" stopOpacity={0.03} /></linearGradient>
                        <linearGradient id="payrollFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3B82F6" stopOpacity={0.03} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(value) => compactPeso(Number(value))} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={75} />
                      <Tooltip formatter={(value, name) => [peso(Number(value || 0)), name === 'recorded' ? 'Expenses' : 'Payroll']} />
                      <Legend formatter={(value) => value === 'recorded' ? 'Recorded Expenses' : 'Worker Payroll'} />
                      <Area type="monotone" dataKey="recorded" stackId="spending" stroke="#F59E0B" strokeWidth={2.5} fill="url(#expenseFill)" />
                      <Area type="monotone" dataKey="payroll" stackId="spending" stroke="#3B82F6" strokeWidth={2.5} fill="url(#payrollFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel title="Expense Breakdown" subtitle={`Where money was spent ${periodLabel}`}>
              {data.expenseBreakdown.length === 0 ? (
                <div className="flex h-72 items-center justify-center text-sm text-slate-400">No expense categories to display.</div>
              ) : (
                <div className="grid min-h-80 grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_0.9fr]">
                  <div className="h-64 min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.expenseBreakdown} innerRadius={54} outerRadius={88} paddingAngle={3} dataKey="value">
                          {data.expenseBreakdown.map((entry, index) => <Cell key={entry.name} fill={expenseColors[index % expenseColors.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => peso(Number(value || 0))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {data.expenseBreakdown.slice(0, 6).map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2 text-slate-600"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: expenseColors[index % expenseColors.length] }} /><span className="truncate">{entry.name}</span></span>
                        <strong className="shrink-0 text-slate-900">{compactPeso(entry.value)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Panel>
          </div>

          <Panel title="Project Health Overview" subtitle="Projects ranked by financial and schedule risk" action={<button type="button" onClick={() => navigate('/projects')} className="text-sm font-bold text-amber-600 hover:text-amber-700">View all projects →</button>}>
            {data.projectHealth.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 py-10 text-center text-sm text-slate-400">No projects found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[950px] w-full text-left text-sm">
                  <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400"><th className="px-3 py-3">Project</th><th className="px-3 py-3">Progress</th><th className="px-3 py-3">Budget Used</th><th className="px-3 py-3">Spent</th><th className="px-3 py-3">Remaining</th><th className="px-3 py-3">Schedule</th><th className="px-3 py-3">Health</th></tr></thead>
                  <tbody>{data.projectHealth.slice(0, 8).map((project) => (
                    <tr key={project._id} onClick={() => navigate('/projects')} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-4"><p className="max-w-[220px] truncate font-semibold text-slate-900">{project.name}</p><p className="mt-1 text-xs text-slate-400">{titleCase(project.status)}</p></td>
                      <td className="px-3 py-4"><div className="flex min-w-36 items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(project.progress, 100)}%` }} /></div><span className="w-9 text-right font-semibold">{percentage(project.progress)}</span></div></td>
                      <td className="px-3 py-4"><div className="flex min-w-36 items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${project.budgetUtilization >= 100 ? 'bg-red-500' : project.budgetUtilization >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(project.budgetUtilization, 100)}%` }} /></div><span className="w-11 text-right font-semibold">{percentage(project.budgetUtilization)}</span></div></td>
                      <td className="px-3 py-4 font-semibold text-slate-800">{compactPeso(project.spent)}</td>
                      <td className={`px-3 py-4 font-semibold ${project.budgetRemaining < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{compactPeso(project.budgetRemaining)}</td>
                      <td className="px-3 py-4 text-slate-600">{project.schedule}</td>
                      <td className="px-3 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${healthStyles[project.health]}`}>{titleCase(project.health)}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Panel>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
            <Panel title="Workforce & Payroll" subtitle={`${data.kpis.activeWorkers} active workers · ${compactPeso(data.kpis.periodPayroll)} payroll ${periodLabel}`}>
              <div className="mb-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-semibold uppercase text-emerald-600">Attendance</p><p className="mt-1 text-2xl font-bold text-slate-900">{percentage(data.kpis.attendanceRate)}</p></div>
                <div className="rounded-2xl bg-blue-50 p-4"><p className="text-xs font-semibold uppercase text-blue-600">Payroll</p><p className="mt-1 truncate text-2xl font-bold text-slate-900">{compactPeso(data.kpis.periodPayroll)}</p></div>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.workforceByRole.slice(0, 8)} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={78} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="Workers" fill="#10B981" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <button type="button" onClick={() => navigate('/workers')} className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">Review attendance and payroll</button>
            </Panel>

            <Panel title="Project Portfolio" subtitle="Distribution across every project status">
              <div className="h-72">
                {data.projectStatuses.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.projectStatuses} cx="50%" cy="45%" innerRadius={58} outerRadius={95} paddingAngle={4} dataKey="value" label={({ value }) => value}>
                        {data.projectStatuses.map((entry) => <Cell key={entry.name} fill={statusColors[entry.name] || '#64748B'} />)}
                      </Pie>
                      <Tooltip formatter={(value, _name, item) => [value, titleCase(String(item.payload.name))]} />
                      <Legend formatter={(value) => titleCase(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="flex h-full items-center justify-center text-sm text-slate-400">No project data.</div>}
              </div>
            </Panel>

            <Panel title="Resources Snapshot" subtitle="Inventory and equipment readiness" className="xl:col-span-2 2xl:col-span-1">
              <div className="space-y-3">
                <button type="button" onClick={() => navigate('/materials')} className="flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left hover:border-amber-200 hover:bg-amber-50">
                  <div className="rounded-2xl bg-amber-100 p-3 text-amber-700"><PackageSearch className="h-6 w-6" /></div>
                  <div className="min-w-0 flex-1"><p className="font-bold text-slate-900">Materials</p><p className="truncate text-sm text-slate-500">{compactPeso(data.kpis.inventoryValue)} inventory value</p></div>
                  <div className="text-right"><strong className={`${data.kpis.lowStockMaterials ? 'text-red-600' : 'text-emerald-600'}`}>{data.kpis.lowStockMaterials}</strong><p className="text-xs text-slate-400">low stock</p></div>
                </button>
                <button type="button" onClick={() => navigate('/tools')} className="flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left hover:border-blue-200 hover:bg-blue-50">
                  <div className="rounded-2xl bg-blue-100 p-3 text-blue-700"><Wrench className="h-6 w-6" /></div>
                  <div className="min-w-0 flex-1"><p className="font-bold text-slate-900">Tools</p><p className="truncate text-sm text-slate-500">{data.kpis.totalTools} registered units</p></div>
                  <div className="text-right"><strong className={`${data.kpis.overdueTools ? 'text-red-600' : 'text-emerald-600'}`}>{data.kpis.overdueTools}</strong><p className="text-xs text-slate-400">overdue</p></div>
                </button>
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {data.toolStatus.map((entry, index) => (
                    <div key={entry.name} className="rounded-2xl border border-slate-100 p-3 text-center"><span className={`mx-auto mb-2 block h-2 w-8 rounded-full ${index === 0 ? 'bg-emerald-500' : index === 1 ? 'bg-blue-500' : 'bg-amber-500'}`} /><strong className="text-xl text-slate-900">{entry.value}</strong><p className="mt-1 text-[11px] text-slate-500">{titleCase(entry.name)}</p></div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Panel title="Action Center" subtitle="Operational issues requiring review" action={<span className={`rounded-full px-3 py-1 text-xs font-bold ${data.alerts.length ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{data.alerts.length} alerts</span>}>
              {data.alerts.length === 0 ? (
                <div className="rounded-2xl bg-emerald-50 px-5 py-10 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" /><p className="mt-3 font-bold text-emerald-800">Everything looks operational</p><p className="mt-1 text-sm text-emerald-600">No urgent risks were found.</p></div>
              ) : (
                <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
                  {data.alerts.map((alert) => (
                    <button key={alert.id} type="button" onClick={() => navigate(alert.link)} className="group flex w-full items-start gap-3 rounded-2xl border border-slate-100 p-3 text-left hover:bg-slate-50">
                      <div className={`mt-0.5 rounded-xl p-2 ${alert.severity === 'critical' ? 'bg-red-100 text-red-600' : alert.severity === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}><AlertTriangle className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{alert.title}</p><p className="mt-1 text-sm leading-5 text-slate-500">{alert.detail}</p></div>
                      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300 group-hover:translate-x-1" />
                    </button>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Recent Activity" subtitle="Latest changes across every module" action={
              <div className="flex gap-2">
                <select aria-label="Filter activity by module" value={activityModule} onChange={(event) => setActivityModule(event.target.value as 'all' | ActivityEntity)} className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-700 outline-none">
                  <option value="all">All Modules</option><option value="project">Projects</option><option value="worker">Workers</option><option value="material">Materials</option><option value="tool">Tools</option><option value="expense">Expenses</option>
                </select>
                <select aria-label="Filter activity by action" value={activityAction} onChange={(event) => setActivityAction(event.target.value as 'all' | ActivityAction)} className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-700 outline-none">
                  <option value="all">All Actions</option><option value="created">Created</option><option value="updated">Updated</option><option value="deleted">Deleted</option>
                </select>
              </div>
            }>
              {filteredActivities.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 py-10 text-center text-sm text-slate-400">No activity matches these filters.</div>
              ) : (
                <div className="max-h-[430px] space-y-1 overflow-y-auto pr-1">
                  {filteredActivities.map((activity) => {
                    const Icon = activityIcons[activity.entityType] || Clock3;
                    return (
                      <button key={activity._id} type="button" onClick={() => navigate(activityRoutes[activity.entityType])} className="flex w-full items-start gap-3 rounded-2xl p-3 text-left hover:bg-slate-50">
                        <div className={`rounded-xl p-2 ${activity.action === 'created' ? 'bg-emerald-100 text-emerald-700' : activity.action === 'updated' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}><Icon className="h-5 w-5" /></div>
                        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">{activity.message}</p><p className="mt-1 text-xs text-slate-400">{activity.actor?.name || 'System'} · {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</p></div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Panel>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-slate-900 px-5 py-4 text-white sm:px-6">
            <div className="flex items-center gap-3"><Gauge className="h-6 w-6 text-amber-400" /><div><p className="font-bold">Management snapshot</p><p className="text-xs text-slate-400">{data.kpis.delayedProjects} delayed projects · {data.kpis.repairTools} tools need repair · {compactPeso(data.kpis.periodPayroll)} payroll {periodLabel}</p></div></div>
            <button type="button" onClick={() => navigate('/reports')} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20"><TrendingUp className="h-4 w-4" /> Generate Reports</button>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;

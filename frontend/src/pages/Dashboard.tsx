import { useEffect, useState, type ReactNode } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Clock,
  FileText,
  FolderKanban,
  Package,
  PackageSearch,
  Plus,
  Receipt,
  Users,
  WalletCards,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface Project {
  _id: string;
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed' | 'cancelled';
  progress?: number;
  createdAt: string;
}

interface Worker {
  _id: string;
  status: 'active' | 'inactive';
  availability?: boolean;
}

interface Material {
  _id: string;
  quantity: number;
  reorderPoint?: number;
}

interface Expense {
  _id: string;
  amount: number;
  date: string;
}

type ActivityEntity = 'project' | 'worker' | 'material' | 'tool' | 'expense';
type ActivityAction = 'created' | 'updated' | 'deleted';

interface Activity {
  _id: string;
  action: ActivityAction;
  entityType: ActivityEntity;
  message: string;
  actor?: {
    name: string;
    role: string;
  };
  createdAt: string;
}

interface MetricCardProps {
  title: string;
  value: ReactNode;
  detail: string;
  detailClassName: string;
  accentClassName: string;
  iconClassName: string;
  icon: LucideIcon;
}

const MetricCard = ({
  title,
  value,
  detail,
  detailClassName,
  accentClassName,
  iconClassName,
  icon: Icon,
}: MetricCardProps) => {
  const digitCount = String(value).replace(/\D/g, '').length;
  const valueSizeClass =
    digitCount >= 15
      ? 'text-sm'
      : digitCount >= 12
        ? 'text-base'
      : digitCount >= 9
        ? 'text-xl'
        : digitCount >= 6
          ? 'text-2xl sm:text-3xl'
          : 'text-4xl sm:text-5xl';

  return (
    <div className={`min-w-0 overflow-hidden rounded-3xl border border-l-4 border-gray-100 bg-white p-5 shadow-sm sm:p-6 ${accentClassName}`}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500">{title}</p>
          <p className={`mt-2 max-w-full whitespace-nowrap font-bold leading-none tracking-tight text-[#1E293B] tabular-nums ${valueSizeClass}`}>
            {value}
          </p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${iconClassName}`}>
          <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>
      </div>
      <p className={`mt-6 text-sm ${detailClassName}`}>{detail}</p>
    </div>
  );
};

const activityIcons: Record<ActivityEntity, LucideIcon> = {
  project: FolderKanban,
  worker: Users,
  material: Package,
  tool: Wrench,
  expense: Receipt,
};

const activityActionClasses: Record<ActivityAction, string> = {
  created: 'bg-emerald-100 text-emerald-700',
  updated: 'bg-blue-100 text-blue-700',
  deleted: 'bg-red-100 text-red-700',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [projRes, workerRes, matRes, expRes, activityRes] = await Promise.all([
          api.get<Project[]>('/projects'),
          api.get<Worker[]>('/workers'),
          api.get<Material[]>('/materials'),
          api.get<Expense[]>('/expenses'),
          api.get<Activity[]>('/activities?limit=8').catch(() => ({ data: [] as Activity[] })),
        ]);

        setProjects(projRes.data);
        setWorkers(workerRes.data);
        setMaterials(matRes.data);
        setExpenses(expRes.data);
        setActivities(activityRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const activeProjects = projects.filter((project) => project.status === 'in-progress').length;
  const projectsCreatedThisMonth = projects.filter((project) => {
    const createdAt = new Date(project.createdAt);
    return createdAt >= startOfThisMonth && createdAt < startOfNextMonth;
  }).length;

  const totalWorkers = workers.length;
  const activeWorkers = workers.filter((worker) => worker.status === 'active').length;

  const lowStockMaterials = materials.filter(
    (material) => material.quantity <= (material.reorderPoint ?? 20),
  ).length;

  const thisMonthExpenses = expenses
    .filter((expense) => {
      const date = new Date(expense.date);
      return date >= startOfThisMonth && date < startOfNextMonth;
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  const lastMonthExpenses = expenses
    .filter((expense) => {
      const date = new Date(expense.date);
      return date >= startOfLastMonth && date < startOfThisMonth;
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  let expenseComparison = 'No expenses recorded this month';
  let expenseComparisonClass = 'text-gray-500';

  if (lastMonthExpenses > 0) {
    const percentageChange = Math.round(
      ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100,
    );
    expenseComparison = `${percentageChange > 0 ? '+' : ''}${percentageChange}% vs last month`;
    expenseComparisonClass = percentageChange > 0 ? 'text-red-500' : percentageChange < 0 ? 'text-green-600' : 'text-gray-500';
  } else if (thisMonthExpenses > 0) {
    expenseComparison = 'No expenses recorded last month';
  }

  const monthlyExpenses = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const month = date.getMonth();
    const year = date.getFullYear();
    const amount = expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === month && expenseDate.getFullYear() === year;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);

    return {
      month: date.toLocaleString('en-PH', { month: 'short' }),
      amount,
    };
  });

  const projectProgressData = projects.slice(0, 5).map((project) => ({
    name: project.name.length > 12 ? `${project.name.substring(0, 12)}...` : project.name,
    progress: project.progress ?? 0,
  }));

  const statusData = [
    { name: 'In Progress', value: activeProjects, color: '#F59E0B' },
    { name: 'Pending', value: projects.filter((project) => project.status === 'pending').length, color: '#10B981' },
    { name: 'Completed', value: projects.filter((project) => project.status === 'completed').length, color: '#3B82F6' },
  ];

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:mb-10 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-[#1E293B] sm:text-4xl">Dashboard</h1>
          <p className="mt-1 text-gray-600">Live overview of AGAP Construction operations</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="flex w-full items-center justify-center gap-2 rounded-3xl bg-[#F59E0B] px-6 py-3.5 font-semibold text-white transition-colors hover:bg-orange-600 sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          New Project
        </button>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:mb-12 xl:grid-cols-4">
        <MetricCard
          title="Active Projects"
          value={activeProjects}
          detail={`${projectsCreatedThisMonth} project${projectsCreatedThisMonth === 1 ? '' : 's'} created this month`}
          detailClassName="text-emerald-600"
          accentClassName="border-l-[#F59E0B]"
          iconClassName="bg-orange-100 text-[#F59E0B]"
          icon={FolderKanban}
        />
        <MetricCard
          title="Total Workers"
          value={totalWorkers}
          detail={`${activeWorkers} worker${activeWorkers === 1 ? '' : 's'} marked active`}
          detailClassName="text-emerald-600"
          accentClassName="border-l-[#10B981]"
          iconClassName="bg-emerald-100 text-emerald-600"
          icon={Users}
        />
        <MetricCard
          title="Low Stock Materials"
          value={lowStockMaterials}
          detail={
            lowStockMaterials > 0
              ? `${lowStockMaterials} of ${materials.length} item${materials.length === 1 ? '' : 's'} need reorder`
              : `All ${materials.length} inventory item${materials.length === 1 ? '' : 's'} sufficiently stocked`
          }
          detailClassName={lowStockMaterials > 0 ? 'text-amber-600' : 'text-emerald-600'}
          accentClassName="border-l-[#F59E0B]"
          iconClassName="bg-amber-100 text-amber-600"
          icon={PackageSearch}
        />
        <MetricCard
          title="This Month Expenses"
          value={`₱${thisMonthExpenses.toLocaleString('en-PH')}`}
          detail={expenseComparison}
          detailClassName={expenseComparisonClass}
          accentClassName="border-l-[#EF4444]"
          iconClassName="bg-red-100 text-red-500"
          icon={WalletCards}
        />
      </div>

      <div className="my-10 flex items-center gap-3 sm:my-12 sm:gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
        <h2 className="whitespace-nowrap text-lg font-semibold text-[#1E293B] sm:text-2xl">Analytics Overview</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-l-4 border-gray-100 border-l-[#F59E0B] bg-white p-4 shadow-sm sm:p-8">
          <h3 className="mb-6 text-lg font-semibold text-[#1E293B] sm:text-xl">Monthly Expenses Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyExpenses}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `₱${Number(value || 0).toLocaleString('en-PH')}`} />
              <Legend />
              <Line type="monotone" dataKey="amount" stroke="#F59E0B" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl border border-l-4 border-gray-100 border-l-[#F59E0B] bg-white p-4 shadow-sm sm:p-8">
          <h3 className="mb-6 text-lg font-semibold text-[#1E293B] sm:text-xl">Project Progress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={projectProgressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="progress" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-l-4 border-gray-100 border-l-[#F59E0B] bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <Clock className="h-6 w-6 text-gray-500" />
            <h3 className="text-xl font-semibold text-[#1E293B]">Recent Activity</h3>
          </div>

          {activities.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center">
              <FileText className="mx-auto mb-3 h-7 w-7 text-slate-400" />
              <p className="text-sm font-medium text-slate-600">No activity recorded yet</p>
              <p className="mt-1 text-xs text-slate-400">New module changes will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const ActivityIcon = activityIcons[activity.entityType];
                return (
                  <div key={activity._id} className="flex min-w-0 items-start gap-3 rounded-2xl p-2 transition-colors hover:bg-slate-50">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${activityActionClasses[activity.action]}`}>
                      <ActivityIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium text-gray-700">{activity.message}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {activity.actor?.name ? `${activity.actor.name} · ` : ''}
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-l-4 border-gray-100 border-l-[#F59E0B] bg-white p-5 shadow-sm sm:p-8">
          <h3 className="mb-6 text-xl font-semibold text-[#1E293B]">Project Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                dataKey="value"
                label
              >
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

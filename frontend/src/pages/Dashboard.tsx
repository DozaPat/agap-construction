import { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import api from '../lib/api';
import { Clock } from 'lucide-react';

const Dashboard = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = async () => {
    try {
      const [projRes, workerRes, matRes, expRes] = await Promise.all([
        api.get('/projects'),
        api.get('/workers'),
        api.get('/materials'),
        api.get('/expenses')
      ]);

      setProjects(projRes.data);
      setWorkers(workerRes.data);
      setMaterials(matRes.data);
      setExpenses(expRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Dynamic metrics
  const activeProjects = projects.filter(p => p.status === 'in-progress').length;
  const totalWorkers = workers.length;
  const lowStockMaterials = materials.filter(m => (m.reorderPoint || 20) >= m.quantity).length;

  const thisMonthExpenses = expenses
    .filter(exp => {
      const date = new Date(exp.date);
      return date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear();
    })
    .reduce((sum, exp) => sum + exp.amount, 0);

  // Monthly Expenses Trend
  const monthlyExpenses = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => {
    const monthExpenses = expenses
      .filter(exp => new Date(exp.date).getMonth() === index)
      .reduce((sum, exp) => sum + exp.amount, 0);
    return { month, amount: monthExpenses };
  });

  // Project Progress
  const projectProgressData = projects.slice(0, 3).map(p => ({
    name: p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name,
    progress: p.progress || 0
  }));

  // Status Distribution
  const statusData = [
    { name: 'In Progress', value: activeProjects || 0, color: '#F59E0B' },
    { name: 'Pending', value: projects.filter(p => p.status === 'pending').length || 0, color: '#10B981' },
    { name: 'Completed', value: projects.filter(p => p.status === 'completed').length || 0, color: '#3B82F6' },
  ];

  // Recent Activity (last 5 items)
  const recentActivity = [
    ...projects.slice(0, 2).map(p => ({
      id: p._id,
      text: `New project created: ${p.name}`,
      time: '2h ago'
    })),
    ...workers.slice(0, 1).map(w => ({
      id: w._id,
      text: `Worker added: ${w.name}`,
      time: '5h ago'
    })),
    ...expenses.slice(0, 2).map(e => ({
      id: e._id,
      text: `Expense recorded: ${e.description}`,
      time: 'Yesterday'
    }))
  ].slice(0, 5);

  if (loading) return <div className="p-12 text-center text-gray-500">Loading dashboard...</div>;

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:mb-10 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-[#1E293B] sm:text-4xl">Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of Agap Construction operations</p>
        </div>
        <button className="flex w-full items-center justify-center gap-3 rounded-3xl bg-[#F59E0B] px-6 py-3.5 font-semibold text-white transition-colors hover:bg-orange-600 sm:w-auto">
          + New Project
        </button>
      </div>

      {/* Metric Cards */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:mb-12">
        <div className="rounded-3xl border border-l-4 border-gray-100 border-l-[#F59E0B] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-gray-500 text-sm">Active Projects</p>
          <p className="mt-2 text-4xl font-bold text-[#1E293B] sm:text-5xl">{activeProjects}</p>
          <p className="text-green-600 text-sm mt-6 flex items-center gap-1">+3 this month</p>
        </div>

        <div className="rounded-3xl border border-l-4 border-gray-100 border-l-[#10B981] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-gray-500 text-sm">Total Workers</p>
          <p className="mt-2 text-4xl font-bold text-[#1E293B] sm:text-5xl">{totalWorkers}</p>
          <p className="text-green-600 text-sm mt-6">41 on site today</p>
        </div>

        <div className="rounded-3xl border border-l-4 border-gray-100 border-l-[#F59E0B] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-gray-500 text-sm">Low Stock Materials</p>
          <p className="mt-2 text-4xl font-bold text-[#F59E0B] sm:text-5xl">{lowStockMaterials}</p>
          <p className="text-amber-600 text-sm mt-6">Need immediate reordering</p>
        </div>

        <div className="rounded-3xl border border-l-4 border-gray-100 border-l-[#EF4444] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-gray-500 text-sm">This Month Expenses</p>
          <p className="mt-2 break-words text-4xl font-bold text-[#1E293B] sm:text-5xl">₱{thisMonthExpenses.toLocaleString()}</p>
          <p className="text-red-500 text-sm mt-6">-12% from last month</p>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="my-10 flex items-center gap-3 sm:my-12 sm:gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        <h2 className="whitespace-nowrap text-lg font-semibold text-[#1E293B] sm:text-2xl">Analytics Overview</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-l-4 border-gray-100 border-l-[#F59E0B] bg-white p-4 shadow-sm sm:p-8">
          <h3 className="mb-6 text-lg font-semibold text-[#1E293B] sm:text-xl">Monthly Expenses Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyExpenses}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: any) => `₱${Number(value || 0).toLocaleString()}`} />
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

      {/* Recent Activity + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Recent Activity */}
        <div className="rounded-3xl border border-l-4 border-gray-100 border-l-[#F59E0B] bg-white p-5 shadow-sm sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-6 h-6 text-gray-500" />
            <h3 className="text-xl font-semibold text-[#1E293B]">Recent Activity</h3>
          </div>
          <div className="space-y-5">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex gap-4">
                <div className="w-2 h-2 bg-[#F59E0B] rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-gray-700">{activity.text}</p>
                  <p className="text-xs text-gray-400">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="rounded-3xl border border-l-4 border-gray-100 border-l-[#F59E0B] bg-white p-5 shadow-sm sm:p-8">
          <h3 className="text-xl font-semibold text-[#1E293B] mb-6">Project Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={120} dataKey="value" label>
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
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

import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const monthlyExpenses = [
  { month: 'Jan', amount: 320000 },
  { month: 'Feb', amount: 410000 },
  { month: 'Mar', amount: 280000 },
  { month: 'Apr', amount: 520000 },
  { month: 'May', amount: 487000 },
];

const projectProgress = [
  { name: 'Villa de Agap', progress: 65 },
  { name: 'Makati Commercial', progress: 15 },
  { name: 'Quezon Warehouse', progress: 40 },
];

const statusData = [
  { name: 'In Progress', value: 8, color: '#F59E0B' },
  { name: 'Pending', value: 3, color: '#10B981' },
  { name: 'Completed', value: 5, color: '#3B82F6' },
];

const Dashboard = () => {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold text-[#1E293B]">Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of Agap Construction operations</p>
        </div>
        <button className="flex items-center gap-3 bg-[#F59E0B] hover:bg-orange-600 px-6 py-3.5 rounded-3xl text-white font-semibold transition-colors">
          + New Project
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 border-l-4 border-l-[#F59E0B]">
          <p className="text-gray-500 text-sm">Active Projects</p>
          <p className="text-5xl font-bold text-[#1E293B] mt-2">14</p>
          <p className="text-green-600 text-sm mt-6 flex items-center gap-1">+3 this month</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 border-l-4 border-l-[#10B981]">
          <p className="text-gray-500 text-sm">Total Workers</p>
          <p className="text-5xl font-bold text-[#1E293B] mt-2">52</p>
          <p className="text-green-600 text-sm mt-6">41 on site today</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 border-l-4 border-l-[#F59E0B]">
          <p className="text-gray-500 text-sm">Low Stock Materials</p>
          <p className="text-5xl font-bold text-[#F59E0B] mt-2">8</p>
          <p className="text-amber-600 text-sm mt-6">Need immediate reordering</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 border-l-4 border-l-[#EF4444]">
          <p className="text-gray-500 text-sm">This Month Expenses</p>
          <p className="text-5xl font-bold text-[#1E293B] mt-2">₱487k</p>
          <p className="text-red-500 text-sm mt-6">-12% from last month</p>
        </div>
      </div>

      {/* Divider Line + Section Title */}
      <div className="flex items-center gap-4 my-12">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        <h2 className="text-2xl font-semibold text-[#1E293B] whitespace-nowrap">Analytics Overview</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Expenses Line Chart */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 border-l-4 border-l-[#F59E0B]">
          <h3 className="text-xl font-semibold text-[#1E293B] mb-6">Monthly Expenses Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyExpenses}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="amount" stroke="#F59E0B" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Project Progress Bar Chart */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 border-l-4 border-l-[#F59E0B]">
          <h3 className="text-xl font-semibold text-[#1E293B] mb-6">Project Progress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={projectProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="progress" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Pie Chart */}
      <div className="mt-8 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 border-l-4 border-l-[#F59E0B]">
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
  );
};

export default Dashboard;
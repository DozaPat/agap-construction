import Sidebar from '../components/Layout/Sidebar';

const Dashboard = () => {
  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />

      {/* Main Content */}
      <div className="ml-72 flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-2">Welcome back, Admin 👋</h1>
          <p className="text-gray-400">Here's what's happening in Agap Construction today</p>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-6 mt-10">
            <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
              <p className="text-gray-400 text-sm">Active Projects</p>
              <p className="text-5xl font-bold text-white mt-2">12</p>
            </div>
            <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
              <p className="text-gray-400 text-sm">Total Workers</p>
              <p className="text-5xl font-bold text-white mt-2">48</p>
            </div>
            <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
              <p className="text-gray-400 text-sm">Low Stock Items</p>
              <p className="text-5xl font-bold text-amber-400 mt-2">7</p>
            </div>
            <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
              <p className="text-gray-400 text-sm">This Month Expenses</p>
              <p className="text-5xl font-bold text-white mt-2">₱248k</p>
            </div>
          </div>

          <div className="mt-12">
            <h2 className="text-xl font-semibold text-white mb-6">Recent Projects</h2>
            <p className="text-gray-400">Coming soon — we'll add real data here next</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
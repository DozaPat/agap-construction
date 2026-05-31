import { Download, FileText, TrendingUp, Users, Package } from 'lucide-react';

const Reports = () => {
  const reportTypes = [
    {
      title: "Project Summary",
      description: "Progress, budget, timeline, and status of selected project",
      icon: FileText,
      color: "bg-[#F59E0B]"
    },
    {
      title: "Financial Report",
      description: "All expenses, budget vs actual, and profit summary",
      icon: TrendingUp,
      color: "bg-emerald-500"
    },
    {
      title: "Worker Payroll",
      description: "Attendance, daily wages, and labor cost breakdown",
      icon: Users,
      color: "bg-blue-500"
    },
    {
      title: "Material Usage",
      description: "Material consumption, stock levels, and reorder alerts",
      icon: Package,
      color: "bg-amber-500"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-[#1E293B]">Generate Reports</h1>
        <p className="text-gray-600 mt-1">Create and download professional reports for your projects</p>
      </div>

      {/* Project Selector */}
      <div className="bg-white rounded-3xl p-6 shadow-sm mb-10">
        <label className="block text-sm font-medium text-gray-500 mb-3">Select Project</label>
        <select className="w-full bg-[#F8FAFC] border border-gray-200 rounded-3xl py-5 px-6 focus:outline-none focus:border-[#F59E0B] text-lg">
          <option value="">Choose a project...</option>
          <option value="1">Villa de Agap - Phase 1</option>
          <option value="2">Commercial Building - Makati</option>
        </select>
      </div>

      {/* Report Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((report, index) => {
          const Icon = report.icon;
          return (
            <div key={index} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all border-l-4 border-l-[#F59E0B]">
              <div className="flex items-start gap-6">
                <div className={`w-14 h-14 ${report.color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-[#1E293B]">{report.title}</h3>
                  <p className="text-gray-600 mt-3 leading-relaxed">{report.description}</p>
                  <button className="mt-8 flex items-center gap-3 bg-[#1E293B] hover:bg-gray-800 text-white px-8 py-4 rounded-3xl font-medium transition-colors">
                    <Download className="w-5 h-5" />
                    Generate Report
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-gray-400 text-sm mt-12">
        Reports are generated in PDF format • More report types coming soon
      </p>
    </div>
  );
};

export default Reports;
import { Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';

const Tools = () => {
  const tools = [
    {
      id: 1,
      name: "Cordless Drill 18V",
      category: "Power Tool",
      quantity: 12,
      condition: "good",
      status: "available",
      project: "Villa de Agap - Phase 1"
    },
    {
      id: 2,
      name: "Angle Grinder",
      category: "Power Tool",
      quantity: 5,
      condition: "needs repair",
      status: "in-use",
      project: "Commercial Building - Makati"
    },
    {
      id: 3,
      name: "Safety Helmet",
      category: "Safety Equipment",
      quantity: 45,
      condition: "good",
      status: "available",
      project: "Villa de Agap - Phase 1"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#1E293B]">Tools Management</h1>
          <p className="text-gray-600 mt-1">Track tools, equipment, and maintenance</p>
        </div>

        <button className="flex items-center gap-3 bg-[#F59E0B] hover:bg-orange-600 px-6 py-3.5 rounded-3xl text-white font-semibold transition-colors">
          <Plus className="w-5 h-5" />
          Add Tool
        </button>
      </div>

      {/* Search + Filter */}
      <div className="bg-white rounded-3xl p-2 flex gap-3 mb-8 shadow-sm items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-6 top-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tools..."
            className="w-full bg-[#F8FAFC] border border-gray-200 rounded-3xl py-4 pl-14 pr-6 focus:outline-none focus:border-[#F59E0B]"
          />
        </div>
        <button className="px-8 bg-[#1E293B] text-white rounded-3xl flex items-center gap-2 hover:bg-gray-800">
          <Filter className="w-5 h-5" />
          Filter
        </button>
      </div>

      {/* Tools Table */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-[#1E293B]">
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Tool Name</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Category</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Quantity</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Condition</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Status</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Project</th>
              <th className="px-8 py-5 text-right text-sm font-medium text-white">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tools.map((tool) => (
              <tr key={tool.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-8 py-6 font-medium text-[#1E293B]">{tool.name}</td>
                <td className="px-8 py-6">
                  <span className="px-5 py-1.5 bg-[#F59E0B]/10 text-[#F59E0B] rounded-3xl text-sm font-medium">
                    {tool.category}
                  </span>
                </td>
                <td className="px-8 py-6 font-semibold">{tool.quantity}</td>
                <td className="px-8 py-6">
                  <span className={`px-5 py-1.5 rounded-3xl text-sm font-medium ${
                    tool.condition === 'good' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {tool.condition === 'good' ? 'Good' : 'Needs Repair'}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-5 py-1.5 rounded-3xl text-sm font-medium ${
                    tool.status === 'available' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {tool.status === 'available' ? 'Available' : 'In Use'}
                  </span>
                </td>
                <td className="px-8 py-6 text-gray-600">{tool.project}</td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-4">
                    <button className="text-blue-600 hover:text-blue-700">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button className="text-red-500 hover:text-red-600">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Tools;
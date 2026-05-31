import { Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';

const Workers = () => {
  const workers = [
    {
      id: 1,
      name: "Juan Dela Cruz",
      role: "Foreman",
      phone: "+63 977 167 9104",
      assignedProject: "Villa de Agap - Phase 1",
      status: "active"
    },
    {
      id: 2,
      name: "Maria Santos",
      role: "Carpenter",
      phone: "+63 917 157 0997",
      assignedProject: "Commercial Building - Makati",
      status: "active"
    },
    {
      id: 3,
      name: "Ramon Lopez",
      role: "Mason",
      phone: "+63 956 123 4567",
      assignedProject: "Villa de Agap - Phase 1",
      status: "inactive"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#1E293B]">Workers</h1>
          <p className="text-gray-600 mt-1">Manage your construction team</p>
        </div>

        <button className="flex items-center gap-3 bg-[#F59E0B] hover:bg-orange-600 px-6 py-3.5 rounded-3xl text-white font-semibold transition-colors">
          <Plus className="w-5 h-5" />
          Add Worker
        </button>
      </div>

      {/* Total Workers Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 border-l-4 border-l-[#F59E0B] mb-10 max-w-xs">
        <p className="text-gray-500 text-sm">Total Workers</p>
        <p className="text-5xl font-bold text-[#1E293B] mt-2">52</p>
        <p className="text-green-600 text-sm mt-4">41 currently on site</p>
      </div>

      {/* Search + Filter */}
      <div className="bg-white rounded-3xl p-2 flex gap-3 mb-8 shadow-sm items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-6 top-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search workers..."
            className="w-full bg-[#F8FAFC] border border-gray-200 rounded-3xl py-4 pl-14 pr-6 focus:outline-none focus:border-[#F59E0B]"
          />
        </div>
        <button className="px-8 bg-[#1E293B] text-white rounded-3xl flex items-center gap-2 hover:bg-gray-800">
          <Filter className="w-5 h-5" />
          Filter
        </button>
      </div>

      {/* Table */}
      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-[#1E293B]">
              <th className="px-8 py-5 text-left text-sm font-medium text-white">#</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Name</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Role</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Phone Number</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Assigned Project</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Status</th>
              <th className="px-8 py-5 text-right text-sm font-medium text-white">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {workers.map((worker) => (
              <tr key={worker.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-8 py-6 font-medium text-gray-400">{worker.id}</td>
                <td className="px-8 py-6 font-semibold text-[#1E293B]">{worker.name}</td>
                <td className="px-8 py-6">
                  <span className="px-5 py-1.5 bg-[#F59E0B]/10 text-[#F59E0B] rounded-3xl text-sm font-medium">
                    {worker.role}
                  </span>
                </td>
                <td className="px-8 py-6 text-gray-600">{worker.phone}</td>
                <td className="px-8 py-6 text-gray-600">{worker.assignedProject}</td>
                <td className="px-8 py-6">
                  <span className={`px-5 py-1.5 rounded-3xl text-sm font-medium ${
                    worker.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {worker.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
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

export default Workers;
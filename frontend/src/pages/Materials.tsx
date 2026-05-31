import { Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';

const Materials = () => {
  const materials = [
    {
      id: 1,
      name: "Portland Cement",
      quantity: 450,
      unit: "bags",
      unitPrice: 280,
      project: "Villa de Agap - Phase 1",
      supplier: "Holcim Philippines"
    },
    {
      id: 2,
      name: "Deformed Bar 10mm",
      quantity: 1200,
      unit: "kg",
      unitPrice: 85,
      project: "Commercial Building - Makati",
      supplier: "SteelAsia"
    },
    {
      id: 3,
      name: "Fine Sand",
      quantity: 85,
      unit: "tons",
      unitPrice: 1200,
      project: "Villa de Agap - Phase 1",
      supplier: "Local Supplier"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#1E293B]">Materials Management</h1>
          <p className="text-gray-600 mt-1">Track inventory and material usage per project</p>
        </div>

        <button className="flex items-center gap-3 bg-[#F59E0B] hover:bg-orange-600 px-6 py-3.5 rounded-3xl text-white font-semibold transition-colors">
          <Plus className="w-5 h-5" />
          Add Material
        </button>
      </div>



      {/* Search + Filter */}
      <div className="bg-white rounded-3xl p-2 flex gap-3 mb-8 shadow-sm items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-6 top-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search materials..."
            className="w-full bg-[#F8FAFC] border border-gray-200 rounded-3xl py-4 pl-14 pr-6 focus:outline-none focus:border-[#F59E0B]"
          />
        </div>
        <button className="px-8 bg-[#1E293B] text-white rounded-3xl flex items-center gap-2 hover:bg-gray-800">
          <Filter className="w-5 h-5" />
          Filter
        </button>
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-[#1E293B]">
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Material</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Quantity</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Unit</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Unit Cost</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Project</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Supplier</th>
              <th className="px-8 py-5 text-right text-sm font-medium text-white">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {materials.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-8 py-6 font-medium text-[#1E293B]">{item.name}</td>
                <td className="px-8 py-6 font-semibold">{item.quantity}</td>
                <td className="px-8 py-6 text-gray-600">{item.unit}</td>
                <td className="px-8 py-6 font-medium">₱{item.unitPrice}</td>
                <td className="px-8 py-6 text-gray-600">{item.project}</td>
                <td className="px-8 py-6 text-gray-600">{item.supplier}</td>
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

export default Materials;
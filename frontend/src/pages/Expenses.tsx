import { Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';

const Expenses = () => {
  const expenses = [
    {
      id: 1,
      date: "2025-05-30",
      description: "Cement purchase for foundation",
      category: "Material",
      amount: 45000,
      project: "Villa de Agap - Phase 1"
    },
    {
      id: 2,
      date: "2025-05-29",
      description: "Worker daily wages - 8 masons",
      category: "Labor",
      amount: 9600,
      project: "Villa de Agap - Phase 1"
    },
    {
      id: 3,
      date: "2025-05-28",
      description: "Angle grinder repair",
      category: "Tool",
      amount: 2500,
      project: "Commercial Building - Makati"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#1E293B]">Expenses</h1>
          <p className="text-gray-600 mt-1">Track all project and operational expenses</p>
        </div>

        <button className="flex items-center gap-3 bg-[#F59E0B] hover:bg-orange-600 px-6 py-3.5 rounded-3xl text-white font-semibold transition-colors">
          <Plus className="w-5 h-5" />
          Add Expense
        </button>
      </div>

      {/* Search + Filter */}
      <div className="bg-white rounded-3xl p-2 flex gap-3 mb-8 shadow-sm items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-6 top-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            className="w-full bg-[#F8FAFC] border border-gray-200 rounded-3xl py-4 pl-14 pr-6 focus:outline-none focus:border-[#F59E0B]"
          />
        </div>
        <button className="px-8 bg-[#1E293B] text-white rounded-3xl flex items-center gap-2 hover:bg-gray-800">
          <Filter className="w-5 h-5" />
          Filter
        </button>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-[#1E293B]">
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Date</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Description</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Category</th>
              <th className="px-8 py-5 text-right text-sm font-medium text-white">Amount</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Project</th>
              <th className="px-8 py-5 text-right text-sm font-medium text-white">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {expenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-8 py-6 text-gray-600">{expense.date}</td>
                <td className="px-8 py-6 font-medium text-[#1E293B]">{expense.description}</td>
                <td className="px-8 py-6">
                  <span className="px-5 py-1.5 bg-[#F59E0B]/10 text-[#F59E0B] rounded-3xl text-sm font-medium">
                    {expense.category}
                  </span>
                </td>
                <td className="px-8 py-6 text-right font-semibold text-red-600">
                  -₱{expense.amount.toLocaleString()}
                </td>
                <td className="px-8 py-6 text-gray-600">{expense.project}</td>
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

export default Expenses;
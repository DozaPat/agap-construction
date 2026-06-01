import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Link } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const Expenses = () => {
  const { isAdmin } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');

  const [formData, setFormData] = useState({
    date: '',
    description: '',
    category: '',
    amount: '',
    project: '',
  });

  // Material Linker
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);

  const fetchData = async () => {
    try {
      const [expensesRes, projectsRes, materialsRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/projects'),
        api.get('/materials')
      ]);
      setExpenses(expensesRes.data);
      setProjects(projectsRes.data);
      setMaterials(materialsRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = projectFilter === 'all' || 
      (expense.project && expense.project._id === projectFilter);
    return matchesSearch && matchesProject;
  });

  const openEdit = (expense: any) => {
    setSelectedExpense(expense);
    setFormData({
      date: expense.date ? expense.date.split('T')[0] : '',
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      project: expense.project?._id || '',
    });
    setIsEditOpen(true);
  };

  const linkMaterial = (material: any) => {
    const calculatedAmount = material.quantity * material.unitPrice;
    setFormData({
      ...formData,
      description: `${material.name} purchase`,
      category: 'Material',
      amount: calculatedAmount.toString(),
      project: material.project?._id || formData.project,
    });
    setShowMaterialPicker(false);
  };

  const handleSubmit = async (e: React.FormEvent, isEdit = false) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        project: formData.project || undefined,
      };

      if (isEdit && selectedExpense) {
        await api.put(`/expenses/${selectedExpense._id}`, payload);
        alert('✅ Expense updated successfully!');
        setIsEditOpen(false);
      } else {
        await api.post('/expenses', payload);
        alert('✅ Expense created successfully!');
        setIsCreateOpen(false);
      }

      setFormData({ date: '', description: '', category: '', amount: '', project: '' });
      fetchData();
    } catch (error: any) {
      alert('❌ ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin || !window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      alert('✅ Expense deleted');
      fetchData();
    } catch (error) {
      alert('❌ Delete failed');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading expenses...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#1E293B]">Expenses</h1>
          <p className="text-gray-600 mt-1">Track all project and operational expenses</p>
        </div>

        {isAdmin && (
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-3 bg-[#F59E0B] hover:bg-orange-600 px-6 py-3.5 rounded-3xl text-white font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </button>
        )}
      </div>

      {/* Search + Project Filter */}
      <div className="bg-white rounded-3xl p-2 flex gap-3 mb-8 shadow-sm items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-6 top-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-gray-200 rounded-3xl py-4 pl-14 pr-6 focus:outline-none focus:border-[#F59E0B]"
          />
        </div>

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-8 bg-[#1E293B] text-white rounded-3xl focus:outline-none"
        >
          <option value="all">All Projects</option>
          {projects.map((p: any) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
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
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-8 py-12 text-center text-gray-400">
                  No expenses found.
                </td>
              </tr>
            ) : (
              filteredExpenses.map((expense: any) => (
                <tr key={expense._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-6 text-gray-600">
                    {new Date(expense.date).toLocaleDateString('en-PH')}
                  </td>
                  <td className="px-8 py-6 font-medium text-[#1E293B]">{expense.description}</td>
                  <td className="px-8 py-6">
                    <span className="px-5 py-1.5 bg-[#F59E0B]/10 text-[#F59E0B] rounded-3xl text-sm font-medium">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right font-semibold text-red-600">
                    -₱{expense.amount.toLocaleString()}
                  </td>
                  <td className="px-8 py-6 text-gray-600">
                    {expense.project?.name || 'Not Assigned'}
                  </td>
                  <td className="px-8 py-6 text-right">
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-4">
                        <button onClick={() => openEdit(expense)} className="text-blue-600 hover:text-blue-700">
                          <Edit className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDelete(expense._id)} className="text-red-500 hover:text-red-600">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ==================== ADD / EDIT EXPENSE MODAL ==================== */}
      {(isCreateOpen || isEditOpen) && isAdmin && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl mx-4 overflow-hidden">
            <div className="px-8 pt-8 pb-6 border-b">
              <h2 className="text-3xl font-bold text-[#1E293B]">
                {isEditOpen ? 'Edit Expense' : 'Add New Expense'}
              </h2>
            </div>

            <form onSubmit={(e) => handleSubmit(e, isEditOpen)} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Category</label>
                  <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} required className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]">
                    <option value="">Select Category</option>
                    <option value="Labor">Labor</option>
                    <option value="Material">Material</option>
                    <option value="Tool">Tool</option>
                    <option value="Equipment Rental">Equipment Rental</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Permits & Fees">Permits & Fees</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Description</label>
                  <input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Amount (₱)</label>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Project</label>
                  <select value={formData.project} onChange={(e) => setFormData({...formData, project: e.target.value})} className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]">
                    <option value="">General / Not Assigned</option>
                    {projects.map((p: any) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LINK MATERIAL BUTTON */}
              {!isEditOpen && (
                <button
                  type="button"
                  onClick={() => setShowMaterialPicker(true)}
                  className="w-full flex items-center justify-center gap-3 border border-dashed border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/5 py-4 rounded-3xl font-medium transition-colors"
                >
                  <Link className="w-5 h-5" />
                  🔗 Link Material from Inventory
                </button>
              )}

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="flex-1 py-4 text-gray-600 hover:bg-gray-100 rounded-3xl font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-[#F59E0B] hover:bg-orange-600 py-4 text-white font-semibold rounded-3xl">
                  {isEditOpen ? 'Update Expense' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MATERIAL PICKER MODAL */}
      {showMaterialPicker && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-3xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-8 pt-8 pb-6 border-b">
              <h3 className="text-2xl font-bold text-[#1E293B]">Select Material</h3>
            </div>
            <div className="max-h-96 overflow-auto p-4">
              {materials.map((mat: any) => (
                <div
                  key={mat._id}
                  onClick={() => linkMaterial(mat)}
                  className="flex justify-between items-center px-6 py-4 hover:bg-gray-50 rounded-2xl cursor-pointer mb-2 border border-transparent hover:border-[#F59E0B]/30"
                >
                  <div>
                    <p className="font-medium">{mat.name}</p>
                    <p className="text-sm text-gray-500">{mat.quantity} {mat.unit} • ₱{mat.unitPrice}</p>
                  </div>
                  <span className="text-[#F59E0B] font-medium">Use</span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t">
              <button onClick={() => setShowMaterialPicker(false)} className="w-full py-4 text-gray-600 hover:bg-gray-100 rounded-3xl">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
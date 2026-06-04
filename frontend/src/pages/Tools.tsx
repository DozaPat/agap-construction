import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const Tools = () => {
  const { isAdmin } = useAuth();
  const [tools, setTools] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<any>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '',
    condition: 'good',
    status: 'available',
    project: '',
  });

  // Success Modal
  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null);

  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [toolsRes, projectsRes] = await Promise.all([
        api.get('/tools'),
        api.get('/projects')
      ]);
      setTools(toolsRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter logic
  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = projectFilter === 'all' || 
      (tool.project && tool.project._id === projectFilter);
    return matchesSearch && matchesProject;
  });

  const openEdit = (tool: any) => {
    setSelectedTool(tool);
    setFormData({
      name: tool.name,
      category: tool.category || '',
      quantity: tool.quantity || '',
      condition: tool.condition || 'good',
      status: tool.status || 'available',
      project: tool.project?._id || '',
    });
    setIsEditOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent, isEdit = false) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      const payload = {
        ...formData,
        quantity: Number(formData.quantity),
        project: formData.project || undefined,
      };

      if (isEdit && selectedTool) {
        await api.put(`/tools/${selectedTool._id}`, payload);
        setSuccessModal({ title: 'Tool Updated', message: 'Tool updated successfully!' });
        setIsEditOpen(false);
      } else {
        await api.post('/tools', payload);
        setSuccessModal({ title: 'Tool Created', message: 'Tool created successfully!' });
        setIsCreateOpen(false);
      }

      setFormData({ name: '', category: '', quantity: '', condition: 'good', status: 'available', project: '' });
      fetchData();
    } catch (error: any) {
      alert('❌ ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal(id);
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    try {
      await api.delete(`/tools/${deleteModal}`);
      setSuccessModal({ title: 'Tool Deleted', message: 'Tool deleted successfully!' });
      fetchData();
    } catch (error) {
      alert('❌ Delete failed');
    } finally {
      setDeleteModal(null);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading tools...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#1E293B]">Tools Management</h1>
          <p className="text-gray-600 mt-1">Track tools, equipment, and maintenance</p>
        </div>

        {isAdmin && (
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-3 bg-[#F59E0B] hover:bg-orange-600 px-6 py-3.5 rounded-3xl text-white font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Tool
          </button>
        )}
      </div>

      {/* Search + Project Filter */}
      <div className="bg-white rounded-3xl p-2 flex gap-3 mb-8 shadow-sm items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-6 top-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tools..."
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
            {filteredTools.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-8 py-12 text-center text-gray-400">
                  No tools found.
                </td>
              </tr>
            ) : (
              filteredTools.map((tool: any) => (
                <tr key={tool._id} className="hover:bg-gray-50 transition-colors">
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
                  <td className="px-8 py-6 text-gray-600">
                    {tool.project?.name || 'Not Assigned'}
                  </td>
                  <td className="px-8 py-6 text-right">
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-4">
                        <button onClick={() => openEdit(tool)} className="text-blue-600 hover:text-blue-700">
                          <Edit className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDeleteClick(tool._id)} className="text-red-500 hover:text-red-600">
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

      {/* ==================== ADD / EDIT MODAL ==================== */}
      {(isCreateOpen || isEditOpen) && isAdmin && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl mx-4 overflow-hidden">
            <div className="px-8 pt-8 pb-6 border-b">
              <h2 className="text-3xl font-bold text-[#1E293B]">
                {isEditOpen ? 'Edit Tool' : 'Add New Tool'}
              </h2>
            </div>

            <form onSubmit={(e) => handleSubmit(e, isEditOpen)} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Tool Name</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    required 
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Category</label>
                  <select 
                    value={formData.category} 
                    onChange={(e) => setFormData({...formData, category: e.target.value})} 
                    required 
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                  >
                    <option value="">Select Category</option>
                    <option value="Power Tool">Power Tool</option>
                    <option value="Hand Tool">Hand Tool</option>
                    <option value="Safety Equipment">Safety Equipment</option>
                    <option value="Measuring Tool">Measuring Tool</option>
                    <option value="Cutting Tool">Cutting Tool</option>
                    <option value="Welding Tool">Welding Tool</option>
                    <option value="Plumbing Tool">Plumbing Tool</option>
                    <option value="Electrical Tool">Electrical Tool</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Quantity</label>
                  <input 
                    type="number" 
                    value={formData.quantity} 
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})} 
                    required 
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Condition</label>
                  <select 
                    value={formData.condition} 
                    onChange={(e) => setFormData({...formData, condition: e.target.value})} 
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                  >
                    <option value="good">Good</option>
                    <option value="needs repair">Needs Repair</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Status</label>
                  <select 
                    value={formData.status} 
                    onChange={(e) => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                  >
                    <option value="available">Available</option>
                    <option value="in-use">In Use</option>
                    <option value="under-maintenance">Under Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Project (Optional)</label>
                  <select 
                    value={formData.project} 
                    onChange={(e) => setFormData({...formData, project: e.target.value})} 
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                  >
                    <option value="">Not Assigned</option>
                    {projects.map((p: any) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  type="button" 
                  onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} 
                  className="flex-1 py-4 text-gray-600 hover:bg-gray-100 rounded-3xl font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-[#F59E0B] hover:bg-orange-600 py-4 text-white font-semibold rounded-3xl"
                >
                  {isEditOpen ? 'Update Tool' : 'Add Tool'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-2xl flex items-center justify-center">
              <span className="text-4xl">✅</span>
            </div>
            <h3 className="text-2xl font-semibold text-[#1E293B] mb-2">{successModal.title}</h3>
            <p className="text-gray-600 mb-8">{successModal.message}</p>
            <button 
              onClick={() => setSuccessModal(null)}
              className="w-full bg-[#F59E0B] hover:bg-orange-600 py-4 text-white font-semibold rounded-3xl text-lg"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 p-8 text-center">
            <h3 className="text-xl font-semibold text-[#1E293B] mb-4">Delete this tool?</h3>
            <p className="text-gray-600 mb-8">This action cannot be undone.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteModal(null)}
                className="flex-1 py-4 text-gray-600 font-medium border border-gray-200 rounded-3xl"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 py-4 text-white font-semibold rounded-3xl"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tools;
import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const Workers = () => {
  const { isAdmin } = useAuth();
  const [workers, setWorkers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all'); // 'all' or project _id

  const [formData, setFormData] = useState({
    name: '',
    position: '',
    phone: '',
    dailySalary: '',
    status: 'active',
    assignedProject: '',
  });

  // Success Modal
  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null);

  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [workersRes, projectsRes] = await Promise.all([
        api.get('/workers'),
        api.get('/projects')
      ]);
      setWorkers(workersRes.data);
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

  const totalWorkers = workers.length;
  const activeWorkers = workers.filter(w => w.status === 'active').length;

  // Filter by project
  const filteredWorkers = workers.filter(worker => {
    const matchesSearch = worker.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = projectFilter === 'all' || 
      (worker.assignedProjects && worker.assignedProjects.some((p: any) => p._id === projectFilter));
    return matchesSearch && matchesProject;
  });

  const openEdit = (worker: any) => {
    setSelectedWorker(worker);
    setFormData({
      name: worker.name,
      position: worker.position,
      phone: worker.phone,
      dailySalary: worker.dailySalary || '',
      status: worker.status,
      assignedProject: worker.assignedProjects?.[0]?._id || '',
    });
    setIsEditOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent, isEdit = false) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      const payload = {
        ...formData,
        dailySalary: Number(formData.dailySalary),
        assignedProjects: formData.assignedProject ? [formData.assignedProject] : [],
      };

      if (isEdit && selectedWorker) {
        await api.put(`/workers/${selectedWorker._id}`, payload);
        setSuccessModal({ title: 'Worker Updated', message: 'Worker updated successfully!' });
        setIsEditOpen(false);
      } else {
        await api.post('/workers', payload);
        setSuccessModal({ title: 'Worker Created', message: 'Worker created successfully!' });
        setIsCreateOpen(false);
      }

      setFormData({ name: '', position: '', phone: '', dailySalary: '', status: 'active', assignedProject: '' });
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
      await api.delete(`/workers/${deleteModal}`);
      setSuccessModal({ title: 'Worker Deleted', message: 'Worker deleted successfully!' });
      fetchData();
    } catch (error) {
      alert('❌ Delete failed');
    } finally {
      setDeleteModal(null);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading workers...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#1E293B]">Workers</h1>
          <p className="text-gray-600 mt-1">Manage your construction team</p>
        </div>

        {isAdmin && (
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-3 bg-[#F59E0B] hover:bg-orange-600 px-6 py-3.5 rounded-3xl text-white font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Worker
          </button>
        )}
      </div>

      {/* Total Workers Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 border-l-4 border-l-[#F59E0B] mb-10 max-w-xs">
        <p className="text-gray-500 text-sm">Total Workers</p>
        <p className="text-5xl font-bold text-[#1E293B] mt-2">{totalWorkers}</p>
        <p className="text-green-600 text-sm mt-4">{activeWorkers} currently on site</p>
      </div>

      {/* Search + Project Filter */}
      <div className="bg-white rounded-3xl p-2 flex gap-3 mb-8 shadow-sm items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-6 top-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search workers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-gray-200 rounded-3xl py-4 pl-14 pr-6 focus:outline-none focus:border-[#F59E0B]"
          />
        </div>

        {/* Project Filter */}
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
              <th className="px-8 py-5 text-left text-sm font-medium text-white">#</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Name</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Role</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Phone Number</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Daily Salary</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Assigned Project</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Status</th>
              <th className="px-8 py-5 text-right text-sm font-medium text-white">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredWorkers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-8 py-12 text-center text-gray-400">
                  No workers found.
                </td>
              </tr>
            ) : (
              filteredWorkers.map((worker: any, index: number) => (
                <tr key={worker._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-6 font-medium text-gray-400">{index + 1}</td>
                  <td className="px-8 py-6 font-semibold text-[#1E293B]">{worker.name}</td>
                  <td className="px-8 py-6">
                    <span className="px-5 py-1.5 bg-[#F59E0B]/10 text-[#F59E0B] rounded-3xl text-sm font-medium">
                      {worker.position}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-gray-600">{worker.phone}</td>
                  <td className="px-8 py-6 font-medium text-[#1E293B]">₱{worker.dailySalary?.toLocaleString()}</td>
                  <td className="px-8 py-6 text-gray-600">
                    {worker.assignedProjects && worker.assignedProjects.length > 0
                      ? worker.assignedProjects[0].name
                      : 'Not Assigned'}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-5 py-1.5 rounded-3xl text-sm font-medium ${
                      worker.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {worker.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-4">
                        <button onClick={() => openEdit(worker)} className="text-blue-600 hover:text-blue-700">
                          <Edit className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDeleteClick(worker._id)} className="text-red-500 hover:text-red-600">
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
                {isEditOpen ? 'Edit Worker' : 'Add New Worker'}
              </h2>
            </div>

            <form onSubmit={(e) => handleSubmit(e, isEditOpen)} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    required 
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Position</label>
                  <select 
                    value={formData.position} 
                    onChange={(e) => setFormData({...formData, position: e.target.value})} 
                    required 
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                  >
                    <option value="">Select Position</option>
                    <option value="Mason">Mason</option>
                    <option value="Carpenter">Carpenter</option>
                    <option value="Welder">Welder</option>
                    <option value="Electrician">Electrician</option>
                    <option value="Plumber">Plumber</option>
                    <option value="Painter">Painter</option>
                    <option value="Laborer">Laborer</option>
                    <option value="Foreman">Foreman</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Phone Number</label>
                  <input 
                    type="text" 
                    value={formData.phone} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                    required 
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Daily Salary (₱)</label>
                  <input 
                    type="number" 
                    value={formData.dailySalary} 
                    onChange={(e) => setFormData({...formData, dailySalary: e.target.value})} 
                    required 
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Assign to Project</label>
                  <select 
                    value={formData.assignedProject} 
                    onChange={(e) => setFormData({...formData, assignedProject: e.target.value})} 
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                  >
                    <option value="">Not Assigned</option>
                    {projects.map((p: any) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Status</label>
                  <select 
                    value={formData.status} 
                    onChange={(e) => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* ==================== ATTENDANCE SHEET PREVIEW ==================== */}
              {formData.assignedProject && (
                <div className="border border-gray-200 rounded-3xl p-6 mt-4">
                  <h4 className="font-medium text-gray-700 mb-4">Attendance Sheet Preview - Assigned Workers</h4>
                  <div className="text-sm text-gray-500">
                    {projects.find(p => p._id === formData.assignedProject)?.name}
                  </div>
                  <div className="mt-3 text-xs text-gray-400">
                    (Workers already assigned to this project will appear here in full version)
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="flex-1 py-4 text-gray-600 hover:bg-gray-100 rounded-3xl font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-[#F59E0B] hover:bg-orange-600 py-4 text-white font-semibold rounded-3xl">
                  {isEditOpen ? 'Update Worker' : 'Add Worker'}
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
            <h3 className="text-xl font-semibold text-[#1E293B] mb-4">Delete this worker?</h3>
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

export default Workers;
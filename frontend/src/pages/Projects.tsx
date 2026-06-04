import { useState, useEffect } from 'react';
import { Plus, Search, Edit, MapPin, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const Projects = () => {
  const { user, isAdmin } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    budget: '',
    status: 'pending',
    progress: 0,
  });

  // Toast / Success Modal
  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null);

  // Delete Confirmation
  const [deleteModal, setDeleteModal] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/projects');
      const sorted = data.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setProjects(sorted);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openDetails = (project: any) => {
    setSelectedProject(project);
    setIsDetailsOpen(true);
  };

  const openEdit = (project: any) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      location: project.location,
      startDate: project.startDate.split('T')[0],
      endDate: project.endDate ? project.endDate.split('T')[0] : '',
      budget: project.budget,
      status: project.status,
      progress: project.progress || 0,
    });
    setIsEditOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent, isEdit = false) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      const payload = {
        ...formData,
        budget: Number(formData.budget),
        progress: Number(formData.progress),
        manager: user?._id,
      };

      if (isEdit && selectedProject) {
        await api.put(`/projects/${selectedProject._id}`, payload);
        setSuccessModal({ title: 'Project Updated', message: 'Project updated successfully!' });
        setIsEditOpen(false);
      } else {
        await api.post('/projects', payload);
        setSuccessModal({ title: 'Project Created', message: 'Project created successfully!' });
        setIsCreateOpen(false);
      }

      setFormData({ name: '', description: '', location: '', startDate: '', endDate: '', budget: '', status: 'pending', progress: 0 });
      fetchProjects();
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
      await api.delete(`/projects/${deleteModal}`);
      setSuccessModal({ title: 'Project Deleted', message: 'Project deleted successfully!' });
      fetchProjects();
    } catch (error) {
      alert('❌ Delete failed');
    } finally {
      setDeleteModal(null);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading projects...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#1E293B]">Projects</h1>
          <p className="text-gray-600 mt-1">Manage all ongoing and upcoming construction projects</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-3 bg-[#F59E0B] hover:bg-orange-600 px-6 py-3.5 rounded-3xl text-white font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Project
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 border-l-4 border-l-[#F59E0B]">
          <p className="text-gray-500 text-sm">Total Projects</p>
          <p className="text-5xl font-bold text-[#1E293B] mt-2">{projects.length}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 border-l-4 border-l-[#10B981]">
          <p className="text-gray-500 text-sm">Active Projects</p>
          <p className="text-5xl font-bold text-[#1E293B] mt-2">{projects.filter(p => p.status === 'in-progress').length}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 border-l-4 border-l-[#F59E0B]">
          <p className="text-gray-500 text-sm">Pending</p>
          <p className="text-5xl font-bold text-[#F59E0B] mt-2">{projects.filter(p => p.status === 'pending').length}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 border-l-4 border-l-[#EF4444]">
          <p className="text-gray-500 text-sm">Completed</p>
          <p className="text-5xl font-bold text-[#1E293B] mt-2">{projects.filter(p => p.status === 'completed').length}</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="bg-white rounded-3xl p-2 flex gap-3 mb-8 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-6 top-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-gray-200 rounded-3xl py-4 pl-14 pr-6 focus:outline-none focus:border-[#F59E0B]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-8 bg-[#1E293B] text-white rounded-3xl focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="delayed">Delayed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Projects Cards */}
      <div className="space-y-6">
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-gray-400">No projects found.</div>
        ) : (
          filteredProjects.map((project: any) => (
            <div
              key={project._id}
              onClick={() => openDetails(project)}
              className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 border-l-4 border-l-[#F59E0B] hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-semibold text-[#1E293B]">{project.name}</h3>
                  <div className="flex items-center gap-2 text-gray-500 mt-3">
                    <MapPin className="w-4 h-4" />
                    <span>{project.location}</span>
                  </div>
                </div>

                <span className={`px-6 py-2 rounded-3xl text-sm font-medium ${
                  project.status === 'in-progress' ? 'bg-green-100 text-green-700' : 
                  project.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {project.status.toUpperCase()}
                </span>
              </div>

              <div className="mt-8">
                <div className="flex justify-between text-sm mb-3">
                  <span className="font-medium text-gray-600">Progress</span>
                  <span className="font-bold text-[#1E293B]">{project.progress}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-3 bg-[#F59E0B] rounded-full transition-all" style={{ width: `${project.progress}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-8 mt-10">
                <div>
                  <p className="text-xs text-gray-500">Budget</p>
                  <p className="text-2xl font-bold text-[#1E293B]">₱{project.budget?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Start Date</p>
                  <p className="font-medium text-[#1E293B]">{new Date(project.startDate).toLocaleDateString('en-PH')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">End Date</p>
                  <p className="font-medium text-[#1E293B]">
                    {project.endDate ? new Date(project.endDate).toLocaleDateString('en-PH') : '—'}
                  </p>
                </div>
              </div>

              {isAdmin && (
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(project)} className="text-blue-600 hover:text-blue-700">
                    <Edit className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDeleteClick(project._id)} className="text-red-500 hover:text-red-600">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create & Edit Modal */}
      {(isCreateOpen || isEditOpen) && isAdmin && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-3xl font-semibold text-[#1E293B]">
                {isEditOpen ? 'Edit Project' : 'Create New Project'}
              </h2>
              <button
                onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => handleSubmit(e, isEditOpen)} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Project Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Budget (₱)</label>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    required
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Progress (%)</label>
                  <input
                    type="number"
                    name="progress"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                    min="0"
                    max="100"
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="delayed">Delayed</option>
                    <option value="cancelled">Cancelled</option>
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
                  {isEditOpen ? 'Update Project' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {isDetailsOpen && selectedProject && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg mx-4 p-8">
            <h2 className="text-3xl font-bold text-[#1E293B] mb-6">{selectedProject.name}</h2>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <p className="text-lg">{selectedProject.location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Budget</p>
                <p className="text-3xl font-bold">₱{selectedProject.budget?.toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p>{new Date(selectedProject.startDate).toLocaleDateString('en-PH')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">End Date</p>
                  <p>{selectedProject.endDate ? new Date(selectedProject.endDate).toLocaleDateString('en-PH') : '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Progress</p>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden mt-2">
                  <div className="h-3 bg-[#F59E0B] rounded-full" style={{ width: `${selectedProject.progress}%` }} />
                </div>
                <p className="text-right mt-1 text-sm font-medium">{selectedProject.progress}%</p>
              </div>
              {selectedProject.description && (
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="text-gray-700">{selectedProject.description}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsDetailsOpen(false)}
              className="mt-10 w-full py-4 bg-gray-100 hover:bg-gray-200 rounded-3xl font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
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

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 p-8 text-center">
            <h3 className="text-xl font-semibold text-[#1E293B] mb-4">Delete this project permanently?</h3>
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

export default Projects;
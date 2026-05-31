import { Plus, Search, Filter, MapPin } from 'lucide-react';

const Projects = () => {
  const projects = [
    {
      id: 1,
      name: "Villa de Agap - Phase 1",
      location: "Quezon City, Philippines",
      status: "in-progress",
      progress: 65,
      budget: 1250000,
      startDate: "2025-03-15",
      endDate: "2025-09-30"
    },
    {
      id: 2,
      name: "Commercial Building - Makati",
      location: "Makati City, Philippines",
      status: "pending",
      progress: 15,
      budget: 3200000,
      startDate: "2025-06-01",
      endDate: "2026-02-28"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#1E293B]">Projects</h1>
          <p className="text-gray-600 mt-1">Manage all ongoing and upcoming construction projects</p>
        </div>

        <button className="flex items-center gap-3 bg-[#F59E0B] hover:bg-orange-600 px-6 py-3.5 rounded-3xl text-white font-semibold transition-colors">
          <Plus className="w-5 h-5" />
          New Project
        </button>
      </div>

      {/* Total Projects Mini Section (like Dashboard cards) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 border-l-4 border-l-[#F59E0B]">
          <p className="text-gray-500 text-sm">Total Projects</p>
          <p className="text-5xl font-bold text-[#1E293B] mt-2">12</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 border-l-4 border-l-[#10B981]">
          <p className="text-gray-500 text-sm">Active Projects</p>
          <p className="text-5xl font-bold text-[#1E293B] mt-2">8</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 border-l-4 border-l-[#F59E0B]">
          <p className="text-gray-500 text-sm">Pending</p>
          <p className="text-5xl font-bold text-[#F59E0B] mt-2">3</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 border-l-4 border-l-[#EF4444]">
          <p className="text-gray-500 text-sm">Completed</p>
          <p className="text-5xl font-bold text-[#1E293B] mt-2">1</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="bg-white rounded-3xl p-2 flex gap-3 mb-8 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-6 top-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            className="w-full bg-[#F8FAFC] border border-gray-200 rounded-3xl py-4 pl-14 pr-6 focus:outline-none focus:border-[#F59E0B]"
          />
        </div>
        <button className="px-8 bg-[#1E293B] text-white rounded-3xl flex items-center gap-2 hover:bg-gray-800">
          <Filter className="w-5 h-5" />
          Filter
        </button>
      </div>

      {/* Projects Cards */}
      <div className="space-y-6">
        {projects.map((project) => (
          <div 
            key={project.id} 
            className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 border-l-4 border-l-[#F59E0B] hover:shadow-md transition-shadow"
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
                project.status === 'in-progress' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {project.status === 'in-progress' ? 'In Progress' : 'Pending'}
              </span>
            </div>

            {/* Progress */}
            <div className="mt-8">
              <div className="flex justify-between text-sm mb-3">
                <span className="font-medium text-gray-600">Progress</span>
                <span className="font-bold text-[#1E293B]">{project.progress}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-3 bg-[#F59E0B] rounded-full transition-all"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8 mt-10">
              <div>
                <p className="text-xs text-gray-500">Budget</p>
                <p className="text-2xl font-bold text-[#1E293B]">₱{project.budget.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="font-medium text-[#1E293B]">{project.startDate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">End Date</p>
                <p className="font-medium text-[#1E293B]">{project.endDate}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Projects;
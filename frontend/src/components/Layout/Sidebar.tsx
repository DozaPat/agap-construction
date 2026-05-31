import { Link, useLocation } from 'react-router-dom';
import { FolderOpen, Users, Package, Wrench, Receipt, FileText, LogOut } from 'lucide-react';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: FolderOpen },
  { path: '/projects', label: 'Projects', icon: FolderOpen },
  { path: '/workers', label: 'Workers', icon: Users },
  { path: '/materials', label: 'Materials', icon: Package },
  { path: '/tools', label: 'Tools', icon: Wrench },
  { path: '/expenses', label: 'Expenses', icon: Receipt },
  { path: '/reports', label: 'Generate Reports', icon: FileText },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <div className="w-64 bg-[#1E293B] h-screen fixed left-0 top-0 flex flex-col shadow-2xl">

      {/* HEADER - Logo */}
      <div className="pt-8 pb-6 px-8 border-b border-white/10 flex flex-col items-center">
        <div className="w-20 h-20 bg-white rounded-full p-2 shadow-inner">
          <img 
            src="/logo.png" 
            alt="Agap Logo" 
            className="w-full h-full object-contain rounded-full"
          />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight mt-4">AGAP</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-base font-medium transition-all ${
                isActive
                  ? 'bg-[#F59E0B] text-[#1E293B]'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* FOOTER */}
      <div className="mt-auto border-t border-white/10 p-6 text-center space-y-1">
        <p className="text-white font-semibold text-lg tracking-wider">AGAP COMPANY</p>
        <p className="text-[#F59E0B] text-sm">Architect Gacad and Partners</p>
        <p className="text-gray-400 text-xs pt-4">Construction Management System</p>
      </div>

      {/* Logout */}
      <div className="px-6 pb-8">
        <button 
          onClick={() => window.location.href = '/'}
          className="w-full flex items-center justify-center gap-3 py-4 text-red-400 hover:bg-red-950/30 rounded-2xl transition-colors font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
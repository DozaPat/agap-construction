import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FolderOpen, Users, Package, Wrench, Receipt, FileText, LogOut 
} from 'lucide-react';

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
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="w-64 bg-[#1E293B] h-screen fixed left-0 top-0 flex flex-col shadow-2xl">

      {/* HEADER - Logo + AGAP + Company Info */}
      <div className="pt-8 pb-6 px-8 border-b border-white/10">
        <div className="flex flex-col items-center">
          <div className="w-25 h-25 bg-white rounded-full p-2 shadow-inner">
            <img 
              src="/logo.png" 
              alt="Agap Logo" 
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-widest mt-2">AGAP</h1>
          
          {/* Company Text */}
          <div className="text-center mt-2">
            <p className="text-[#F59E0B] text-sm">Architect Gacad and Partners</p>
            <p className="text-gray-400 text-xs pt-1">Construction Management System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-base font-medium transition-all ${
                isActive
                  ? 'bg-[#F59E0B] text-white'           // ← Changed to white text
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom - User Info + Logout */}
      <div className="mt-auto border-t border-white/10 p-6">
        {user && (
          <div className="text-center mb-6">
            <p className="text-white font-medium">{user.name}</p>
            <p className="text-[#F59E0B] text-xs capitalize">{user.role}</p>
          </div>
        )}

        <button 
          onClick={handleLogout}
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
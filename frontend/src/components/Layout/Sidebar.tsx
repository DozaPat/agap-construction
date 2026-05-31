import { Link, useLocation } from 'react-router-dom';
import { Building2, Users, FolderOpen, Package, Wrench, Receipt, LogOut } from 'lucide-react';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: FolderOpen },
  { path: '/projects', label: 'Projects', icon: FolderOpen },
  { path: '/workers', label: 'Workers', icon: Users },
  { path: '/materials', label: 'Materials', icon: Package },
  { path: '/tools', label: 'Tools', icon: Wrench },
  { path: '/expenses', label: 'Expenses', icon: Receipt },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <div className="w-72 bg-gray-900 h-screen fixed left-0 top-0 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500 rounded-2xl flex items-center justify-center">
            <Building2 className="w-7 h-7 text-gray-950" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Agap</h1>
            <p className="text-yellow-500 text-sm -mt-1">Construction</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors font-medium ${
                isActive 
                  ? 'bg-yellow-500 text-gray-950' 
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-800">
        <button 
          onClick={() => window.location.href = '/'}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 text-red-400 hover:bg-red-950/30 rounded-2xl transition-colors font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
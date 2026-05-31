import { useState } from 'react';
import { Home, FolderOpen, Users, Package, Wrench, DollarSign, BarChart3, LogOut, Menu } from 'lucide-react';

const menuItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: FolderOpen, label: 'Projects', path: '/projects' },
  { icon: Users, label: 'Workers', path: '/workers' },
  { icon: Package, label: 'Materials', path: '/materials' },
  { icon: Wrench, label: 'Tools', path: '/tools' },
  { icon: DollarSign, label: 'Expenses', path: '/expenses' },
  { icon: BarChart3, label: 'Progress', path: '/progress' },
  { icon: BarChart3, label: 'Reports', path: '/reports' },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={`${isOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white h-screen transition-all duration-300 flex flex-col`}>
      <div className="p-4 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
            <span className="font-bold text-xl">A</span>
          </div>
          {isOpen && <h1 className="text-2xl font-bold tracking-tight">AGAP</h1>}
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 hover:bg-slate-800 rounded-lg">
          <Menu size={20} />
        </button>
      </div>

      <nav className="flex-1 p-4">
        {menuItems.map((item, index) => (
          <a
            key={index}
            href={item.path}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 mb-1 transition-colors"
          >
            <item.icon size={20} />
            {isOpen && <span>{item.label}</span>}
          </a>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-colors">
          <LogOut size={20} />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
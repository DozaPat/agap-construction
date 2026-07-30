import {
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/projects', label: 'Projects', icon: FolderKanban },
  { path: '/workers', label: 'Workers', icon: Users },
  { path: '/materials', label: 'Materials', icon: Package },
  { path: '/tools', label: 'Tools', icon: Wrench },
  { path: '/expenses', label: 'Expenses', icon: Receipt },
  { path: '/reports', label: 'Generate Reports', icon: FileText },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
}

const Sidebar = ({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed,
}: SidebarProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-dvh flex-col bg-[#1E293B] shadow-2xl transition-[width,transform] duration-300 ${
        collapsed ? 'lg:w-20' : 'lg:w-64'
      } w-72 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
    >
      <div
        className={`flex shrink-0 items-center border-b border-white/10 ${
          collapsed ? 'lg:justify-center lg:px-3' : 'justify-between px-4'
        } h-20`}
      >
        <div className={`flex min-w-0 items-center gap-3 ${collapsed ? 'lg:hidden' : ''}`}>
          <div className="h-11 w-11 shrink-0 rounded-full bg-white p-1.5 shadow-inner">
            <img src="/logo.png" alt="AGAP logo" className="h-full w-full rounded-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold tracking-widest text-white">AGAP</p>
            <p className="truncate text-xs text-[#F59E0B]">Construction Management</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden h-11 w-11 items-center justify-center rounded-2xl text-slate-300 transition-colors hover:bg-white/10 hover:text-white lg:inline-flex"
        >
          {collapsed ? <PanelLeftOpen className="h-6 w-6" /> : <PanelLeftClose className="h-6 w-6" />}
        </button>
      </div>

      <div className={`hidden shrink-0 border-b border-white/10 py-5 text-center lg:block ${collapsed ? 'px-2' : 'px-6'}`}>
        {collapsed ? (
          <div className="mx-auto h-11 w-11 rounded-full bg-white p-1.5">
            <img src="/logo.png" alt="AGAP" className="h-full w-full rounded-full object-contain" />
          </div>
        ) : (
          <>
            <div className="mx-auto h-20 w-20 rounded-full bg-white p-2 shadow-inner">
              <img src="/logo.png" alt="AGAP" className="h-full w-full rounded-full object-contain" />
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-widest text-white">AGAP</h1>
            <p className="mt-1 text-xs text-[#F59E0B]">Architect Gacad and Partners</p>
          </>
        )}
      </div>

      <nav className={`min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 ${collapsed ? 'lg:px-2' : 'px-3'}`}>
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(`${item.path}/`));

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                className={`flex min-h-12 items-center gap-4 rounded-2xl px-4 py-3 font-medium transition-all ${
                  collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : ''
                } ${
                  isActive
                    ? 'bg-[#F59E0B] text-white shadow-lg shadow-orange-950/20'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={`${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className={`shrink-0 border-t border-white/10 ${collapsed ? 'lg:p-2' : 'p-4'}`}>
        {user && (
          <div className={`mb-2 min-w-0 px-2 text-center ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-xs capitalize text-[#F59E0B]">{user.role}</p>
          </div>
        )}
        <button
          type="button"
          onClick={logout}
          title={collapsed ? 'Logout' : undefined}
          aria-label="Logout"
          className={`flex min-h-11 w-full items-center justify-center gap-3 rounded-2xl px-3 py-2.5 font-medium text-red-300 transition-colors hover:bg-red-950/40 hover:text-red-200 ${
            collapsed ? 'lg:gap-0 lg:px-0' : ''
          }`}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className={`${collapsed ? 'lg:hidden' : ''}`}>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

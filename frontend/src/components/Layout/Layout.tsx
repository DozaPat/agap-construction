import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapsed = () => {
    setIsCollapsed((current) => {
      const next = !current;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar
        collapsed={isCollapsed}
        mobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onToggleCollapsed={toggleCollapsed}
      />

      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <div
        className={`min-w-0 transition-[margin] duration-300 ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur sm:px-6 lg:hidden">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setIsMobileOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
          >
            <Menu className="h-6 w-6" />
          </button>
          <img src="/logo.png" alt="" className="h-9 w-9 rounded-full bg-white object-contain" />
          <div className="min-w-0">
            <p className="truncate font-bold tracking-wide text-[#1E293B]">AGAP</p>
            <p className="truncate text-xs text-slate-500">Construction Management</p>
          </div>
        </header>

        <main className="app-content min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

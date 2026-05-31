import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <Sidebar />
      <div className="ml-64 flex-1 overflow-y-auto p-8 max-w-[1400px] mx-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
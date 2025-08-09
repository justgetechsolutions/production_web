import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.tsx';
import { Menu, X, Home, Package, Users, Calendar, MessageSquare, Settings, LogOut, List } from 'lucide-react';

function AdminLayout({ children }: { children: any }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, restaurantId } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const adminLinks = [
    { to: `/admin/${restaurantId}/dashboard`, label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
    { to: `/admin/${restaurantId}/order`, label: 'Orders', icon: <Package className="w-5 h-5" /> },
    { to: `/admin/${restaurantId}/menu`, label: 'Menu', icon: <Package className="w-5 h-5" /> },
    { to: `/admin/${restaurantId}/categories`, label: 'Categories', icon: <List className="w-5 h-5" /> },
    { to: `/admin/${restaurantId}/tables`, label: 'Tables', icon: <Users className="w-5 h-5" /> },
    { to: `/admin/${restaurantId}/staff`, label: 'Staff', icon: <Users className="w-5 h-5" /> },
    { to: `/admin/${restaurantId}/feedback`, label: 'Feedback', icon: <MessageSquare className="w-5 h-5" /> },
    { to: `/admin/${restaurantId}/calendar`, label: 'Calendar', icon: <Calendar className="w-5 h-5" /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg font-bold">🍽️</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
          </div>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {adminLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={closeSidebar}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                ${location.pathname === link.to 
                  ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">QR Ordering System</h1>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout; 
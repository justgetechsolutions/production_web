import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  pendingOrderCount?: number;
}

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/menu', label: 'Menu' },
  { to: '/tables', label: 'Tables' },
  { to: '/staff', label: 'Staff' },
  { to: '/orders', label: 'Orders' },
  { to: '/calendar', label: 'Calendar View' },
  { to: '/make-order', label: 'Make Order' },
];

const Sidebar: React.FC<SidebarProps> = ({ pendingOrderCount }) => {
  const location = useLocation();
  return (
    <aside className="h-screen w-64 bg-white shadow flex flex-col">
      <div className="p-6 text-2xl font-bold text-blue-600">CoptOfRestorent</div>
      <nav className="flex-1">
        <ul>
          {navLinks.map(link => (
            <li key={link.to} className="relative">
              <Link
                to={link.to}
                className={`block px-6 py-3 text-lg hover:bg-blue-50 transition ${location.pathname === link.to ? 'bg-blue-100 font-semibold text-blue-700' : ''}`}
              >
                {link.label}
                {link.to === '/orders' && pendingOrderCount && pendingOrderCount > 0 && (
                  <span className="ml-2 inline-block bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full align-middle">
                    {pendingOrderCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar; 
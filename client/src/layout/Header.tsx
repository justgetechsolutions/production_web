import React from 'react';
import { useAuth } from '../AuthContext.tsx';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  return (
    <header className="h-16 bg-white shadow flex items-center px-8 justify-between">
      <div className="text-xl font-bold text-gray-700">Admin Panel</div>
      <div className="flex items-center gap-4">
        <span className="text-gray-600">Welcome, Admin</span>
        <button onClick={handleLogout} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition">Logout</button>
      </div>
    </header>
  );
};

export default Header; 
import React from 'react';
import Sidebar from './Sidebar.tsx';
import Header from './Header.tsx';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-screen bg-gray-100">
    <Sidebar />
    <div className="flex-1 flex flex-col">
      <Header />
      <main className="flex-1 p-6">{children}</main>
    </div>
  </div>
);

export default MainLayout; 
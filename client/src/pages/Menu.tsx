import React from 'react';
import CategoryList from '../components/menu/CategoryList.tsx';
import MenuItemTable from '../components/menu/MenuItemTable.tsx';

const Menu: React.FC = () => (
  <div className="p-4 sm:p-6">
    <h1 className="text-2xl font-bold mb-4">Menu Management</h1>
    <CategoryList />
    <MenuItemTable />
  </div>
);

export default Menu; 
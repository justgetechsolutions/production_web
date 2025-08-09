import React from 'react';
import StaffList from '../components/staff/StaffList.tsx';

const Staff: React.FC = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Staff Management</h1>
    <StaffList />
  </div>
);

export default Staff; 
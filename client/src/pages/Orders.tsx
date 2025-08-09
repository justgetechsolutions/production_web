import React from 'react';
import OrderList from '../components/orders/OrderList.tsx';

const Orders: React.FC = () => (
  <div className="p-4 sm:p-6">
    <h1 className="text-2xl font-bold mb-4">Recent Orders</h1>
    <OrderList />
  </div>
);

export default Orders; 
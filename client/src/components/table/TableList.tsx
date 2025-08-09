import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '../../AuthContext.tsx';
import apiClient from '../../utils/apiClient.ts';

interface Table {
  _id?: string;
  tableNumber: string;
  qrUrl: string;
  qrImage?: string;
}

function TableList() {
  const { restaurantId, token } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTable, setEditTable] = useState<Table | null>(null);
  const [tableNumber, setTableNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = restaurantId ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/restaurants/${restaurantId}/tables` : '';

  const fetchTables = async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const response = await apiClient.get(`/api/restaurants/${restaurantId}/tables`);
      setTables(response.data);
      setError('');
    } catch (error: any) {
      if (error.response?.status === 401) {
        setError('You are not authorized. Please log in again.');
      } else {
        setError('Failed to load tables.');
      }
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [restaurantId]);

  const openAddModal = () => {
    setEditTable(null);
    setTableNumber('');
    setModalOpen(true);
  };

  const openEditModal = (table: Table) => {
    setEditTable(table);
    setTableNumber(table.tableNumber);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!restaurantId) return;
    try {
      if (editTable && editTable._id) {
        // No edit API for tables in backend, so skip
      } else {
        await apiClient.post(`/api/restaurants/${restaurantId}/tables`, { tableNumber });
      }
      setModalOpen(false);
      fetchTables();
    } catch (error) {
      console.error('Failed to save table:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!restaurantId) return;
    try {
      await apiClient.delete(`/api/restaurants/${restaurantId}/tables/${id}`);
      fetchTables();
    } catch (error) {
      console.error('Failed to delete table:', error);
    }
  };

  const handleDownloadQR = async (tableNumber: string) => {
    if (!restaurantId) {
      alert('No restaurantId found.');
      return;
    }
    const url = `${window.location.origin}/r/${restaurantId}/menu/${encodeURIComponent(tableNumber)}`;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 300 });
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `table-${tableNumber}-qr.png`;
    link.click();
  };

  if (loading) return <div>Loading tables...</div>;
  if (error) return <div className="text-red-600 font-semibold p-4">{error}</div>;

  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Tables</h2>
        <button onClick={openAddModal} className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition">Add Table</button>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b">
            <th className="py-2">Table Number</th>
            <th>QR Code</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tables.map(table => (
            <tr key={table._id} className="border-b last:border-b-0">
              <td className="py-2 font-semibold">{table.tableNumber}</td>
              <td>
                <button
                  onClick={() => handleDownloadQR(table.tableNumber)}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Download QR
                </button>
              </td>
              <td>
                <button onClick={() => openEditModal(table)} className="text-blue-600 hover:underline mr-2">Edit</button>
                <button onClick={() => table._id && handleDelete(table._id)} className="text-red-600 hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">{editTable ? 'Edit' : 'Add'} Table</h3>
            <input
              className="w-full border rounded px-3 py-2 mb-4"
              value={tableNumber}
              onChange={e => setTableNumber(e.target.value)}
              placeholder="Table Number (e.g., T001)"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded bg-gray-200">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 rounded bg-blue-600 text-white font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableList; 
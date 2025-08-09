import React, { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext.tsx';
import apiClient from '../../utils/apiClient.ts';
import { AlertTriangle, Package } from 'lucide-react';

interface MenuItem {
  _id?: string;
  name: string;
  price: number;
  category?: string;
  imageUrl?: string;
  quantity: number;
  lowStockThreshold: number;
}

function MenuItemTable() {
  const { restaurantId } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({ name: '', price: '', category: '', imageUrl: '', quantity: '', lowStockThreshold: '' });
  const [loading, setLoading] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');

  const fetchMenu = async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const response = await apiClient.get(`/api/restaurants/${restaurantId}/menu`);
      setItems(response.data);
      setError('');
    } catch (error: any) {
      if (error.response?.status === 401) {
        setError('You are not authorized. Please log in again.');
      } else {
        setError('Failed to load menu.');
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [restaurantId]);

  const openAddModal = () => {
    setEditItem(null);
    setForm({ name: '', price: '', category: '', imageUrl: '', quantity: '100', lowStockThreshold: '50' });
    setImageFile(null);
    setImagePreview('');
    setModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditItem(item);
    setForm({ 
      name: item.name, 
      price: item.price.toString(), 
      category: item.category || '', 
      imageUrl: item.imageUrl || '',
      quantity: item.quantity.toString(),
      lowStockThreshold: item.lowStockThreshold.toString()
    });
    setImageFile(null);
    setImagePreview('');
    setModalOpen(true);
  };

  const handleImageChange = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  const handleImageUrlChange = (e: any) => {
    setForm(f => ({ ...f, imageUrl: e.target.value }));
    setImagePreview(e.target.value);
  };

  const handleSave = async () => {
    if (!restaurantId) return;
    let imageUrl = form.imageUrl;
    if (imageFile) {
      const formData = new FormData();
      formData.append('image', imageFile);
      try {
        const res = await apiClient.post(`/api/restaurants/${restaurantId}/menu/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        imageUrl = res.data.imageUrl;
      } catch (error) {
        console.error('Failed to upload image:', error);
        return;
      }
    }
    const payload = { 
      ...form, 
      price: Number(form.price), 
      quantity: Number(form.quantity),
      lowStockThreshold: Number(form.lowStockThreshold),
      imageUrl 
    };
    try {
      if (editItem && editItem._id) {
        const res = await apiClient.put(`/api/restaurants/${restaurantId}/menu/${editItem._id}`, payload);
        setItems(prev => prev.map(item => item._id === editItem._id ? res.data : item));
      } else {
        const res = await apiClient.post(`/api/restaurants/${restaurantId}/menu`, payload);
        setItems(prev => [...prev, res.data]);
      }
      setModalOpen(false);
    } catch (error) {
      console.error('Failed to save menu item:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!restaurantId) return;
    try {
      await apiClient.delete(`/api/restaurants/${restaurantId}/menu/${id}`);
      setItems(prev => prev.filter(item => item._id !== id));
    } catch (error) {
      console.error('Failed to delete menu item:', error);
    }
  };

  const getStockStatus = (item: MenuItem) => {
    if (item.quantity === 0) return { status: 'out-of-stock', color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="w-4 h-4" /> };
    if (item.quantity <= item.lowStockThreshold) return { status: 'low-stock', color: 'bg-yellow-100 text-yellow-800', icon: <AlertTriangle className="w-4 h-4" /> };
    return { status: 'in-stock', color: 'bg-green-100 text-green-800', icon: <Package className="w-4 h-4" /> };
  };

  const filteredItems = categoryFilter ? items.filter(i => i.category === categoryFilter) : items;

  if (loading) return <div>Loading menu...</div>;
  if (error) return <div className="text-red-600 font-semibold p-4">{error}</div>;

  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Menu Items</h2>
        <button onClick={openAddModal} className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition">Add Item</button>
      </div>
      
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="font-semibold">Filter by Category:</span>
        <select className="border rounded px-2 py-1" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All</option>
          {[...new Set(items.map(i => i.category).filter(Boolean))].map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      
      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm sm:text-base">
        <thead>
          <tr className="border-b">
            <th className="py-2 whitespace-nowrap">Image</th>
            <th className="whitespace-nowrap">Name</th>
            <th className="whitespace-nowrap">Price</th>
            <th className="whitespace-nowrap">Category</th>
            <th className="whitespace-nowrap">Quantity</th>
            <th className="whitespace-nowrap">Stock Status</th>
            <th className="whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map(item => {
            const stockStatus = getStockStatus(item);
            return (
              <tr key={item._id} className="border-b last:border-b-0">
                <td className="py-2">
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover rounded" /> : <span className="text-gray-400">No Image</span>}
                </td>
                <td>{item.name}</td>
                <td>₹{item.price}</td>
                <td>{item.category || '-'}</td>
                <td className="font-semibold">{item.quantity}</td>
                <td className="whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                    {stockStatus.icon}
                    {stockStatus.status === 'out-of-stock' ? 'Out of Stock' : 
                     stockStatus.status === 'low-stock' ? 'Low Stock' : 'In Stock'}
                  </span>
                </td>
                <td className="whitespace-nowrap">
                  <button onClick={() => openEditModal(item)} className="text-blue-600 hover:underline mr-2">Edit</button>
                  <button onClick={() => item._id && handleDelete(item._id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editItem ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Item name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Price</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Category"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  placeholder="100"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Low Stock Threshold</label>
                <input
                  type="number"
                  value={form.lowStockThreshold}
                  onChange={e => setForm(f => ({ ...f, lowStockThreshold: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  placeholder="50"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={handleImageUrlChange}
                  className="w-full border rounded px-3 py-2"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Upload Image</label>
                <input
                  type="file"
                  onChange={handleImageChange}
                  className="w-full border rounded px-3 py-2"
                  accept="image/*"
                />
              </div>
              
              {imagePreview && (
                <div>
                  <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded" />
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700"
              >
                {editItem ? 'Update' : 'Add'}
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded font-semibold hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MenuItemTable; 
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext.tsx';

interface MenuItem {
  _id?: string;
  name: string;
  price: number;
  category?: string;
  imageUrl?: string;
  quantity: number;
  lowStockThreshold: number;
}

const AdminMenu = () => {
  const { restaurantId } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [newItem, setNewItem] = useState<MenuItem>({ name: '', price: 0, category: '', imageUrl: '', quantity: 0, lowStockThreshold: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchMenu();
  }, [restaurantId]);

  const fetchMenu = async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/restaurants/${restaurantId}/menu`, { withCredentials: true });
      setMenuItems(res.data);
      setError('');
    } catch (err) {
      setError('Failed to load menu.');
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!restaurantId) return;
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/restaurants/${restaurantId}/menu`,
        { ...newItem, price: Number(newItem.price) },
        { withCredentials: true }
      );
      setMenuItems(prev => [...prev, res.data]);
      setNewItem({ name: '', price: 0, category: '', imageUrl: '', quantity: 0, lowStockThreshold: 0 });
    } catch (err) {
      setError('Failed to add item.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!restaurantId) return;
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/restaurants/${restaurantId}/menu/${id}`,
        { withCredentials: true }
      );
      setMenuItems(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      setError('Failed to delete item.');
    }
  };

  const handleEdit = async (id: string, updatedItem: MenuItem) => {
    if (!restaurantId) return;
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/restaurants/${restaurantId}/menu/${id}`,
        updatedItem,
        { withCredentials: true }
      );
      setMenuItems(prev => prev.map(item => item._id === id ? res.data : item));
    } catch (err) {
      setError('Failed to edit item.');
    }
  };

  const handleChange = (e: any) => {
    setNewItem({ ...newItem, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !restaurantId) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/restaurants/${restaurantId}/menu/upload`,
        formData,
        { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setNewItem(prev => ({ ...prev, imageUrl: res.data.imageUrl }));
    } catch (err) {
      setError('Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div>Loading menu...</div>;
  if (error) return <div className="text-red-600 font-semibold p-4">{error}</div>;

  return (
    <div>
      <h2>Admin Menu Management</h2>

      <div>
        <input name="name" placeholder="Name" value={newItem.name} onChange={handleChange} />
        <input name="price" placeholder="Price" value={newItem.price} onChange={handleChange} />
        <input name="category" placeholder="Category" value={newItem.category} onChange={handleChange} />
        <input name="quantity" placeholder="Quantity" value={newItem.quantity} onChange={handleChange} />
        <input name="lowStockThreshold" placeholder="Low Stock Threshold" value={newItem.lowStockThreshold} onChange={handleChange} />
        <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
        {newItem.imageUrl && (
          <img src={newItem.imageUrl} alt="Preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, margin: '8px 0' }} />
        )}
        <button onClick={handleAdd} disabled={uploading || !newItem.name || !newItem.price || uploading}>
          {uploading ? 'Uploading...' : 'Add Item'}
        </button>
      </div>

      <ul>
        {menuItems.map((item: MenuItem) => (
          <li key={item._id}>
            {item.name} - ₹{item.price} ({item.category}) - Qty: {item.quantity} - Threshold: {item.lowStockThreshold}
            <button onClick={() => handleDelete(item._id || '')}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminMenu;

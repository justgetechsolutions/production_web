import React, { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext.tsx';
import { toast } from 'react-toastify';
import { Eye, EyeOff, Edit, Trash2, Key, UserPlus } from 'react-feather';

interface Staff {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
  lastLogin?: string;
}

function StaffList() {
  const { restaurantSlug, token } = useAuth();
  const API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/staff/`;
  const [staff, setStaff] = useState<Staff[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    role: 'kitchen',
    password: ''
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);

  const fetchStaff = () => {
    if (!API_URL) return;
    setLoading(true);
    fetch(API_URL, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setStaff(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchStaff();
  }, [restaurantSlug]);

  const openAddModal = () => {
    setEditStaff(null);
    setForm({ name: '', email: '', phone: '', role: 'kitchen', password: '' });
    setModalOpen(true);
  };

  const openEditModal = (s: Staff) => {
    setEditStaff(s);
    setForm({ 
      name: s.name, 
      email: s.email, 
      phone: s.phone || '', 
      role: s.role || 'kitchen',
      password: ''
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!API_URL) return;
    
    try {
      if (editStaff && editStaff._id) {
        // Update existing staff
        const response = await fetch(`${API_URL}${editStaff._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
          credentials: 'include',
        });
        
        if (response.ok) {
          toast.success('Staff updated successfully!');
        } else {
          toast.error('Failed to update staff');
        }
      } else {
        // Create new staff
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
          credentials: 'include',
        });
        
        if (response.ok) {
          toast.success('Staff created successfully! Default password: kitchen123');
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to create staff');
        }
      }
    } catch (error) {
      toast.error('Network error');
    }
    
    setModalOpen(false);
    fetchStaff();
  };

  const handleDelete = async (id: string) => {
    if (!API_URL) return;
    try {
      const response = await fetch(`${API_URL}${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (response.ok) {
        toast.success('Staff deleted successfully');
        fetchStaff();
      } else {
        toast.error('Failed to delete staff');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!API_URL) return;
    try {
      const response = await fetch(`${API_URL}${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: 'kitchen123' }),
        credentials: 'include',
      });
      
      if (response.ok) {
        toast.success('Password reset to: kitchen123');
      } else {
        toast.error('Failed to reset password');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const getRoleBadge = (role: string) => {
    const roleColors = {
      admin: 'bg-purple-100 text-purple-800',
      kitchen: 'bg-orange-100 text-orange-800',
      waiter: 'bg-blue-100 text-blue-800',
      cashier: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800'}`}>
        {role}
      </span>
    );
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    return new Date(lastLogin).toLocaleString();
  };

  if (loading) return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-2">Loading staff...</span>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
          <p className="text-gray-600">Manage your restaurant staff and kitchen team</p>
        </div>
        <button 
          onClick={openAddModal} 
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2"
        >
          <UserPlus size={18} />
          Add Staff
        </button>
      </div>

      {/* Staff Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 px-4 font-semibold text-gray-700">Name</th>
              <th className="py-3 px-4 font-semibold text-gray-700">Email</th>
              <th className="py-3 px-4 font-semibold text-gray-700">Phone</th>
              <th className="py-3 px-4 font-semibold text-gray-700">Role</th>
              <th className="py-3 px-4 font-semibold text-gray-700">Status</th>
              <th className="py-3 px-4 font-semibold text-gray-700">Last Login</th>
              <th className="py-3 px-4 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {staff.map(s => (
              <tr key={s._id} className="hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-gray-900">{s.name}</td>
                <td className="py-3 px-4 text-gray-700">{s.email}</td>
                <td className="py-3 px-4 text-gray-700">{s.phone || '-'}</td>
                <td className="py-3 px-4">{getRoleBadge(s.role || 'kitchen')}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    s.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {formatLastLogin(s.lastLogin)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => openEditModal(s)} 
                      className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                      title="Edit staff"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleResetPassword(s._id!)} 
                      className="text-orange-600 hover:text-orange-800 p-1 rounded hover:bg-orange-50 transition-colors"
                      title="Reset password"
                    >
                      <Key size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(s._id!)} 
                      className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                      title="Delete staff"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">
                {editStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input 
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.name} 
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input 
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.email} 
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input 
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.phone} 
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.role} 
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  >
                    <option value="kitchen">Kitchen Staff</option>
                    <option value="waiter">Waiter</option>
                    <option value="cashier">Cashier</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                {!editStaff && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={form.password} 
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="Leave empty for default: kitchen123"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Default password: kitchen123</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setModalOpen(false)} 
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editStaff ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffList; 
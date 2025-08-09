import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useAuth } from '../../AuthContext.tsx';
import apiClient from '../../utils/apiClient.ts';

interface AddTableModalProps {
  onClose: () => void;
  onTableAdded: () => void;
}

const AddTableModal: React.FC<AddTableModalProps> = ({ onClose, onTableAdded }) => {
  const { restaurantId } = useAuth();
  const [tableNumber, setTableNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tableNumber.trim()) {
      setError('Please enter a table number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiClient.post(`/api/restaurants/${restaurantId}/tables`, {
        tableNumber: tableNumber.trim()
      });
      
      setTableNumber('');
      onTableAdded();
    } catch (error: any) {
      console.error('Error adding table:', error);
      setError(error.response?.data?.error || 'Failed to add table');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Plus className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Add New Table</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label htmlFor="tableNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Table Number
            </label>
            <input
              type="text"
              id="tableNumber"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., T001, 1, A1"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter a unique table number or identifier
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !tableNumber.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Table
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTableModal; 
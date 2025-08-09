import React, { useState, useEffect } from 'react';
import { X, Settings, Save } from 'lucide-react';
import { useAuth } from '../../AuthContext.tsx';
import apiClient from '../../utils/apiClient.ts';

interface GSTSettingsModalProps {
  onClose: () => void;
  onGSTUpdated: () => void;
}

const GSTSettingsModal: React.FC<GSTSettingsModalProps> = ({ onClose, onGSTUpdated }) => {
  const { restaurantId } = useAuth();
  const [gstEnabled, setGstEnabled] = useState(true);
  const [gstPercentage, setGstPercentage] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load current GST settings from the first table (assuming all tables have same settings)
    fetchGSTSettings();
  }, []);

  const fetchGSTSettings = async () => {
    try {
      const response = await apiClient.get(`/api/restaurants/${restaurantId}/tables`);
      if (response.data.length > 0) {
        const firstTable = response.data[0];
        setGstEnabled(firstTable.gstEnabled);
        setGstPercentage(firstTable.gstPercentage);
      }
    } catch (error) {
      console.error('Error fetching GST settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      // Update GST settings for all tables
      const response = await apiClient.get(`/api/restaurants/${restaurantId}/tables`);
      const tables = response.data;

      // Update each table with new GST settings
      const updatePromises = tables.map((table: any) =>
        apiClient.put(`/api/restaurants/${restaurantId}/tables/${table._id}/status`, {
          gstEnabled,
          gstPercentage
        })
      );

      await Promise.all(updatePromises);
      onGSTUpdated();
    } catch (error: any) {
      console.error('Error updating GST settings:', error);
      setError(error.response?.data?.error || 'Failed to update GST settings');
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
            <Settings className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">GST Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Enable GST */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="gstEnabled"
                checked={gstEnabled}
                onChange={(e) => setGstEnabled(e.target.checked)}
                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <label htmlFor="gstEnabled" className="text-lg font-medium text-gray-900">
                Enable GST
              </label>
            </div>

            {/* GST Percentage */}
            {gstEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GST Percentage (%)
                </label>
                <input
                  type="number"
                  value={gstPercentage}
                  onChange={(e) => setGstPercentage(Number(e.target.value))}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter GST percentage"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the GST percentage to be applied to all orders
                </p>
              </div>
            )}

            {/* Preview */}
            {gstEnabled && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Preview</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Sample Order Amount:</span>
                    <span>₹1000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST ({gstPercentage}%):</span>
                    <span>₹{(1000 * gstPercentage / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-gray-300 pt-1">
                    <span>Total:</span>
                    <span>₹{(1000 + (1000 * gstPercentage / 100)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GSTSettingsModal; 
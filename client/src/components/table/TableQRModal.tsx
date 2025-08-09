import React from 'react';
import { X, Download, QrCode } from 'lucide-react';
import { useAuth } from '../../AuthContext.tsx';
import apiClient from '../../utils/apiClient.ts';

interface Table {
  _id: string;
  tableNumber: string;
  qrUrl: string;
}

interface TableQRModalProps {
  table: Table;
  onClose: () => void;
}

const TableQRModal: React.FC<TableQRModalProps> = ({ table, onClose }) => {
  const { restaurantId } = useAuth();

  const handleDownloadQR = async () => {
    try {
      const response = await apiClient.get(`/api/restaurants/${restaurantId}/tables/${table._id}/qr`);
      const link = document.createElement('a');
      link.href = response.data.qrImage;
      link.download = `table-${table.tableNumber}-qr.png`;
      link.click();
    } catch (error) {
      console.error('Error downloading QR:', error);
      alert('Failed to download QR code');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <QrCode className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">QR Code - Table {table.tableNumber}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* QR Code Content */}
        <div className="p-6 text-center">
          <div className="mb-4">
            <p className="text-gray-600 mb-2">Scan this QR code to access the menu for Table {table.tableNumber}</p>
            <div className="bg-gray-100 p-4 rounded-lg inline-block">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(table.qrUrl)}`}
                alt={`QR Code for Table ${table.tableNumber}`}
                className="w-48 h-48"
              />
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">QR Code URL:</p>
            <p className="text-xs text-gray-600 break-all bg-gray-50 p-2 rounded">
              {table.qrUrl}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleDownloadQR}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download QR
            </button>
            <button
              onClick={onClose}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableQRModal; 
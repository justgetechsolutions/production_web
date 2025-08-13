import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';

interface NewOrderNotificationProps {
  isVisible: boolean;
  onClose: () => void;
  orderData?: any;
}

const NewOrderNotification: React.FC<NewOrderNotificationProps> = ({ 
  isVisible, 
  onClose, 
  orderData 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      // Auto-hide after 8 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 8000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-2 duration-300">
      <div className={`
        bg-gradient-to-r from-green-500 to-blue-600 
        text-white p-4 rounded-lg shadow-2xl 
        border-2 border-white/20 
        min-w-[320px] max-w-[400px]
        ${isAnimating ? 'animate-pulse' : ''}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="animate-bounce">
              <Bell className="w-5 h-5 text-yellow-300" />
            </div>
            <span className="font-bold text-lg">🆕 New Order!</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order Details */}
        {orderData && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Table:</span>
              <span className="font-bold text-lg">#{orderData.tableNumber || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Amount:</span>
              <span className="font-bold text-lg">₹{orderData.totalAmount || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Items:</span>
              <span className="font-bold text-sm">
                {orderData.items?.length || 0} items
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-3 pt-3 border-t border-white/20">
          <button
            onClick={onClose}
            className="w-full bg-white/20 hover:bg-white/30 
                     text-white font-medium py-2 px-4 rounded-md 
                     transition-all duration-200 hover:scale-105"
          >
            Got it! ✅
          </button>
        </div>

        {/* Animated border */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 
                      opacity-20 animate-pulse pointer-events-none" />
      </div>
    </div>
  );
};

export default NewOrderNotification;

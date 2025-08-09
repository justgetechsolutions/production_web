import React from 'react';

interface AnalyticsCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  className?: string;
  color?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ 
  title, 
  value, 
  icon, 
  className, 
  color = "bg-blue-500",
  trend 
}) => (
  <div className={`
    bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-all duration-200 
    ${className || ''}
  `}>
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-3 mb-2">
          {icon && (
            <div className={`p-2 sm:p-3 rounded-lg ${color} text-white flex-shrink-0`}>
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-medium text-gray-600 truncate">{title}</p>
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend && (
            <span className={`
              text-xs sm:text-sm font-medium px-2 py-1 rounded-full
              ${trend.isPositive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
              }
            `}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default AnalyticsCard; 
import React, { useState, useRef, useEffect } from 'react';
import { 
  XMarkIcon, 
  PhoneIcon, 
  MapPinIcon,
  ClockIcon,
  BatteryIcon,
  SignalIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { DriverLocation } from '../../../types/driver';
import { logisticsColors } from '../../../styles/tokens/colors';

interface DriverDetailPopupProps {
  driver: DriverLocation;
  onClose: () => void;
  onCallDriver?: (driverId: string) => void;
  onNavigateToDriver?: (driver: DriverLocation) => void;
  onAssignDelivery?: (driverId: string) => void;
  className?: string;
}

export const DriverDetailPopup: React.FC<DriverDetailPopupProps> = ({
  driver,
  onClose,
  onCallDriver,
  onNavigateToDriver,
  onAssignDelivery,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Animation entrance effect
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Focus management for accessibility
  useEffect(() => {
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200); // Wait for animation
  };

  const formatLastUpdate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return date.toLocaleDateString();
  };

  const getBatteryIcon = (level: number) => {
    if (level > 75) return '🔋';
    if (level > 50) return '🔋';
    if (level > 25) return '🪫';
    return '🪫';
  };

  const getSignalStrength = (accuracy: number) => {
    if (accuracy < 10) return 'Excellent';
    if (accuracy < 20) return 'Good';
    if (accuracy < 50) return 'Fair';
    return 'Poor';
  };

  const statusColor = logisticsColors.status[driver.status];
  const vehicleColor = logisticsColors.vehicle[driver.vehicleType];

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-200 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />
      
      {/* Popup Modal */}
      <div
        ref={popupRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="driver-detail-title"
        className={`
          fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
          bg-white rounded-xl shadow-2xl z-50 w-full max-w-md mx-4
          transition-all duration-200 ease-out
          ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
          ${className}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: statusColor.bg }}
            >
              <TruckIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 id="driver-detail-title" className="text-lg font-semibold text-gray-900">
                {driver.name}
              </h2>
              <div className="flex items-center space-x-2">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusColor.bg }}
                />
                <span className="text-sm text-gray-600 capitalize">
                  {driver.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
          
          <button
            ref={closeButtonRef}
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close driver details"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Vehicle Information */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                style={{ backgroundColor: vehicleColor }}
              >
                {driver.vehicleType.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {driver.vehicleType}
                </p>
                <p className="text-xs text-gray-500">Vehicle ID: {driver.id.slice(-8)}</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {driver.metadata.speed.toFixed(0)} km/h
              </p>
              <p className="text-xs text-gray-500">Current speed</p>
            </div>
          </div>

          {/* Current Delivery */}
          {driver.currentDelivery && (
            <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-orange-900">Active Delivery</h3>
                  <p className="text-sm text-orange-800 mt-1">
                    {driver.currentDelivery.customerName}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <MapPinIcon className="w-4 h-4 text-orange-600" />
                    <p className="text-xs text-orange-700">
                      {driver.currentDelivery.address}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <ClockIcon className="w-4 h-4 text-orange-600" />
                    <p className="text-xs text-orange-700">
                      ETA: {driver.currentDelivery.estimatedArrival.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className={`
                  px-2 py-1 rounded text-xs font-medium
                  ${driver.currentDelivery.priority === 'high' ? 'bg-red-100 text-red-800' :
                    driver.currentDelivery.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'}
                `}>
                  {driver.currentDelivery.priority}
                </div>
              </div>
            </div>
          )}

          {/* Location & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Location
                </p>
                <p className="text-sm text-gray-900 font-mono">
                  {driver.lat.toFixed(6)}, {driver.lng.toFixed(6)}
                </p>
              </div>
              
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Last Update
                </p>
                <p className="text-sm text-gray-900">
                  {formatLastUpdate(driver.lastUpdate)}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Battery
                </span>
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-medium">
                    {getBatteryIcon(driver.metadata.batteryLevel)}
                  </span>
                  <span className="text-sm text-gray-900">
                    {driver.metadata.batteryLevel}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Signal
                </span>
                <div className="flex items-center space-x-1">
                  <SignalIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900">
                    {getSignalStrength(driver.metadata.accuracy)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Technical Details</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Heading:</span>
                <span className="text-gray-900">{driver.metadata.heading}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Accuracy:</span>
                <span className="text-gray-900">{driver.metadata.accuracy}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Provider:</span>
                <span className="text-gray-900">{driver.metadata.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Company:</span>
                <span className="text-gray-900">{driver.companyId.slice(-8)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex space-x-3">
            {onCallDriver && (
              <button
                onClick={() => onCallDriver(driver.id)}
                className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <PhoneIcon className="w-4 h-4" />
                <span>Call</span>
              </button>
            )}
            
            {onNavigateToDriver && (
              <button
                onClick={() => onNavigateToDriver(driver)}
                className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <MapPinIcon className="w-4 h-4" />
                <span>Navigate</span>
              </button>
            )}
            
            {onAssignDelivery && !driver.currentDelivery && (
              <button
                onClick={() => onAssignDelivery(driver.id)}
                className="flex-1 flex items-center justify-center space-x-2 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                <TruckIcon className="w-4 h-4" />
                <span>Assign</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DriverDetailPopup;
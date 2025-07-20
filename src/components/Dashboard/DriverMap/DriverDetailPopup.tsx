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
import { designTokens } from '../../../styles/design-system/tokens';

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

  const getDriverStatusColor = (status: string) => {
    switch (status) {
      case 'available': return designTokens.colors.logistics.driver.available;
      case 'busy': return designTokens.colors.logistics.driver.busy;
      case 'offline': return designTokens.colors.logistics.driver.offline;
      case 'en_route': return designTokens.colors.logistics.driver.enRoute;
      case 'on_break': return designTokens.colors.logistics.driver.break;
      case 'emergency': return designTokens.colors.logistics.driver.emergency;
      default: return designTokens.colors.neutral[500];
    }
  };

  const statusColor = getDriverStatusColor(driver.status);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-normal ${
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
          bg-neutral-50 rounded-xl shadow-modal z-50 w-full max-w-md mx-4
          transition-all duration-normal ease-out
          ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
          ${className}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-layout-sm border-b border-neutral-200">
          <div className="flex items-center space-x-micro-md">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-neutral-50"
              style={{ backgroundColor: statusColor }}
            >
              <TruckIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 id="driver-detail-title" className="text-lg font-semibold text-neutral-900">
                {driver.name}
              </h2>
              <div className="flex items-center space-x-micro-sm">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusColor }}
                />
                <span className="text-sm text-neutral-600 capitalize">
                  {driver.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
          
          <button
            ref={closeButtonRef}
            onClick={handleClose}
            className="p-micro-sm hover:bg-neutral-100 rounded-lg transition-colors duration-fast focus-ring"
            aria-label="Close driver details"
          >
            <XMarkIcon className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-layout-sm space-y-layout-sm">
          {/* Vehicle Information */}
          <div className="flex items-center justify-between p-component-sm bg-neutral-100 rounded-lg">
            <div className="flex items-center space-x-micro-md">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-50 text-sm bg-primary-600"
              >
                {driver.vehicleType.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 capitalize">
                  {driver.vehicleType}
                </p>
                <p className="text-xs text-neutral-500">Vehicle ID: {driver.id.slice(-8)}</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm font-medium text-neutral-900">
                {driver.metadata.speed.toFixed(0)} km/h
              </p>
              <p className="text-xs text-neutral-500">Current speed</p>
            </div>
          </div>

          {/* Current Delivery */}
          {driver.currentDelivery && (
            <div className="border border-warning-200 bg-warning-50 rounded-lg p-component-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-warning-900">Active Delivery</h3>
                  <p className="text-sm text-warning-800 mt-1">
                    {driver.currentDelivery.customerName}
                  </p>
                  <div className="flex items-center space-x-micro-sm mt-micro-sm">
                    <MapPinIcon className="w-4 h-4 text-warning-600" />
                    <p className="text-xs text-warning-700">
                      {driver.currentDelivery.address}
                    </p>
                  </div>
                  <div className="flex items-center space-x-micro-sm mt-micro-xs">
                    <ClockIcon className="w-4 h-4 text-warning-600" />
                    <p className="text-xs text-warning-700">
                      ETA: {driver.currentDelivery.estimatedArrival.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className={`
                  px-micro-sm py-micro-xs rounded text-xs font-medium
                  ${driver.currentDelivery.priority === 'high' ? 'bg-priority-urgent text-neutral-50' :
                    driver.currentDelivery.priority === 'medium' ? 'bg-priority-high text-neutral-50' :
                    'bg-priority-low text-neutral-50'}
                `}>
                  {driver.currentDelivery.priority}
                </div>
              </div>
            </div>
          )}

          {/* Location & Status */}
          <div className="grid grid-cols-2 gap-component-sm">
            <div className="space-y-micro-md">
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Location
                </p>
                <p className="text-sm text-neutral-900 font-mono">
                  {driver.lat.toFixed(6)}, {driver.lng.toFixed(6)}
                </p>
              </div>
              
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Last Update
                </p>
                <p className="text-sm text-neutral-900">
                  {formatLastUpdate(driver.lastUpdate)}
                </p>
              </div>
            </div>
            
            <div className="space-y-micro-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Battery
                </span>
                <div className="flex items-center space-x-micro-xs">
                  <span className="text-sm font-medium">
                    {getBatteryIcon(driver.metadata.batteryLevel)}
                  </span>
                  <span className="text-sm text-neutral-900">
                    {driver.metadata.batteryLevel}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Signal
                </span>
                <div className="flex items-center space-x-micro-xs">
                  <SignalIcon className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm text-neutral-900">
                    {getSignalStrength(driver.metadata.accuracy)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="bg-neutral-100 rounded-lg p-component-sm">
            <h3 className="text-sm font-medium text-neutral-900 mb-micro-md">Technical Details</h3>
            <div className="grid grid-cols-2 gap-micro-md text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Heading:</span>
                <span className="text-neutral-900">{driver.metadata.heading}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Accuracy:</span>
                <span className="text-neutral-900">{driver.metadata.accuracy}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Provider:</span>
                <span className="text-neutral-900">{driver.metadata.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Company:</span>
                <span className="text-neutral-900">{driver.companyId.slice(-8)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-neutral-200 p-layout-sm">
          <div className="flex space-x-micro-md">
            {onCallDriver && (
              <button
                onClick={() => onCallDriver(driver.id)}
                className="flex-1 flex items-center justify-center space-x-micro-sm bg-primary-600 text-neutral-50 py-micro-sm px-component-sm rounded-lg hover:bg-primary-700 transition-colors duration-fast focus-ring"
              >
                <PhoneIcon className="w-4 h-4" />
                <span>Call</span>
              </button>
            )}
            
            {onNavigateToDriver && (
              <button
                onClick={() => onNavigateToDriver(driver)}
                className="flex-1 flex items-center justify-center space-x-micro-sm bg-success-600 text-neutral-50 py-micro-sm px-component-sm rounded-lg hover:bg-success-700 transition-colors duration-fast focus-ring"
              >
                <MapPinIcon className="w-4 h-4" />
                <span>Navigate</span>
              </button>
            )}
            
            {onAssignDelivery && !driver.currentDelivery && (
              <button
                onClick={() => onAssignDelivery(driver.id)}
                className="flex-1 flex items-center justify-center space-x-micro-sm bg-warning-600 text-neutral-50 py-micro-sm px-component-sm rounded-lg hover:bg-warning-700 transition-colors duration-fast focus-ring"
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
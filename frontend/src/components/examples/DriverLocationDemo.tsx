import React, { useState, useEffect } from 'react';
import DriverMap from '../dispatch/DriverMap';
import { processDriverHTML } from '../../utils/parseDriverLocations';
import { DriverLocation } from '../../hooks/useDriverTracking';
import { Card } from '../ui';

interface DriverLocationDemoProps {
  mapboxToken: string;
  htmlContent: string;
}

const DriverLocationDemo: React.FC<DriverLocationDemoProps> = ({
  mapboxToken,
  htmlContent
}) => {
  const [processedData, setProcessedData] = useState<ReturnType<typeof processDriverHTML> | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null);

  useEffect(() => {
    if (htmlContent) {
      const data = processDriverHTML(htmlContent);
      setProcessedData(data);
      console.log('Processed driver data:', data);
    }
  }, [htmlContent]);

  const handleDriverClick = (driver: DriverLocation) => {
    setSelectedDriver(driver);
    console.log('Driver clicked:', driver);
  };

  const handleMapClick = (coordinates: [number, number]) => {
    console.log('Map clicked at:', coordinates);
  };

  if (!processedData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Processing driver data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="md" className="text-center">
          <div className="text-2xl font-bold text-gray-900">{processedData.summary.total}</div>
          <div className="text-sm text-gray-500">Total Drivers</div>
        </Card>
        <Card padding="md" className="text-center">
          <div className="text-2xl font-bold text-blue-600">{processedData.summary.inTransit}</div>
          <div className="text-sm text-gray-500">In Transit</div>
        </Card>
        <Card padding="md" className="text-center">
          <div className="text-2xl font-bold text-green-600">{processedData.summary.active}</div>
          <div className="text-sm text-gray-500">Active</div>
        </Card>
        <Card padding="md" className="text-center">
          <div className="text-2xl font-bold text-gray-600">{processedData.summary.available}</div>
          <div className="text-sm text-gray-500">Available</div>
        </Card>
      </div>

      {/* Map Container */}
      <div className="h-96 rounded-lg overflow-hidden">
        <DriverMap
          companyId="demo-company"
          userId="demo-user"
          userType="dispatcher"
          mapboxToken={mapboxToken}
          initialCenter={[-73.9934, 40.7505]} // NYC center
          initialZoom={11}
          height="100%"
          showTraffic={true}
          showPredictions={false} // Disable AI predictions for demo
          useSmartClustering={true}
          onDriverClick={handleDriverClick}
          onMapClick={handleMapClick}
          className="border border-gray-200"
        />
      </div>

      {/* Selected Driver Info */}
      {selectedDriver && (
        <Card padding="md">
          <h3 className="text-lg font-semibold mb-3">Selected Driver</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Name</div>
              <div className="font-medium">{selectedDriver.metadata?.name || selectedDriver.driverId}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Vehicle</div>
              <div className="font-medium">{selectedDriver.metadata?.vehicle || 'Unknown'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Location</div>
              <div className="font-medium">{selectedDriver.latitude.toFixed(4)}, {selectedDriver.longitude.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Speed</div>
              <div className="font-medium">{selectedDriver.speed ? `${Math.round(selectedDriver.speed * 2.237)} mph` : 'Stationary'}</div>
            </div>
            {selectedDriver.metadata?.route && (
              <div className="col-span-2">
                <div className="text-sm text-gray-500">Route</div>
                <div className="font-medium">{selectedDriver.metadata.route}</div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Raw Data Display */}
      <Card padding="md">
        <h3 className="text-lg font-semibold mb-3">Parsed Drivers</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {processedData.parsedDrivers.map((driver, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div>
                <div className="font-medium">{driver.name}</div>
                <div className="text-sm text-gray-500">{driver.vehicle} • {driver.address}</div>
              </div>
              <div className="text-right">
                <div className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                  driver.status === 'in transit' ? 'bg-blue-100 text-blue-800' :
                  driver.status === 'active' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {driver.status}
                </div>
                <div className="text-sm text-gray-500">{driver.deliveries} deliveries</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default DriverLocationDemo;
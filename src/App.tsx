import React from 'react';
import QueryProvider from './providers/QueryProvider';
import TrackingDashboard from './components/tracking/TrackingDashboard';
import './App.css';

// Mock user data - in a real app, this would come from authentication
const mockUser = {
  id: 'user123',
  companyId: 'company123',
  role: 'dispatcher' as const,
  driverId: undefined // Set this for driver role
};

const App: React.FC = () => {
  return (
    <QueryProvider>
      <div className="App">
        <TrackingDashboard
          companyId={mockUser.companyId}
          userRole={mockUser.role}
          driverId={mockUser.driverId}
          initialCenter={{ latitude: 40.7128, longitude: -74.0060 }} // New York
        />
      </div>
    </QueryProvider>
  );
};

export default App;
import React from 'react'

export interface DriverLocation {
  id: string
  name: string
  lat: number
  lng: number
  status: 'active' | 'idle' | 'break' | 'offline'
  vehicleType: 'car' | 'van' | 'truck' | 'motorcycle'
  lastUpdate: Date
  currentDelivery: {
    id: string
    destination: string
    eta: Date
  } | null
}

interface DriverMarkersProps {
  map?: any
  drivers: DriverLocation[]
  onDriverClick: (driver: DriverLocation) => void
  nearestDriverId?: string
  className?: string
}

export const DriverMarkers: React.FC<DriverMarkersProps> = ({
  drivers,
  onDriverClick,
  nearestDriverId,
  className = ''
}) => {
  return (
    <div className={`driver-markers ${className}`} data-testid="driver-markers-component">
      {drivers.map((driver) => (
        <div
          key={driver.id}
          className={`driver-marker ${driver.status} ${nearestDriverId === driver.id ? 'nearest' : ''}`}
          onClick={() => onDriverClick(driver)}
          style={{
            position: 'absolute',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '2px solid white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            color: 'white',
            backgroundColor: getStatusColor(driver.status),
            boxShadow: nearestDriverId === driver.id ? '0 0 0 3px #3b82f6' : '0 2px 4px rgba(0,0,0,0.2)',
            transform: 'translate(-50%, -50%)',
            top: '50%',
            left: `${20 + (drivers.indexOf(driver) * 40)}px`,
            transition: 'all 0.2s ease',
          }}
          aria-label={`Driver ${driver.name}, status: ${driver.status}, vehicle: ${driver.vehicleType}`}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onDriverClick(driver)
            }
          }}
        >
          {getVehicleIcon(driver.vehicleType)}
          {driver.currentDelivery && (
            <div
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '8px',
                height: '8px',
                backgroundColor: '#fbbf24',
                borderRadius: '50%',
                border: '1px solid white'
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function getStatusColor(status: DriverLocation['status']): string {
  switch (status) {
    case 'active':
      return '#10b981' // green
    case 'idle':
      return '#3b82f6' // blue
    case 'break':
      return '#f59e0b' // yellow
    case 'offline':
      return '#6b7280' // gray
    default:
      return '#6b7280'
  }
}

function getVehicleIcon(vehicleType: DriverLocation['vehicleType']): string {
  switch (vehicleType) {
    case 'car':
      return '🚗'
    case 'van':
      return '🚐'
    case 'truck':
      return '🚛'
    case 'motorcycle':
      return '🏍️'
    default:
      return '🚗'
  }
}

export default DriverMarkers
import type { Meta, StoryObj } from '@storybook/react'
import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { DriverMarkers } from './DriverMarkers'
import { DriverLocation } from '../../types/driver'
import { visualDebugger } from '../../utils/visualDebug'

// Mock Mapbox GL for Storybook
const mockMap = {
  getBounds: () => ({
    getWest: () => -74.1,
    getSouth: () => 40.6,
    getEast: () => -73.9,
    getNorth: () => 40.9,
  }),
  getZoom: () => 12,
  on: () => {},
  off: () => {},
  easeTo: () => {},
} as unknown as mapboxgl.Map

// Mock driver data
const mockDrivers: DriverLocation[] = [
  {
    id: 'DRV-001',
    name: 'John Smith',
    lat: 40.7128,
    lng: -74.0060,
    status: 'active',
    vehicleType: 'van',
    lastUpdate: new Date('2025-01-20T10:30:00Z'),
    currentDelivery: {
      id: 'DEL-001',
      destination: '123 Main St',
      eta: new Date('2025-01-20T11:00:00Z')
    }
  },
  {
    id: 'DRV-002',
    name: 'Sarah Johnson',
    lat: 40.7589,
    lng: -73.9851,
    status: 'idle',
    vehicleType: 'truck',
    lastUpdate: new Date('2025-01-20T10:25:00Z'),
    currentDelivery: null
  },
  {
    id: 'DRV-003',
    name: 'Mike Davis',
    lat: 40.7614,
    lng: -73.9776,
    status: 'active',
    vehicleType: 'car',
    lastUpdate: new Date('2025-01-20T10:35:00Z'),
    currentDelivery: {
      id: 'DEL-002',
      destination: '456 Broadway',
      eta: new Date('2025-01-20T11:15:00Z')
    }
  },
  {
    id: 'DRV-004',
    name: 'Lisa Chen',
    lat: 40.7505,
    lng: -73.9934,
    status: 'break',
    vehicleType: 'motorcycle',
    lastUpdate: new Date('2025-01-20T10:20:00Z'),
    currentDelivery: null
  },
  {
    id: 'DRV-005',
    name: 'David Wilson',
    lat: 40.7282,
    lng: -73.9942,
    status: 'offline',
    vehicleType: 'van',
    lastUpdate: new Date('2025-01-20T09:45:00Z'),
    currentDelivery: null
  }
]

// Generate clustered drivers for clustering demo
const generateClusteredDrivers = (count: number): DriverLocation[] => {
  const baseLocations = [
    { lat: 40.7128, lng: -74.0060 }, // Manhattan
    { lat: 40.6892, lng: -74.0445 }, // Brooklyn
    { lat: 40.7794, lng: -73.9632 }, // Upper East Side
    { lat: 40.7505, lng: -73.9934 }, // Midtown
    { lat: 40.7282, lng: -73.9942 }, // Lower Manhattan
  ]
  
  const statuses: Array<DriverLocation['status']> = ['active', 'idle', 'break', 'offline']
  const vehicleTypes: Array<DriverLocation['vehicleType']> = ['car', 'van', 'truck', 'motorcycle']
  
  return Array.from({ length: count }, (_, i) => {
    const baseLocation = baseLocations[i % baseLocations.length]
    const jitter = 0.01 // Small random offset for clustering
    
    return {
      id: `DRV-${String(i + 1).padStart(3, '0')}`,
      name: `Driver ${i + 1}`,
      lat: baseLocation.lat + (Math.random() - 0.5) * jitter,
      lng: baseLocation.lng + (Math.random() - 0.5) * jitter,
      status: statuses[i % statuses.length],
      vehicleType: vehicleTypes[i % vehicleTypes.length],
      lastUpdate: new Date(Date.now() - Math.random() * 3600000), // Random time in last hour
      currentDelivery: Math.random() > 0.5 ? {
        id: `DEL-${String(i + 1).padStart(3, '0')}`,
        destination: `${100 + i} Street`,
        eta: new Date(Date.now() + Math.random() * 3600000)
      } : null
    }
  })
}

// Mock container component for stories
const MapContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<mapboxgl.Map | undefined>(mockMap)
  
  useEffect(() => {
    // In a real app, this would initialize Mapbox GL
    // For Storybook, we use the mock map
    setMap(mockMap)
  }, [])
  
  return (
    <div 
      ref={mapContainerRef}
      style={{ 
        width: '100%', 
        height: '400px', 
        backgroundColor: '#f0f9ff',
        border: '2px dashed #0ea5e9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      <div style={{ 
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        color: '#0ea5e9',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        Map Container
        <br />
        <span style={{ fontSize: '12px', opacity: 0.7 }}>
          Driver markers would appear here
        </span>
      </div>
      {React.cloneElement(children as React.ReactElement, { map })}
    </div>
  )
}

const meta: Meta<typeof DriverMarkers> = {
  title: 'Map/DriverMarkers',
  component: DriverMarkers,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Interactive driver markers with clustering for map display. Supports real-time updates, status indicators, and accessibility features.'
      }
    },
    percy: {
      // Disable animation for consistent snapshots
      widths: [768, 1280],
    }
  },
  tags: ['autodocs'],
  argTypes: {
    drivers: {
      description: 'Array of driver location data'
    },
    onDriverClick: {
      action: 'driver-clicked',
      description: 'Callback when a driver marker is clicked'
    },
    nearestDriverId: {
      control: 'text',
      description: 'ID of the nearest driver to highlight'
    }
  },
  decorators: [
    (Story, context) => {
      // Add visual debugging
      React.useEffect(() => {
        const element = document.querySelector('[data-component="DriverMarkers"]') as HTMLElement
        if (element) {
          visualDebugger.addDebugAttributes(element, 'DriverMarkers', context.args)
        }
      })
      
      return (
        <MapContainer>
          <div data-component="DriverMarkers" data-testid="driver-markers">
            <Story />
          </div>
        </MapContainer>
      )
    }
  ]
}

export default meta
type Story = StoryObj<typeof meta>

// Basic driver markers
export const Default: Story = {
  args: {
    drivers: mockDrivers,
    onDriverClick: (driver) => console.log('Clicked driver:', driver.name),
    nearestDriverId: undefined
  }
}

// With nearest driver highlighted
export const WithNearestDriver: Story = {
  args: {
    drivers: mockDrivers,
    onDriverClick: (driver) => console.log('Clicked driver:', driver.name),
    nearestDriverId: 'DRV-001'
  }
}

// Driver status variations
export const ActiveDrivers: Story = {
  args: {
    drivers: mockDrivers.filter(d => d.status === 'active'),
    onDriverClick: (driver) => console.log('Clicked driver:', driver.name)
  }
}

export const IdleDrivers: Story = {
  args: {
    drivers: mockDrivers.filter(d => d.status === 'idle'),
    onDriverClick: (driver) => console.log('Clicked driver:', driver.name)
  }
}

export const OfflineDrivers: Story = {
  args: {
    drivers: mockDrivers.filter(d => d.status === 'offline'),
    onDriverClick: (driver) => console.log('Clicked driver:', driver.name)
  }
}

export const DriversOnBreak: Story = {
  args: {
    drivers: mockDrivers.filter(d => d.status === 'break'),
    onDriverClick: (driver) => console.log('Clicked driver:', driver.name)
  }
}

// Vehicle type variations
export const VehicleTypes: Story = {
  args: {
    drivers: [
      { ...mockDrivers[0], vehicleType: 'car', lat: 40.7128, lng: -74.0060 },
      { ...mockDrivers[1], vehicleType: 'van', lat: 40.7228, lng: -74.0060 },
      { ...mockDrivers[2], vehicleType: 'truck', lat: 40.7328, lng: -74.0060 },
      { ...mockDrivers[3], vehicleType: 'motorcycle', lat: 40.7428, lng: -74.0060 },
    ],
    onDriverClick: (driver) => console.log('Clicked driver:', driver.name)
  },
  parameters: {
    docs: {
      description: {
        story: 'Different vehicle types with their respective icons'
      }
    }
  }
}

// Drivers with deliveries
export const DriversWithDeliveries: Story = {
  args: {
    drivers: mockDrivers.filter(d => d.currentDelivery !== null),
    onDriverClick: (driver) => console.log('Clicked driver:', driver.name)
  }
}

// Large dataset for clustering
export const ClusteringDemo: Story = {
  args: {
    drivers: generateClusteredDrivers(50),
    onDriverClick: (driver) => console.log('Clicked driver:', driver.name)
  },
  parameters: {
    docs: {
      description: {
        story: 'Large dataset demonstrating clustering behavior with 50 drivers'
      }
    }
  }
}

// Performance test with many drivers
export const PerformanceTest: Story = {
  args: {
    drivers: generateClusteredDrivers(200),
    onDriverClick: (driver) => console.log('Clicked driver:', driver.name)
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance test with 200 drivers to test clustering and rendering efficiency'
      }
    }
  }
}

// Empty state
export const NoDrivers: Story = {
  args: {
    drivers: [],
    onDriverClick: (driver) => console.log('Clicked driver:', driver.name)
  }
}

// Single driver
export const SingleDriver: Story = {
  args: {
    drivers: [mockDrivers[0]],
    onDriverClick: (driver) => console.log('Clicked driver:', driver.name),
    nearestDriverId: mockDrivers[0].id
  }
}

// Real-time updates simulation
export const RealTimeUpdates: Story = {
  render: (args) => {
    const [drivers, setDrivers] = useState(mockDrivers)
    
    useEffect(() => {
      const interval = setInterval(() => {
        setDrivers(prevDrivers => 
          prevDrivers.map(driver => ({
            ...driver,
            lat: driver.lat + (Math.random() - 0.5) * 0.001, // Small movement
            lng: driver.lng + (Math.random() - 0.5) * 0.001,
            lastUpdate: new Date(),
            status: Math.random() > 0.9 ? 
              (['active', 'idle', 'break'] as const)[Math.floor(Math.random() * 3)] : 
              driver.status
          }))
        )
      }, 2000)
      
      return () => clearInterval(interval)
    }, [])
    
    return (
      <MapContainer>
        <div data-component="DriverMarkers" data-testid="driver-markers">
          <DriverMarkers 
            {...args}
            drivers={drivers}
            onDriverClick={(driver) => console.log('Clicked driver:', driver.name)}
          />
        </div>
      </MapContainer>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Simulates real-time driver location and status updates every 2 seconds'
      }
    }
  }
}

// Accessibility test
export const AccessibilityTest: Story = {
  args: {
    drivers: mockDrivers,
    onDriverClick: (driver) => console.log('Clicked driver:', driver.name),
    nearestDriverId: 'DRV-001'
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true
          },
          {
            id: 'keyboard-navigation',
            enabled: true
          },
          {
            id: 'aria-labels',
            enabled: true
          }
        ]
      }
    },
    docs: {
      description: {
        story: 'Accessibility test ensuring proper ARIA labels, keyboard navigation, and color contrast for driver markers'
      }
    }
  }
}

// Different status combinations
export const StatusMatrix: Story = {
  render: () => {
    const statuses: Array<DriverLocation['status']> = ['active', 'idle', 'break', 'offline']
    const vehicles: Array<DriverLocation['vehicleType']> = ['car', 'van', 'truck', 'motorcycle']
    
    const drivers = statuses.flatMap((status, statusIndex) =>
      vehicles.map((vehicleType, vehicleIndex) => ({
        id: `${status}-${vehicleType}`,
        name: `${status} ${vehicleType}`,
        lat: 40.7128 + (statusIndex * 0.01),
        lng: -74.0060 + (vehicleIndex * 0.01),
        status,
        vehicleType,
        lastUpdate: new Date(),
        currentDelivery: (statusIndex + vehicleIndex) % 2 === 0 ? {
          id: `DEL-${statusIndex}-${vehicleIndex}`,
          destination: 'Test Location',
          eta: new Date(Date.now() + 3600000)
        } : null
      }))
    )
    
    return (
      <MapContainer>
        <div data-component="DriverMarkers" data-testid="driver-markers">
          <DriverMarkers 
            drivers={drivers}
            onDriverClick={(driver) => console.log('Clicked driver:', driver.name)}
          />
        </div>
      </MapContainer>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Matrix of all status and vehicle type combinations for comprehensive testing'
      }
    }
  }
}

// Dark theme
export const DarkTheme: Story = {
  args: {
    drivers: mockDrivers,
    onDriverClick: (driver) => console.log('Clicked driver:', driver.name),
    nearestDriverId: 'DRV-001'
  },
  decorators: [
    (Story) => (
      <div style={{ backgroundColor: '#1f2937', padding: '20px', borderRadius: '8px' }}>
        <Story />
      </div>
    )
  ],
  parameters: {
    backgrounds: { default: 'dark' }
  }
}
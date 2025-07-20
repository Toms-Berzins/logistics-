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

export interface DriverCluster {
  id: string
  count: number
  lat: number
  lng: number
  drivers: DriverLocation[]
}
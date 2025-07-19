export interface JobRecord {
  id: string
  customer: string
  pickup: {
    address: string
    coordinates: [number, number]
    scheduledTime?: string
    contactName?: string
    contactPhone?: string
  }
  dropoff: {
    address: string
    coordinates: [number, number]
    scheduledTime?: string
    contactName?: string
    contactPhone?: string
  }
  status: JobStatus
  assignedDriver: Driver | null
  priority: JobPriority
  estimatedTime: {
    pickup: string
    delivery: string
    duration: number // minutes
  }
  createdAt: string
  updatedAt: string
  notes?: string
  packageInfo?: {
    weight?: number
    dimensions?: string
    specialHandling?: string[]
  }
}

export type JobStatus = 
  | 'pending'     // #6C757D - Waiting for assignment
  | 'assigned'    // #1C4E80 - Assigned to driver
  | 'in-transit' // #FFB400 - Driver is en route
  | 'delivered'   // #28A745 - Successfully delivered
  | 'delayed'     // #DC3545 - Behind schedule

export type JobPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Driver {
  id: string
  name: string
  phone: string
  email: string
  status: DriverStatus
  currentLocation?: {
    coordinates: [number, number]
    lastUpdated: string
  }
  vehicle: {
    type: 'car' | 'van' | 'truck' | 'motorcycle'
    licensePlate: string
    capacity?: number
  }
  rating?: number
  completedJobs?: number
}

export type DriverStatus = 'available' | 'busy' | 'offline' | 'en-route'

export interface JobFilters {
  status?: JobStatus[]
  priority?: JobPriority[]
  assignedDriver?: string[]
  dateRange?: {
    start: string
    end: string
  }
  searchTerm?: string
}

export interface JobTableColumn {
  id: string
  label: string
  sortable: boolean
  width?: number
  minWidth?: number
  accessor: keyof JobRecord | string
  hidden?: boolean
}

export interface DragDropResult {
  jobId: string
  driverId: string
  success: boolean
  error?: string
}

export interface JobUpdate {
  id: string
  field: keyof JobRecord
  value: unknown
  timestamp: string
  source: 'user' | 'system' | 'driver' | 'websocket'
}
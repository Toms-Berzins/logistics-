import AsyncStorage from '@react-native-async-storage/async-storage';
import io, { Socket } from 'socket.io-client';

// Types
interface LoginResult {
  success: boolean;
  token?: string;
  driverName?: string;
  message?: string;
}

interface Job {
  id: string;
  routeName: string;
  status: 'pending' | 'active' | 'completed';
  priority: 'low' | 'medium' | 'high';
  estimatedDuration: number;
  totalStops: number;
  completedStops: number;
  pickupLocation: {
    address: string;
    coordinates: [number, number];
  };
  deliveryLocations: Array<{
    id: string;
    address: string;
    coordinates: [number, number];
    customerName: string;
    deliveryWindow: string;
    status: 'pending' | 'completed';
  }>;
  assignedAt: string;
  dueBy: string;
}

interface ActiveJob {
  id: string;
  routeName: string;
  status: 'active' | 'paused' | 'completed';
  startedAt: string;
  estimatedDuration: number;
  pickupLocation: {
    address: string;
    coordinates: [number, number];
  };
  deliveryStops: Array<{
    id: string;
    address: string;
    coordinates: [number, number];
    customerName: string;
    deliveryWindow: string;
    status: 'pending' | 'in_transit' | 'completed' | 'failed';
    notes?: string;
    deliveredAt?: string;
    signature?: string;
  }>;
  currentStopIndex: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export class DriverService {
  private static instance: DriverService;
  private socket: Socket | null = null;
  private baseUrl: string;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    // Use environment variable or fallback to localhost
    this.baseUrl = process.env.REACT_NATIVE_API_URL || 'http://localhost:3001';
  }

  static getInstance(): DriverService {
    if (!DriverService.instance) {
      DriverService.instance = new DriverService();
    }
    return DriverService.instance;
  }

  // Authentication
  async login(driverId: string, pin: string): Promise<LoginResult> {
    try {
      // For demo purposes, simulate API call with mock data
      if (driverId === 'DEMO001' && pin === '1234') {
        return {
          success: true,
          token: 'demo-token-' + Date.now(),
          driverName: 'Demo Driver'
        };
      }

      // Simulate other valid drivers
      const demoDrivers = [
        { id: 'DRV001', pin: '1111', name: 'John Martinez' },
        { id: 'DRV002', pin: '2222', name: 'Sarah Johnson' },
        { id: 'DRV003', pin: '3333', name: 'Mike Chen' },
        { id: 'DRV004', pin: '4444', name: 'Emma Rodriguez' }
      ];

      const driver = demoDrivers.find(d => d.id === driverId && d.pin === pin);
      if (driver) {
        const token = `token-${driver.id}-${Date.now()}`;
        
        // Initialize socket connection after successful login
        await this.initializeSocket(token);
        
        return {
          success: true,
          token,
          driverName: driver.name
        };
      }

      return {
        success: false,
        message: 'Invalid driver ID or PIN'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Network error. Please try again.'
      };
    }
  }

  async verifyToken(token: string): Promise<boolean> {
    try {
      // For demo purposes, accept any non-empty token
      return token.length > 0;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }

  // Job Management
  async getAssignedJobs(): Promise<{ success: boolean; jobs: Job[]; message?: string }> {
    try {
      // Mock job data for demo
      const mockJobs: Job[] = [
        {
          id: 'job_001',
          routeName: 'Downtown Route A',
          status: 'pending',
          priority: 'high',
          estimatedDuration: 120,
          totalStops: 8,
          completedStops: 0,
          pickupLocation: {
            address: '123 Warehouse St, New York, NY 10001',
            coordinates: [-74.0059, 40.7128]
          },
          deliveryLocations: [
            {
              id: 'stop_001',
              address: '456 Broadway, New York, NY 10013',
              coordinates: [-74.0063, 40.7193],
              customerName: 'ABC Corp',
              deliveryWindow: '9:00 AM - 11:00 AM',
              status: 'pending'
            },
            {
              id: 'stop_002',
              address: '789 Wall St, New York, NY 10005',
              coordinates: [-74.0085, 40.7074],
              customerName: 'XYZ Inc',
              deliveryWindow: '11:30 AM - 1:30 PM',
              status: 'pending'
            }
          ],
          assignedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          dueBy: new Date(Date.now() + 14400000).toISOString() // 4 hours from now
        },
        {
          id: 'job_002',
          routeName: 'Midtown Express',
          status: 'active',
          priority: 'medium',
          estimatedDuration: 90,
          totalStops: 5,
          completedStops: 2,
          pickupLocation: {
            address: '321 Distribution Center, New York, NY 10018',
            coordinates: [-73.9857, 40.7549]
          },
          deliveryLocations: [
            {
              id: 'stop_003',
              address: '111 Times Square, New York, NY 10036',
              coordinates: [-73.9857, 40.7580],
              customerName: 'Times Corp',
              deliveryWindow: '2:00 PM - 4:00 PM',
              status: 'completed'
            }
          ],
          assignedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          dueBy: new Date(Date.now() + 10800000).toISOString() // 3 hours from now
        }
      ];

      return {
        success: true,
        jobs: mockJobs
      };
    } catch (error) {
      console.error('Error fetching jobs:', error);
      return {
        success: false,
        jobs: [],
        message: 'Failed to load jobs'
      };
    }
  }

  async getJobDetails(jobId: string): Promise<{ success: boolean; job?: ActiveJob; message?: string }> {
    try {
      // Mock active job data
      const mockJob: ActiveJob = {
        id: jobId,
        routeName: 'Downtown Route A',
        status: 'active',
        startedAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        estimatedDuration: 120,
        pickupLocation: {
          address: '123 Warehouse St, New York, NY 10001',
          coordinates: [-74.0059, 40.7128]
        },
        deliveryStops: [
          {
            id: 'stop_001',
            address: '456 Broadway, New York, NY 10013',
            coordinates: [-74.0063, 40.7193],
            customerName: 'ABC Corp',
            deliveryWindow: '9:00 AM - 11:00 AM',
            status: 'pending'
          },
          {
            id: 'stop_002',
            address: '789 Wall St, New York, NY 10005',
            coordinates: [-74.0085, 40.7074],
            customerName: 'XYZ Inc',
            deliveryWindow: '11:30 AM - 1:30 PM',
            status: 'pending'
          },
          {
            id: 'stop_003',
            address: '111 Fifth Ave, New York, NY 10003',
            coordinates: [-73.9925, 40.7370],
            customerName: 'Fifth Avenue Store',
            deliveryWindow: '2:00 PM - 4:00 PM',
            status: 'completed',
            deliveredAt: new Date(Date.now() - 900000).toISOString() // 15 minutes ago
          }
        ],
        currentStopIndex: 1
      };

      return {
        success: true,
        job: mockJob
      };
    } catch (error) {
      console.error('Error fetching job details:', error);
      return {
        success: false,
        message: 'Failed to load job details'
      };
    }
  }

  async startJob(jobId: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Simulate API call to start job
      console.log('Starting job:', jobId);
      
      // Emit socket event if connected
      if (this.socket) {
        this.socket.emit('job:started', { jobId, timestamp: new Date().toISOString() });
      }

      return {
        success: true,
        message: 'Job started successfully'
      };
    } catch (error) {
      console.error('Error starting job:', error);
      return {
        success: false,
        message: 'Failed to start job'
      };
    }
  }

  async completeDelivery(jobId: string, stopId: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Simulate API call to complete delivery
      console.log('Completing delivery:', { jobId, stopId });
      
      // Emit socket event if connected
      if (this.socket) {
        this.socket.emit('delivery:completed', { 
          jobId, 
          stopId, 
          timestamp: new Date().toISOString() 
        });
      }

      // Store offline if needed
      await this.storeOfflineAction('complete_delivery', { jobId, stopId });

      return {
        success: true,
        message: 'Delivery completed successfully'
      };
    } catch (error) {
      console.error('Error completing delivery:', error);
      return {
        success: false,
        message: 'Failed to complete delivery'
      };
    }
  }

  async reportDeliveryIssue(jobId: string, stopId: string, issueType: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Simulate API call to report issue
      console.log('Reporting delivery issue:', { jobId, stopId, issueType });
      
      // Emit socket event if connected
      if (this.socket) {
        this.socket.emit('delivery:issue', { 
          jobId, 
          stopId, 
          issueType, 
          timestamp: new Date().toISOString() 
        });
      }

      // Store offline if needed
      await this.storeOfflineAction('report_issue', { jobId, stopId, issueType });

      return {
        success: true,
        message: 'Issue reported successfully'
      };
    } catch (error) {
      console.error('Error reporting issue:', error);
      return {
        success: false,
        message: 'Failed to report issue'
      };
    }
  }

  async completeJob(jobId: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Simulate API call to complete job
      console.log('Completing job:', jobId);
      
      // Emit socket event if connected
      if (this.socket) {
        this.socket.emit('job:completed', { 
          jobId, 
          timestamp: new Date().toISOString() 
        });
      }

      return {
        success: true,
        message: 'Job completed successfully'
      };
    } catch (error) {
      console.error('Error completing job:', error);
      return {
        success: false,
        message: 'Failed to complete job'
      };
    }
  }

  // Socket.IO integration
  private async initializeSocket(token: string): Promise<void> {
    try {
      if (this.socket) {
        this.socket.disconnect();
      }

      const driverId = await AsyncStorage.getItem('driver_id');
      
      this.socket = io(this.baseUrl, {
        auth: {
          token,
          driverId,
          type: 'driver'
        },
        transports: ['websocket'],
        timeout: 10000
      });

      this.socket.on('connect', () => {
        console.log('Socket connected');
        this.emitEvent('socket:connected');
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this.emitEvent('socket:disconnected');
      });

      this.socket.on('job:assigned', (job) => {
        console.log('New job assigned:', job);
        this.emitEvent('job:assigned', job);
      });

      this.socket.on('job:updated', (jobUpdate) => {
        console.log('Job updated:', jobUpdate);
        this.emitEvent('job:updated', jobUpdate);
      });

      this.socket.on('message', (message) => {
        console.log('Received message:', message);
        this.emitEvent('message:received', message);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.emitEvent('socket:error', error);
      });

    } catch (error) {
      console.error('Error initializing socket:', error);
    }
  }

  // Event handling
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Offline support
  private async storeOfflineAction(type: string, data: any): Promise<void> {
    try {
      const offlineActions = await this.getOfflineActions();
      offlineActions.push({
        id: Date.now().toString(),
        type,
        data,
        timestamp: new Date().toISOString()
      });

      await AsyncStorage.setItem('offline_actions', JSON.stringify(offlineActions));
    } catch (error) {
      console.error('Error storing offline action:', error);
    }
  }

  private async getOfflineActions(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem('offline_actions');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting offline actions:', error);
      return [];
    }
  }

  async syncOfflineActions(): Promise<void> {
    try {
      const actions = await this.getOfflineActions();
      if (actions.length === 0) return;

      // Process each offline action
      for (const action of actions) {
        try {
          switch (action.type) {
            case 'complete_delivery':
              await this.completeDelivery(action.data.jobId, action.data.stopId);
              break;
            case 'report_issue':
              await this.reportDeliveryIssue(action.data.jobId, action.data.stopId, action.data.issueType);
              break;
            // Add more action types as needed
          }
        } catch (error) {
          console.error('Error syncing action:', action, error);
        }
      }

      // Clear offline actions after sync
      await AsyncStorage.removeItem('offline_actions');
      
    } catch (error) {
      console.error('Error syncing offline actions:', error);
    }
  }

  // Cleanup
  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }
}

// Export singleton instance
export default DriverService.getInstance();
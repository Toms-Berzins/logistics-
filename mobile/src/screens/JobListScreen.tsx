import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DriverService } from '../services/DriverService';
import { LocationService } from '../services/LocationService';

interface Job {
  id: string;
  routeName: string;
  status: 'pending' | 'active' | 'completed';
  priority: 'low' | 'medium' | 'high';
  estimatedDuration: number; // minutes
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

interface JobListScreenProps {
  navigation: any;
}

export default function JobListScreen({ navigation }: JobListScreenProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [locationService, setLocationService] = useState<LocationService | null>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);

  useEffect(() => {
    loadDriverData();
    initializeLocationService();
    loadJobs();
  }, []);

  const loadDriverData = async () => {
    try {
      const name = await AsyncStorage.getItem('driver_name');
      if (name) setDriverName(name);
    } catch (error) {
      console.error('Error loading driver data:', error);
    }
  };

  const initializeLocationService = async () => {
    try {
      const driverId = await AsyncStorage.getItem('driver_id');
      if (driverId) {
        const service = new LocationService(driverId);
        setLocationService(service);
        
        // Set up location service event listeners
        service.on('tracking:started', () => setIsTrackingLocation(true));
        service.on('tracking:stopped', () => setIsTrackingLocation(false));
        service.on('error', (error) => {
          console.error('Location service error:', error);
          Alert.alert('Location Error', 'Failed to start location tracking');
        });
      }
    } catch (error) {
      console.error('Error initializing location service:', error);
    }
  };

  const loadJobs = async () => {
    try {
      const driverService = new DriverService();
      const result = await driverService.getAssignedJobs();
      
      if (result.success) {
        setJobs(result.jobs);
      } else {
        Alert.alert('Error', 'Failed to load jobs');
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      Alert.alert('Error', 'Network error loading jobs');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadJobs();
    setIsRefreshing(false);
  }, []);

  const startJob = async (job: Job) => {
    Alert.alert(
      'Start Job',
      `Start route: ${job.routeName}?\n\nThis will begin location tracking and mark you as active.`,
      [
        { text: 'Cancel' },
        {
          text: 'Start',
          onPress: async () => {
            try {
              const driverService = new DriverService();
              const result = await driverService.startJob(job.id);
              
              if (result.success) {
                // Start location tracking
                if (locationService) {
                  await locationService.startTracking();
                  
                  // Set delivery locations for high accuracy tracking
                  const deliveryLocations = job.deliveryLocations.map(loc => ({
                    latitude: loc.coordinates[1],
                    longitude: loc.coordinates[0],
                    timestamp: Date.now(),
                    accuracy: 5
                  }));
                  locationService.setDeliveryLocations(deliveryLocations);
                }
                
                navigation.navigate('ActiveJob', { jobId: job.id });
              } else {
                Alert.alert('Error', result.message || 'Failed to start job');
              }
            } catch (error) {
              console.error('Error starting job:', error);
              Alert.alert('Error', 'Network error starting job');
            }
          }
        }
      ]
    );
  };

  const continueJob = (job: Job) => {
    navigation.navigate('ActiveJob', { jobId: job.id });
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Stop location tracking
              if (locationService) {
                await locationService.stopTracking();
              }
              
              // Clear auth data
              await AsyncStorage.multiRemove(['driver_token', 'driver_id', 'driver_name']);
              
              navigation.replace('Login');
            } catch (error) {
              console.error('Error during logout:', error);
            }
          }
        }
      ]
    );
  };

  const renderJobCard = ({ item: job }: { item: Job }) => {
    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'high': return '#dc2626';
        case 'medium': return '#d97706';
        case 'low': return '#059669';
        default: return '#6b7280';
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'pending': return 'Ready to Start';
        case 'active': return 'In Progress';
        case 'completed': return 'Completed';
        default: return status;
      }
    };

    const progress = job.totalStops > 0 ? (job.completedStops / job.totalStops) * 100 : 0;

    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => {
          if (job.status === 'pending') {
            startJob(job);
          } else if (job.status === 'active') {
            continueJob(job);
          }
        }}
        disabled={job.status === 'completed'}
      >
        <View style={styles.jobHeader}>
          <View style={styles.jobInfo}>
            <Text style={styles.jobTitle}>{job.routeName}</Text>
            <Text style={styles.jobSubtitle}>{job.totalStops} stops • {job.estimatedDuration} min</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(job.priority) }]}>
            <Text style={styles.priorityText}>{job.priority.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.jobDetails}>
          <Text style={styles.pickup}>📍 Pickup: {job.pickupLocation.address}</Text>
          <Text style={styles.dueBy}>⏰ Due by: {new Date(job.dueBy).toLocaleTimeString()}</Text>
        </View>

        {job.status === 'active' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {job.completedStops}/{job.totalStops} stops completed
            </Text>
          </View>
        )}

        <View style={styles.jobFooter}>
          <View style={[styles.statusBadge, { 
            backgroundColor: job.status === 'active' ? '#22c55e' : 
                           job.status === 'completed' ? '#6b7280' : '#3b82f6' 
          }]}>
            <Text style={styles.statusText}>{getStatusText(job.status)}</Text>
          </View>
          {job.status === 'pending' && (
            <Text style={styles.actionText}>Tap to start →</Text>
          )}
          {job.status === 'active' && (
            <Text style={styles.actionText}>Continue →</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading your jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {driverName}</Text>
          <Text style={styles.subtitle}>
            {jobs.filter(j => j.status === 'pending').length} jobs pending
            {isTrackingLocation && ' • 📍 Location active'}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJobCard}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No jobs assigned</Text>
            <Text style={styles.emptyText}>Pull down to refresh or check with your dispatcher</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  jobCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  jobSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  jobDetails: {
    marginBottom: 12,
  },
  pickup: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  dueBy: {
    fontSize: 14,
    color: '#374151',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
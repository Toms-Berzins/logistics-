import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { DriverService } from '../services/DriverService';
import { LocationService } from '../services/LocationService';

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

interface JobListScreenProps {
  navigation: any;
}

export default function JobListScreen({ navigation }: JobListScreenProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [locationService, setLocationService] = useState<LocationService | null>(null);

  useEffect(() => {
    initializeScreen();
    
    return () => {
      if (locationService) {
        locationService.stopTracking();
      }
    };
  }, []);

  const initializeScreen = async () => {
    try {
      const name = await SecureStore.getItemAsync('driver_name');
      const driverId = await SecureStore.getItemAsync('driver_id');
      
      if (name) setDriverName(name);
      
      if (driverId) {
        const locService = new LocationService(driverId);
        setLocationService(locService);
        await locService.startTracking();
      }
      
      await loadJobs();
    } catch (error) {
      console.error('Error initializing screen:', error);
    }
  };

  const loadJobs = async () => {
    try {
      const driverService = new DriverService();
      const result = await driverService.getAssignedJobs();
      
      if (result.success) {
        setJobs(result.jobs || []);
      } else {
        Alert.alert('Error', 'Failed to load jobs');
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      Alert.alert('Error', 'Network error loading jobs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadJobs();
  }, []);

  const handleStartJob = async (job: Job) => {
    try {
      const driverService = new DriverService();
      const result = await driverService.startJob(job.id);
      
      if (result.success) {
        navigation.navigate('ActiveJob', { jobId: job.id });
      } else {
        Alert.alert('Error', result.message || 'Failed to start job');
      }
    } catch (error) {
      console.error('Error starting job:', error);
      Alert.alert('Error', 'Network error starting job');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel' },
        { 
          text: 'Sign Out', 
          onPress: async () => {
            try {
              if (locationService) {
                await locationService.stopTracking();
              }
              
              await SecureStore.deleteItemAsync('driver_token');
              await SecureStore.deleteItemAsync('driver_id');
              await SecureStore.deleteItemAsync('driver_name');
              
              navigation.replace('Login');
            } catch (error) {
              console.error('Error during logout:', error);
            }
          }
        }
      ]
    );
  };

  const renderJobItem = ({ item: job }: { item: Job }) => {
    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'high': return '#ef4444';
        case 'medium': return '#f59e0b';
        case 'low': return '#10b981';
        default: return '#6b7280';
      }
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'active': return '#2563eb';
        case 'completed': return '#10b981';
        case 'pending': return '#6b7280';
        default: return '#6b7280';
      }
    };

    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => job.status === 'pending' ? handleStartJob(job) : null}
        disabled={job.status !== 'pending'}
      >
        <View style={styles.jobHeader}>
          <Text style={styles.routeName}>{job.routeName}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(job.priority) }]}>
            <Text style={styles.priorityText}>{job.priority.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.jobDetails}>
          <Text style={styles.jobInfo}>
            {job.completedStops}/{job.totalStops} stops • {job.estimatedDuration}min
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
            <Text style={styles.statusText}>{job.status.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.addressContainer}>
          <Text style={styles.addressLabel}>Pickup:</Text>
          <Text style={styles.address}>{job.pickupLocation.address}</Text>
        </View>
        
        <View style={styles.timeContainer}>
          <Text style={styles.timeLabel}>Due by: {new Date(job.dueBy).toLocaleTimeString()}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.driverName}>{driverName || 'Driver'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={jobs}
        renderItem={renderJobItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.jobsList}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#2563eb']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No jobs assigned</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  welcomeText: {
    fontSize: 16,
    color: '#64748b',
  },
  driverName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '500',
  },
  jobsList: {
    padding: 16,
  },
  jobCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  jobDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobInfo: {
    fontSize: 14,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addressContainer: {
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  address: {
    fontSize: 14,
    color: '#374151',
  },
  timeContainer: {
    marginTop: 8,
  },
  timeLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DriverService } from '../services/DriverService';
import { LocationService } from '../services/LocationService';

interface DeliveryStop {
  id: string;
  address: string;
  coordinates: [number, number];
  customerName: string;
  deliveryWindow: string;
  status: 'pending' | 'in_transit' | 'completed' | 'failed';
  notes?: string;
  deliveredAt?: string;
  signature?: string;
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
  deliveryStops: DeliveryStop[];
  currentStopIndex: number;
}

interface ActiveJobScreenProps {
  navigation: any;
  route: {
    params: {
      jobId: string;
    };
  };
}

export default function ActiveJobScreen({ navigation, route }: ActiveJobScreenProps) {
  const { jobId } = route.params;
  const [job, setJob] = useState<ActiveJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState({
    isTracking: false,
    accuracy: 'low' as 'high' | 'low',
    batteryLevel: 100
  });

  useEffect(() => {
    loadJobDetails();
    setupLocationMonitoring();
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      const driverService = new DriverService();
      const result = await driverService.getJobDetails(jobId);
      
      if (result.success) {
        setJob(result.job);
      } else {
        Alert.alert('Error', 'Failed to load job details');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading job details:', error);
      Alert.alert('Error', 'Network error loading job');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const setupLocationMonitoring = async () => {
    try {
      // Monitor location service status
      const checkLocationStatus = () => {
        // This would integrate with the LocationService
        // For demo purposes, we'll simulate status updates
        setLocationStatus({
          isTracking: true,
          accuracy: 'high',
          batteryLevel: Math.floor(Math.random() * 40) + 60 // 60-100%
        });
      };
      
      checkLocationStatus();
      const interval = setInterval(checkLocationStatus, 30000); // Check every 30s
      
      return () => clearInterval(interval);
    } catch (error) {
      console.error('Error setting up location monitoring:', error);
    }
  };

  const navigateToStop = async (stop: DeliveryStop) => {
    const [lat, lng] = stop.coordinates;
    
    // Create multiple URL options for different map apps
    const urls = {
      apple: Platform.OS === 'ios' ? `http://maps.apple.com/?daddr=${lat},${lng}` : null,
      google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      googleApp: `comgooglemaps://?daddr=${lat},${lng}`,
      waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
    };

    Alert.alert(
      'Choose Navigation App',
      `Navigate to:\n${stop.customerName}\n${stop.address}`,
      [
        { text: 'Cancel' },
        ...(Platform.OS === 'ios' ? [{ 
          text: 'Apple Maps', 
          onPress: () => openMapsApp(urls.apple, 'Apple Maps')
        }] : []),
        { 
          text: 'Google Maps', 
          onPress: () => openMapsApp(urls.googleApp, 'Google Maps', urls.google)
        },
        { 
          text: 'Waze', 
          onPress: () => openMapsApp(urls.waze, 'Waze')
        }
      ]
    );
  };

  const quickNavigate = async (stop: DeliveryStop) => {
    const [lat, lng] = stop.coordinates;
    
    // Try Google Maps app first, then fallback to web
    const googleAppUrl = `comgooglemaps://?daddr=${lat},${lng}`;
    const googleWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    
    try {
      const canOpenApp = await Linking.canOpenURL(googleAppUrl);
      if (canOpenApp) {
        await Linking.openURL(googleAppUrl);
      } else {
        await Linking.openURL(googleWebUrl);
      }
    } catch (error) {
      console.error('Error opening navigation:', error);
      Alert.alert('Error', 'Failed to open navigation. Please try again.');
    }
  };

  const openMapsApp = async (primaryUrl: string | null, appName: string, fallbackUrl?: string) => {
    if (!primaryUrl) {
      if (fallbackUrl) {
        await openMapsApp(fallbackUrl, appName);
      } else {
        Alert.alert('Error', `${appName} is not available on this platform`);
      }
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(primaryUrl);
      if (canOpen) {
        await Linking.openURL(primaryUrl);
      } else {
        // Try fallback URL (web version)
        if (fallbackUrl) {
          const canOpenFallback = await Linking.canOpenURL(fallbackUrl);
          if (canOpenFallback) {
            await Linking.openURL(fallbackUrl);
          } else {
            Alert.alert('Error', `Cannot open ${appName}. Please install the app or check your settings.`);
          }
        } else {
          Alert.alert('Error', `${appName} is not installed on this device.`);
        }
      }
    } catch (error) {
      console.error('Error opening maps app:', error);
      Alert.alert('Error', `Failed to open ${appName}. Please try again.`);
    }
  };

  const markStopCompleted = async (stopId: string) => {
    Alert.alert(
      'Complete Delivery',
      'Mark this delivery as completed?',
      [
        { text: 'Cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              const driverService = new DriverService();
              const result = await driverService.completeDelivery(jobId, stopId);
              
              if (result.success) {
                await loadJobDetails(); // Refresh job data
                Alert.alert('Success', 'Delivery marked as completed!');
              } else {
                Alert.alert('Error', result.message || 'Failed to complete delivery');
              }
            } catch (error) {
              console.error('Error completing delivery:', error);
              Alert.alert('Error', 'Network error completing delivery');
            }
          }
        }
      ]
    );
  };

  const reportIssue = (stopId: string) => {
    Alert.alert(
      'Report Issue',
      'What type of issue are you experiencing?',
      [
        { text: 'Cancel' },
        { text: 'Customer Not Available', onPress: () => handleIssue(stopId, 'customer_unavailable') },
        { text: 'Address Not Found', onPress: () => handleIssue(stopId, 'address_not_found') },
        { text: 'Vehicle Issue', onPress: () => handleIssue(stopId, 'vehicle_issue') },
        { text: 'Other', onPress: () => handleIssue(stopId, 'other') }
      ]
    );
  };

  const handleIssue = async (stopId: string, issueType: string) => {
    try {
      const driverService = new DriverService();
      const result = await driverService.reportDeliveryIssue(jobId, stopId, issueType);
      
      if (result.success) {
        Alert.alert('Issue Reported', 'Your dispatcher has been notified.');
        await loadJobDetails();
      } else {
        Alert.alert('Error', 'Failed to report issue');
      }
    } catch (error) {
      console.error('Error reporting issue:', error);
      Alert.alert('Error', 'Network error reporting issue');
    }
  };

  const completeJob = async () => {
    const pendingStops = job?.deliveryStops.filter(stop => stop.status === 'pending').length || 0;
    
    if (pendingStops > 0) {
      Alert.alert(
        'Incomplete Deliveries',
        `You have ${pendingStops} pending deliveries. Complete all deliveries before finishing the job.`
      );
      return;
    }

    Alert.alert(
      'Complete Job',
      'Mark this entire job as completed?',
      [
        { text: 'Cancel' },
        {
          text: 'Complete Job',
          onPress: async () => {
            try {
              const driverService = new DriverService();
              const result = await driverService.completeJob(jobId);
              
              if (result.success) {
                Alert.alert('Success', 'Job completed successfully!', [
                  { text: 'OK', onPress: () => navigation.navigate('JobList') }
                ]);
              } else {
                Alert.alert('Error', result.message || 'Failed to complete job');
              }
            } catch (error) {
              console.error('Error completing job:', error);
              Alert.alert('Error', 'Network error completing job');
            }
          }
        }
      ]
    );
  };

  if (isLoading || !job) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  const completedStops = job.deliveryStops.filter(stop => stop.status === 'completed').length;
  const progress = (completedStops / job.deliveryStops.length) * 100;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.routeName}>{job.routeName}</Text>
          <Text style={styles.progressText}>
            {completedStops}/{job.deliveryStops.length} completed
          </Text>
        </View>
        <View style={styles.locationStatus}>
          <View style={[styles.statusDot, { 
            backgroundColor: locationStatus.isTracking ? '#22c55e' : '#ef4444' 
          }]} />
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Pickup Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Pickup Location</Text>
          <Text style={styles.address}>{job.pickupLocation.address}</Text>
        </View>

        {/* Delivery Stops */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚚 Delivery Stops</Text>
          {job.deliveryStops.map((stop, index) => (
            <View key={stop.id} style={styles.stopCard}>
              <View style={styles.stopHeader}>
                <View style={styles.stopNumber}>
                  <Text style={styles.stopNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stopInfo}>
                  <Text style={styles.customerName}>{stop.customerName}</Text>
                  <Text style={styles.stopAddress}>{stop.address}</Text>
                  <Text style={styles.deliveryWindow}>🕒 {stop.deliveryWindow}</Text>
                </View>
                <View style={[styles.statusBadge, { 
                  backgroundColor: 
                    stop.status === 'completed' ? '#22c55e' :
                    stop.status === 'in_transit' ? '#3b82f6' :
                    stop.status === 'failed' ? '#ef4444' : '#6b7280'
                }]}>
                  <Text style={styles.statusText}>
                    {stop.status === 'completed' ? '✓' :
                     stop.status === 'in_transit' ? '→' :
                     stop.status === 'failed' ? '✗' : '○'}
                  </Text>
                </View>
              </View>

              {stop.status === 'pending' && (
                <View style={styles.stopActions}>
                  <TouchableOpacity
                    style={styles.navigateButton}
                    onPress={() => navigateToStop(stop)}
                  >
                    <Text style={styles.navigateButtonText}>🗺️ Navigate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => markStopCompleted(stop.id)}
                  >
                    <Text style={styles.completeButtonText}>Complete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.issueButton}
                    onPress={() => reportIssue(stop.id)}
                  >
                    <Text style={styles.issueButtonText}>Issue</Text>
                  </TouchableOpacity>
                </View>
              )}

              {stop.status === 'completed' && stop.deliveredAt && (
                <Text style={styles.completedText}>
                  ✓ Delivered at {new Date(stop.deliveredAt).toLocaleTimeString()}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Location Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Location Status</Text>
          <View style={styles.locationInfo}>
            <Text style={styles.locationItem}>
              Tracking: {locationStatus.isTracking ? 'Active' : 'Inactive'}
            </Text>
            <Text style={styles.locationItem}>
              Accuracy: {locationStatus.accuracy}
            </Text>
            <Text style={styles.locationItem}>
              Battery: {locationStatus.batteryLevel}%
            </Text>
          </View>
        </View>

        {/* Complete Job Button */}
        {completedStops === job.deliveryStops.length && (
          <TouchableOpacity style={styles.completeJobButton} onPress={completeJob}>
            <Text style={styles.completeJobButtonText}>Complete Job</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
    backgroundColor: '#2563eb',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  routeName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressText: {
    color: '#bfdbfe',
    fontSize: 14,
  },
  locationStatus: {
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  progressContainer: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#1e40af',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  address: {
    fontSize: 16,
    color: '#374151',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stopCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stopNumberText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stopInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  stopAddress: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  deliveryWindow: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stopActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  navigateButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  navigateButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  issueButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  issueButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  completedText: {
    marginTop: 8,
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '500',
  },
  locationInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  locationItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  completeJobButton: {
    backgroundColor: '#22c55e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
  },
  completeJobButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DriverService } from '../services/DriverService';

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [driverId, setDriverId] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('driver_token');
      const savedDriverId = await AsyncStorage.getItem('driver_id');
      
      if (token && savedDriverId) {
        // Verify token is still valid
        const driverService = new DriverService();
        const isValid = await driverService.verifyToken(token);
        
        if (isValid) {
          navigation.replace('JobList');
          return;
        } else {
          // Clear invalid token
          await AsyncStorage.multiRemove(['driver_token', 'driver_id']);
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogin = async () => {
    if (!driverId.trim() || !pin.trim()) {
      Alert.alert('Error', 'Please enter both Driver ID and PIN');
      return;
    }

    setIsLoading(true);
    
    try {
      const driverService = new DriverService();
      const result = await driverService.login(driverId, pin);
      
      if (result.success) {
        // Store auth data
        await AsyncStorage.multiSet([
          ['driver_token', result.token],
          ['driver_id', driverId],
          ['driver_name', result.driverName]
        ]);
        
        Alert.alert('Success', `Welcome back, ${result.driverName}!`, [
          { text: 'OK', onPress: () => navigation.replace('JobList') }
        ]);
      } else {
        Alert.alert('Login Failed', result.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemo = () => {
    Alert.alert(
      'Demo Mode',
      'Use demo credentials?\nDriver ID: DEMO001\nPIN: 1234',
      [
        { text: 'Cancel' },
        { 
          text: 'Use Demo', 
          onPress: () => {
            setDriverId('DEMO001');
            setPin('1234');
          }
        }
      ]
    );
  };

  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>LogiTrack Driver</Text>
          <Text style={styles.subtitle}>Mobile Logistics Platform</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Driver ID</Text>
            <TextInput
              style={styles.input}
              value={driverId}
              onChangeText={setDriverId}
              placeholder="Enter your driver ID"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>PIN</Text>
            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={setPin}
              placeholder="Enter your PIN"
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.demoButton}
            onPress={handleDemo}
            disabled={isLoading}
          >
            <Text style={styles.demoButtonText}>Use Demo Credentials</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Having trouble signing in?{'\n'}
            Contact your dispatcher for assistance.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
  },
  loginButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  demoButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
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
import { useAuth } from '../contexts/AuthContext';

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [driverId, setDriverId] = useState('');
  const [pin, setPin] = useState('');
  const { login, isLoading, error, isAuthenticated, clearError } = useAuth();

  // Navigate to main app when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace('JobList');
    }
  }, [isAuthenticated, navigation]);

  // Clear error when component unmounts or inputs change
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [driverId, pin]);

  const handleLogin = async () => {
    if (!driverId.trim() || !pin.trim()) {
      Alert.alert('Error', 'Please enter both Driver ID and PIN');
      return;
    }

    try {
      const success = await login({ driverId: driverId.trim(), pin: pin.trim() });
      
      if (success) {
        // Success feedback - navigation will happen automatically via useEffect
        Alert.alert('Success', 'Welcome back!');
      } else {
        // Error is handled by AuthContext and displayed below
        console.log('Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
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

  const handleForgotCredentials = () => {
    Alert.alert(
      'Forgot Credentials',
      'Contact your dispatcher or fleet manager to reset your credentials.',
      [
        { text: 'OK' },
        { 
          text: 'Use Demo', 
          onPress: handleDemo
        }
      ]
    );
  };

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
          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Driver ID</Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              value={driverId}
              onChangeText={setDriverId}
              placeholder="Enter your driver ID"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isLoading}
              testID="driver-id-input"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>PIN</Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              value={pin}
              onChangeText={setPin}
              placeholder="Enter your PIN"
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              editable={!isLoading}
              testID="pin-input"
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={isLoading}
            testID="login-button"
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
            testID="demo-button"
          >
            <Text style={styles.demoButtonText}>Use Demo Credentials</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotButton}
            onPress={handleForgotCredentials}
            disabled={isLoading}
          >
            <Text style={styles.forgotButtonText}>Forgot your credentials?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Having trouble signing in?{'\n'}
            Contact your dispatcher for assistance.
          </Text>
          <Text style={styles.versionText}>v1.0.0</Text>
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
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
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
  inputError: {
    borderColor: '#dc2626',
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
  forgotButton: {
    marginTop: 8,
    padding: 8,
    alignItems: 'center',
  },
  forgotButtonText: {
    color: '#6b7280',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  versionText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
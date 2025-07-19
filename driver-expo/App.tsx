import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';

// Contexts
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import JobListScreen from './src/screens/JobListScreen';
import ActiveJobScreen from './src/screens/ActiveJobScreen';

export type RootStackParamList = {
  Login: undefined;
  JobList: undefined;
  ActiveJob: { jobId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

// Loading screen component
function LoadingScreen() {
  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f8fafc'
    }}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={{
        marginTop: 16,
        fontSize: 16,
        color: '#64748b'
      }}>
        Initializing LogiTrack...
      </Text>
    </View>
  );
}

// Main app navigation component
function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? "JobList" : "Login"}
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{
            title: 'Sign In',
            headerShown: false
          }}
        />
        <Stack.Screen 
          name="JobList" 
          component={JobListScreen}
          options={{
            title: 'Jobs',
            headerShown: false,
            gestureEnabled: false
          }}
        />
        <Stack.Screen 
          name="ActiveJob" 
          component={ActiveJobScreen}
          options={{
            title: 'Active Job',
            headerShown: false
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Root app component with providers
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
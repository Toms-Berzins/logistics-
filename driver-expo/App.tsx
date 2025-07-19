import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

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

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
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
    </SafeAreaProvider>
  );
}
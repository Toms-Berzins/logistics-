# Logistics Driver - Expo App

A React Native Expo application for logistics drivers to manage deliveries and track routes.

## Features

- **Driver Authentication**: Secure login with driver ID and PIN
- **Job Management**: View assigned jobs and delivery routes
- **Real-time Location Tracking**: GPS tracking with background support
- **Offline Support**: Queue locations when offline and sync when connected
- **Demo Mode**: Test with demo credentials (DEMO001/1234)

## Getting Started

### Prerequisites

- Node.js 18+ 
- Expo CLI: `npm install -g @expo/cli`
- Expo Go app on your phone

### Installation

1. **Install dependencies:**
   ```bash
   cd driver-expo
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Test on your phone:**
   - Open Expo Go app
   - Scan the QR code from the terminal
   - The app will load on your device

### Demo Credentials

Use these credentials to test the app:

- **Driver ID**: `DEMO001`
- **PIN**: `1234`

Other available demo drivers:
- DRV001 / 5678 (John Martinez)
- DRV002 / 9012 (Sarah Johnson)  
- DRV003 / 3456 (Mike Chen)
- DRV004 / 7890 (Emma Rodriguez)

## App Structure

```
src/
├── screens/
│   ├── LoginScreen.tsx      # Driver authentication
│   ├── JobListScreen.tsx    # Job management
│   └── ActiveJobScreen.tsx  # Active job details
└── services/
    ├── DriverService.ts     # Job and authentication API
    └── LocationService.ts   # GPS tracking service
```

## Key Features

### Location Tracking
- Uses Expo Location for GPS tracking
- Background location updates
- Offline queue with automatic sync
- Geofencing capabilities

### Authentication
- Secure storage with Expo SecureStore
- Token-based authentication
- Auto-login with saved credentials

### Real-time Updates
- Socket.io integration for live job updates
- Push notifications for new assignments
- Connection status monitoring

## Testing

The app includes comprehensive demo data:
- Mock delivery routes in NYC area
- Simulated job assignments
- Demo location tracking

## Production Setup

To connect to a real backend:

1. Update API URLs in services
2. Configure proper authentication endpoints
3. Set up push notification certificates
4. Enable production location services

## Permissions

The app requests these permissions:
- **Location**: For driver tracking and navigation
- **Background Location**: For continuous tracking
- **Notifications**: For job alerts and updates

## Build

For production builds:

```bash
# Build for Android
expo build:android

# Build for iOS  
expo build:ios
```

## Troubleshooting

- **Location not working**: Check device location permissions
- **Demo login fails**: Ensure correct credentials (DEMO001/1234)
- **App won't load**: Check Expo Go app is latest version
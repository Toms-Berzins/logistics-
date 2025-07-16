/**
 * Load Testing Script for Driver Tracking System
 * 
 * This script simulates multiple drivers sending location updates
 * to test the performance and scalability of the tracking system.
 * 
 * Usage: node scripts/loadTest.js [options]
 */

const io = require('socket.io-client');
const axios = require('axios');

// Configuration
const CONFIG = {
  serverUrl: process.env.SERVER_URL || 'http://localhost:3001',
  apiUrl: process.env.API_URL || 'http://localhost:3001/api',
  numDrivers: parseInt(process.env.NUM_DRIVERS) || 50,
  updateIntervalMs: parseInt(process.env.UPDATE_INTERVAL_MS) || 5000,
  testDurationMs: parseInt(process.env.TEST_DURATION_MS) || 300000, // 5 minutes
  companyId: process.env.COMPANY_ID || 'load-test-company',
  batchSize: parseInt(process.env.BATCH_SIZE) || 1,
  enableApiTesting: process.env.ENABLE_API_TESTING === 'true',
  enableSocketTesting: process.env.ENABLE_SOCKET_TESTING !== 'false',
};

// Test statistics
const stats = {
  totalLocationUpdates: 0,
  successfulUpdates: 0,
  failedUpdates: 0,
  totalLatency: 0,
  maxLatency: 0,
  minLatency: Infinity,
  connectedDrivers: 0,
  startTime: Date.now(),
  errors: [],
};

// Driver simulation class
class SimulatedDriver {
  constructor(driverId, companyId, useSocket = true) {
    this.driverId = driverId;
    this.companyId = companyId;
    this.useSocket = useSocket;
    this.isConnected = false;
    this.socket = null;
    this.currentLocation = this.generateRandomLocation();
    this.updateCount = 0;
    this.errorCount = 0;
  }

  // Generate random location (within continental US)
  generateRandomLocation() {
    return {
      latitude: 25 + Math.random() * 25, // 25-50 degrees (roughly continental US)
      longitude: -125 + Math.random() * 50, // -125 to -75 degrees
      accuracy: 5 + Math.random() * 20,
      speed: Math.random() * 30, // 0-30 m/s
      heading: Math.random() * 360,
      altitude: Math.random() * 1000,
    };
  }

  // Simulate movement (small random changes)
  updateLocation() {
    this.currentLocation = {
      latitude: this.currentLocation.latitude + (Math.random() - 0.5) * 0.001,
      longitude: this.currentLocation.longitude + (Math.random() - 0.5) * 0.001,
      accuracy: 5 + Math.random() * 20,
      speed: Math.max(0, this.currentLocation.speed + (Math.random() - 0.5) * 5),
      heading: (this.currentLocation.heading + (Math.random() - 0.5) * 10) % 360,
      altitude: Math.max(0, this.currentLocation.altitude + (Math.random() - 0.5) * 50),
    };
  }

  // Connect via Socket.io
  async connectSocket() {
    return new Promise((resolve, reject) => {
      this.socket = io(CONFIG.serverUrl, {
        transports: ['websocket'],
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log(`Driver ${this.driverId} connected via socket`);
        
        // Authenticate
        this.socket.emit('authenticate', {
          userId: `user-${this.driverId}`,
          companyId: this.companyId,
          userType: 'driver',
          driverId: this.driverId,
        });
      });

      this.socket.on('authenticated', () => {
        this.isConnected = true;
        stats.connectedDrivers++;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error(`Driver ${this.driverId} connection failed:`, error.message);
        stats.errors.push(`Connection failed for ${this.driverId}: ${error.message}`);
        reject(error);
      });

      this.socket.on('error', (error) => {
        console.error(`Socket error for driver ${this.driverId}:`, error);
        this.errorCount++;
        stats.errors.push(`Socket error for ${this.driverId}: ${error.message || error}`);
      });

      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error(`Connection timeout for driver ${this.driverId}`));
        }
      }, 15000);
    });
  }

  // Send location update via Socket.io
  async sendSocketLocationUpdate() {
    if (!this.isConnected || !this.socket) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const locationData = {
        ...this.currentLocation,
        timestamp: new Date().toISOString(),
      };

      this.socket.emit('driver:location_update', locationData);

      this.socket.once('location_updated', (response) => {
        const latency = Date.now() - startTime;
        this.updateLatencyStats(latency);
        
        if (response.success) {
          this.updateCount++;
          stats.successfulUpdates++;
          resolve(latency);
        } else {
          this.errorCount++;
          stats.failedUpdates++;
          reject(new Error('Location update failed'));
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        this.errorCount++;
        stats.failedUpdates++;
        reject(new Error('Location update timeout'));
      }, 10000);
    });
  }

  // Send location update via REST API
  async sendApiLocationUpdate() {
    const startTime = Date.now();
    
    try {
      const locationData = {
        ...this.currentLocation,
        timestamp: new Date().toISOString(),
      };

      const response = await axios.post(
        `${CONFIG.apiUrl}/drivers/${this.driverId}/location`,
        locationData,
        {
          headers: {
            'x-driver-id': this.driverId,
            'x-company-id': this.companyId,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const latency = Date.now() - startTime;
      this.updateLatencyStats(latency);
      
      if (response.data.success) {
        this.updateCount++;
        stats.successfulUpdates++;
        return latency;
      } else {
        throw new Error('API response indicates failure');
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      this.errorCount++;
      stats.failedUpdates++;
      stats.errors.push(`API error for ${this.driverId}: ${error.message}`);
      throw error;
    }
  }

  // Update latency statistics
  updateLatencyStats(latency) {
    stats.totalLatency += latency;
    stats.maxLatency = Math.max(stats.maxLatency, latency);
    stats.minLatency = Math.min(stats.minLatency, latency);
  }

  // Start sending regular location updates
  startLocationUpdates() {
    const updateInterval = setInterval(async () => {
      try {
        this.updateLocation();
        stats.totalLocationUpdates++;

        if (this.useSocket && CONFIG.enableSocketTesting) {
          await this.sendSocketLocationUpdate();
        } else if (CONFIG.enableApiTesting) {
          await this.sendApiLocationUpdate();
        }

      } catch (error) {
        console.error(`Update failed for driver ${this.driverId}:`, error.message);
      }
    }, CONFIG.updateIntervalMs + Math.random() * 1000); // Add some jitter

    // Stop after test duration
    setTimeout(() => {
      clearInterval(updateInterval);
      if (this.socket) {
        this.socket.disconnect();
      }
    }, CONFIG.testDurationMs);

    return updateInterval;
  }

  // Get driver statistics
  getStats() {
    return {
      driverId: this.driverId,
      updateCount: this.updateCount,
      errorCount: this.errorCount,
      errorRate: this.updateCount > 0 ? (this.errorCount / this.updateCount) * 100 : 0,
      isConnected: this.isConnected,
    };
  }
}

// Main load test function
async function runLoadTest() {
  console.log('🚀 Starting Driver Tracking Load Test');
  console.log('Configuration:', CONFIG);
  console.log('----------------------------------------');

  const drivers = [];
  
  // Create simulated drivers
  for (let i = 0; i < CONFIG.numDrivers; i++) {
    const driver = new SimulatedDriver(
      `load-test-driver-${i}`,
      CONFIG.companyId,
      CONFIG.enableSocketTesting
    );
    drivers.push(driver);
  }

  // Connect all drivers (if using sockets)
  if (CONFIG.enableSocketTesting) {
    console.log(`Connecting ${CONFIG.numDrivers} drivers...`);
    
    const connectionPromises = drivers.map(async (driver, index) => {
      // Stagger connections to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, index * 100));
      
      try {
        await driver.connectSocket();
      } catch (error) {
        console.error(`Failed to connect driver ${driver.driverId}:`, error.message);
      }
    });

    await Promise.all(connectionPromises);
    console.log(`✅ Connected ${stats.connectedDrivers} out of ${CONFIG.numDrivers} drivers`);
  }

  // Start location updates for all drivers
  console.log('📍 Starting location updates...');
  const updateIntervals = drivers.map(driver => driver.startLocationUpdates());

  // Print periodic statistics
  const statsInterval = setInterval(() => {
    printStats(drivers);
  }, 10000); // Every 10 seconds

  // Wait for test completion
  await new Promise(resolve => setTimeout(resolve, CONFIG.testDurationMs));

  // Clean up
  clearInterval(statsInterval);
  updateIntervals.forEach(interval => clearInterval(interval));

  // Print final results
  console.log('\n🏁 Load Test Completed');
  console.log('======================');
  printFinalStats(drivers);
}

// Print current statistics
function printStats(drivers) {
  const now = Date.now();
  const elapsedSeconds = (now - stats.startTime) / 1000;
  const updatesPerSecond = stats.totalLocationUpdates / elapsedSeconds;
  const averageLatency = stats.totalLocationUpdates > 0 ? stats.totalLatency / stats.totalLocationUpdates : 0;
  const successRate = stats.totalLocationUpdates > 0 ? (stats.successfulUpdates / stats.totalLocationUpdates) * 100 : 0;

  console.log(`\n📊 Stats (${elapsedSeconds.toFixed(0)}s elapsed):`);
  console.log(`   Connected Drivers: ${stats.connectedDrivers}`);
  console.log(`   Total Updates: ${stats.totalLocationUpdates}`);
  console.log(`   Successful: ${stats.successfulUpdates} (${successRate.toFixed(1)}%)`);
  console.log(`   Failed: ${stats.failedUpdates}`);
  console.log(`   Updates/sec: ${updatesPerSecond.toFixed(2)}`);
  console.log(`   Avg Latency: ${averageLatency.toFixed(2)}ms`);
  console.log(`   Min Latency: ${stats.minLatency === Infinity ? 'N/A' : stats.minLatency.toFixed(2)}ms`);
  console.log(`   Max Latency: ${stats.maxLatency.toFixed(2)}ms`);
  
  if (stats.errors.length > 0) {
    console.log(`   Recent Errors: ${stats.errors.slice(-3).join(', ')}`);
  }
}

// Print final test results
function printFinalStats(drivers) {
  const elapsedSeconds = (Date.now() - stats.startTime) / 1000;
  const updatesPerSecond = stats.totalLocationUpdates / elapsedSeconds;
  const averageLatency = stats.totalLocationUpdates > 0 ? stats.totalLatency / stats.totalLocationUpdates : 0;
  const successRate = stats.totalLocationUpdates > 0 ? (stats.successfulUpdates / stats.totalLocationUpdates) * 100 : 0;

  console.log(`Test Duration: ${elapsedSeconds.toFixed(1)} seconds`);
  console.log(`Total Drivers: ${CONFIG.numDrivers}`);
  console.log(`Connected Drivers: ${stats.connectedDrivers}`);
  console.log(`Total Location Updates: ${stats.totalLocationUpdates}`);
  console.log(`Successful Updates: ${stats.successfulUpdates}`);
  console.log(`Failed Updates: ${stats.failedUpdates}`);
  console.log(`Success Rate: ${successRate.toFixed(2)}%`);
  console.log(`Updates per Second: ${updatesPerSecond.toFixed(2)}`);
  console.log(`Average Latency: ${averageLatency.toFixed(2)}ms`);
  console.log(`Min Latency: ${stats.minLatency === Infinity ? 'N/A' : stats.minLatency.toFixed(2)}ms`);
  console.log(`Max Latency: ${stats.maxLatency.toFixed(2)}ms`);

  // Performance assessment
  console.log('\n🎯 Performance Assessment:');
  
  if (averageLatency < 100) {
    console.log('✅ Latency: EXCELLENT (< 100ms)');
  } else if (averageLatency < 200) {
    console.log('✅ Latency: GOOD (< 200ms)');
  } else {
    console.log('❌ Latency: POOR (>= 200ms)');
  }

  if (successRate >= 99) {
    console.log('✅ Reliability: EXCELLENT (>= 99%)');
  } else if (successRate >= 95) {
    console.log('✅ Reliability: GOOD (>= 95%)');
  } else {
    console.log('❌ Reliability: POOR (< 95%)');
  }

  if (updatesPerSecond >= 100) {
    console.log('✅ Throughput: EXCELLENT (>= 100 updates/s)');
  } else if (updatesPerSecond >= 50) {
    console.log('✅ Throughput: GOOD (>= 50 updates/s)');
  } else {
    console.log('❌ Throughput: POOR (< 50 updates/s)');
  }

  // Error summary
  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors (${stats.errors.length} total):`);
    const errorCounts = {};
    stats.errors.forEach(error => {
      const key = error.split(':')[1] || error;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    Object.entries(errorCounts).forEach(([error, count]) => {
      console.log(`   ${error}: ${count} occurrences`);
    });
  }

  // Driver statistics
  const driverStats = drivers.map(d => d.getStats());
  const avgDriverUpdates = driverStats.reduce((sum, s) => sum + s.updateCount, 0) / drivers.length;
  const avgDriverErrors = driverStats.reduce((sum, s) => sum + s.errorCount, 0) / drivers.length;
  
  console.log(`\n👥 Driver Statistics:`);
  console.log(`   Average Updates per Driver: ${avgDriverUpdates.toFixed(1)}`);
  console.log(`   Average Errors per Driver: ${avgDriverErrors.toFixed(1)}`);
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
Driver Tracking Load Test

Usage: node scripts/loadTest.js [options]

Environment Variables:
  SERVER_URL          Socket.io server URL (default: http://localhost:3001)
  API_URL            REST API base URL (default: http://localhost:3001/api)
  NUM_DRIVERS        Number of simulated drivers (default: 50)
  UPDATE_INTERVAL_MS Update interval in milliseconds (default: 5000)
  TEST_DURATION_MS   Test duration in milliseconds (default: 300000)
  COMPANY_ID         Company ID for testing (default: load-test-company)
  BATCH_SIZE         Batch size for updates (default: 1)
  ENABLE_API_TESTING Enable REST API testing (default: false)
  ENABLE_SOCKET_TESTING Enable Socket.io testing (default: true)

Examples:
  # Basic test with 50 drivers for 5 minutes
  node scripts/loadTest.js

  # Stress test with 200 drivers for 10 minutes
  NUM_DRIVERS=200 TEST_DURATION_MS=600000 node scripts/loadTest.js

  # API-only testing
  ENABLE_SOCKET_TESTING=false ENABLE_API_TESTING=true node scripts/loadTest.js
  `);
  process.exit(0);
}

// Run the load test
runLoadTest().catch(error => {
  console.error('Load test failed:', error);
  process.exit(1);
});
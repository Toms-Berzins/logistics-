'use client';

import { DriverLocation, DriverStatus } from '../hooks/useDriverTracking';

export type DriverIntent = 'available' | 'busy' | 'returning' | 'offline' | 'en_route';

export interface DriverIntentPrediction {
  driverId: string;
  intent: DriverIntent;
  confidence: number; // 0-1
  factors: {
    speedPattern: number;
    locationHistory: number;
    timeOfDay: number;
    batteryLevel: number;
    activityLevel: number;
  };
  estimatedTimeToNextAction?: number; // in minutes
}

export interface ClusterMetrics {
  availableCount: number;
  busyCount: number;
  returningCount: number;
  offlineCount: number;
  enRouteCount: number;
  avgConfidence: number;
  dominantIntent: DriverIntent;
}

class DriverIntentPredictor {
  private locationHistory: Map<string, DriverLocation[]> = new Map();
  private statusHistory: Map<string, DriverStatus[]> = new Map();
  private maxHistoryLength = 50;

  // Update driver location and status history
  updateDriverData(driverId: string, location: DriverLocation, status?: DriverStatus) {
    // Update location history
    const locations = this.locationHistory.get(driverId) || [];
    locations.push(location);
    if (locations.length > this.maxHistoryLength) {
      locations.shift();
    }
    this.locationHistory.set(driverId, locations);

    // Update status history
    if (status) {
      const statuses = this.statusHistory.get(driverId) || [];
      statuses.push(status);
      if (statuses.length > this.maxHistoryLength) {
        statuses.shift();
      }
      this.statusHistory.set(driverId, statuses);
    }
  }

  // Predict driver intent based on various factors
  predictIntent(driverId: string, currentLocation: DriverLocation, currentStatus?: DriverStatus): DriverIntentPrediction {
    const locations = this.locationHistory.get(driverId) || [];
    const statuses = this.statusHistory.get(driverId) || [];

    // Calculate individual factors
    const speedPattern = this.analyzeSpeedPattern(locations);
    const locationHistory = this.analyzeLocationPattern(locations);
    const timeOfDay = this.analyzeTimeOfDay();
    const batteryLevel = this.analyzeBatteryLevel(statuses);
    const activityLevel = this.analyzeActivityLevel(locations, statuses);

    // Combine factors to predict intent
    const intent = this.combineFactorsToIntent({
      speedPattern,
      locationHistory,
      timeOfDay,
      batteryLevel,
      activityLevel,
    }, currentStatus);

    // Calculate confidence based on data quality and consistency
    const confidence = this.calculateConfidence(locations, statuses, {
      speedPattern,
      locationHistory,
      timeOfDay,
      batteryLevel,
      activityLevel,
    });

    // Estimate time to next action
    const estimatedTimeToNextAction = this.estimateNextAction(intent, {
      speedPattern,
      locationHistory,
      timeOfDay,
      batteryLevel,
      activityLevel,
    });

    return {
      driverId,
      intent,
      confidence,
      factors: {
        speedPattern,
        locationHistory,
        timeOfDay,
        batteryLevel,
        activityLevel,
      },
      estimatedTimeToNextAction,
    };
  }

  // Analyze speed patterns to determine intent
  private analyzeSpeedPattern(locations: DriverLocation[]): number {
    if (locations.length < 2) return 0.5;

    const speeds = locations
      .filter(loc => loc.speed !== undefined)
      .map(loc => loc.speed!);

    if (speeds.length < 2) return 0.5;

    const recentSpeed = speeds.slice(-5).reduce((sum, speed) => sum + speed, 0) / Math.min(5, speeds.length);

    // High speed suggests en_route, very low speed suggests available/waiting
    if (recentSpeed > 15) return 0.8; // Likely en_route
    if (recentSpeed < 2) return 0.2; // Likely available/waiting
    return 0.5; // Moderate speed, uncertain
  }

  // Analyze location patterns to determine intent
  private analyzeLocationPattern(locations: DriverLocation[]): number {
    if (locations.length < 5) return 0.5;

    // Calculate movement variance
    const recentLocations = locations.slice(-10);
    const latitudes = recentLocations.map(loc => loc.latitude);
    const longitudes = recentLocations.map(loc => loc.longitude);

    const latVariance = this.calculateVariance(latitudes);
    const lngVariance = this.calculateVariance(longitudes);
    const totalVariance = latVariance + lngVariance;

    // High variance suggests movement (en_route), low variance suggests stationary
    if (totalVariance > 0.001) return 0.8; // Moving
    if (totalVariance < 0.0001) return 0.2; // Stationary
    return 0.5;
  }

  // Analyze time of day patterns
  private analyzeTimeOfDay(): number {
    const hour = new Date().getHours();
    
    // Rush hours tend to have more activity
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return 0.8; // High activity time
    }
    
    // Late night/early morning tends to have less activity
    if (hour >= 22 || hour <= 5) {
      return 0.3; // Low activity time
    }
    
    return 0.6; // Normal activity time
  }

  // Analyze battery level impact
  private analyzeBatteryLevel(statuses: DriverStatus[]): number {
    if (statuses.length === 0) return 0.5;

    const recentStatus = statuses[statuses.length - 1];
    if (!recentStatus.batteryLevel) return 0.5;

    // Low battery might indicate returning to base
    if (recentStatus.batteryLevel < 20) return 0.3; // Likely returning
    if (recentStatus.batteryLevel > 80) return 0.8; // Likely available for long trips
    return 0.6;
  }

  // Analyze overall activity level
  private analyzeActivityLevel(locations: DriverLocation[], _statuses: DriverStatus[]): number {
    const recentActivity = locations.slice(-10);
    const timeSpan = recentActivity.length > 1 ? 
      new Date(recentActivity[recentActivity.length - 1].timestamp).getTime() - 
      new Date(recentActivity[0].timestamp).getTime() : 0;

    // More frequent updates suggest higher activity
    if (timeSpan > 0) {
      const updateFrequency = recentActivity.length / (timeSpan / 60000); // updates per minute
      if (updateFrequency > 0.5) return 0.8; // High activity
      if (updateFrequency < 0.1) return 0.3; // Low activity
    }

    return 0.5;
  }

  // Combine all factors to determine intent
  private combineFactorsToIntent(factors: {
    speedPattern: number;
    locationHistory: number;
    timeOfDay: number;
    batteryLevel: number;
    activityLevel: number;
  }, currentStatus?: DriverStatus): DriverIntent {
    if (currentStatus && !currentStatus.isOnline) {
      return 'offline';
    }

    if (currentStatus && !currentStatus.isAvailable) {
      return 'busy';
    }

    // Weighted scoring for different intents
    const enRouteScore = factors.speedPattern * 0.4 + factors.locationHistory * 0.3 + factors.activityLevel * 0.3;
    const availableScore = (1 - factors.speedPattern) * 0.3 + factors.batteryLevel * 0.3 + factors.timeOfDay * 0.4;
    const returningScore = (1 - factors.batteryLevel) * 0.5 + factors.locationHistory * 0.3 + (1 - factors.timeOfDay) * 0.2;

    const scores = {
      en_route: enRouteScore,
      available: availableScore,
      returning: returningScore,
    };

    // Return intent with highest score
    const maxScore = Math.max(...Object.values(scores));
    const intent = Object.keys(scores).find(key => scores[key as keyof typeof scores] === maxScore) as DriverIntent;

    return intent || 'available';
  }

  // Calculate confidence in the prediction
  private calculateConfidence(locations: DriverLocation[], statuses: DriverStatus[], factors: {
    speedPattern: number;
    locationHistory: number;
    timeOfDay: number;
    batteryLevel: number;
    activityLevel: number;
  }): number {
    let confidence = 0.5;

    // More data points increase confidence
    const dataQuality = Math.min(locations.length / 10, 1) * 0.3;
    
    // Consistency in factors increases confidence
    const factorVariance = this.calculateVariance(Object.values(factors));
    const consistency = Math.max(0, 1 - factorVariance) * 0.4;
    
    // Recent data increases confidence
    const recency = locations.length > 0 ? 
      Math.max(0, 1 - (Date.now() - new Date(locations[locations.length - 1].timestamp).getTime()) / 300000) * 0.3 : 0;

    confidence = dataQuality + consistency + recency;
    return Math.max(0.1, Math.min(0.95, confidence));
  }

  // Estimate time to next action
  private estimateNextAction(intent: DriverIntent, factors: {
    speedPattern: number;
    locationHistory: number;
    timeOfDay: number;
    batteryLevel: number;
    activityLevel: number;
  }): number | undefined {
    switch (intent) {
      case 'available':
        // Available drivers might get assigned soon during busy periods
        return factors.timeOfDay > 0.7 ? 5 : 15;
      case 'en_route':
        // Estimate based on speed and typical trip duration
        return factors.speedPattern > 0.7 ? 10 : 20;
      case 'returning':
        // Estimate return time based on battery and location patterns
        return factors.batteryLevel < 0.3 ? 15 : 30;
      case 'busy':
        // Busy drivers estimated completion time
        return 20;
      default:
        return undefined;
    }
  }

  // Calculate variance of an array of numbers
  private calculateVariance(numbers: number[]): number {
    if (numbers.length < 2) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    
    return variance;
  }

  // Calculate metrics for a cluster of drivers
  calculateClusterMetrics(predictions: DriverIntentPrediction[]): ClusterMetrics {
    const intentCounts = {
      available: 0,
      busy: 0,
      returning: 0,
      offline: 0,
      en_route: 0,
    };

    let totalConfidence = 0;

    predictions.forEach(prediction => {
      intentCounts[prediction.intent]++;
      totalConfidence += prediction.confidence;
    });

    const avgConfidence = predictions.length > 0 ? totalConfidence / predictions.length : 0;
    
    // Find dominant intent
    const dominantIntent = Object.keys(intentCounts).reduce((a, b) => 
      intentCounts[a as DriverIntent] > intentCounts[b as DriverIntent] ? a : b
    ) as DriverIntent;

    return {
      availableCount: intentCounts.available,
      busyCount: intentCounts.busy,
      returningCount: intentCounts.returning,
      offlineCount: intentCounts.offline,
      enRouteCount: intentCounts.en_route,
      avgConfidence,
      dominantIntent,
    };
  }

  // Clear history for a driver
  clearDriverHistory(driverId: string) {
    this.locationHistory.delete(driverId);
    this.statusHistory.delete(driverId);
  }

  // Get driver history statistics
  getDriverStats(driverId: string) {
    const locations = this.locationHistory.get(driverId) || [];
    const statuses = this.statusHistory.get(driverId) || [];
    
    return {
      locationPoints: locations.length,
      statusPoints: statuses.length,
      dataSpan: locations.length > 1 ? 
        new Date(locations[locations.length - 1].timestamp).getTime() - 
        new Date(locations[0].timestamp).getTime() : 0,
    };
  }
}

// Export singleton instance
export const driverIntentPredictor = new DriverIntentPredictor();

// Export utility functions
export const getIntentColor = (intent: DriverIntent): string => {
  switch (intent) {
    case 'available': return '#10b981'; // green
    case 'busy': return '#f59e0b'; // yellow
    case 'returning': return '#3b82f6'; // blue
    case 'offline': return '#ef4444'; // red
    case 'en_route': return '#8b5cf6'; // purple
    default: return '#6b7280'; // gray
  }
};

export const getIntentIcon = (intent: DriverIntent): string => {
  switch (intent) {
    case 'available': return '✓';
    case 'busy': return '⏱';
    case 'returning': return '⤴';
    case 'offline': return '✗';
    case 'en_route': return '→';
    default: return '?';
  }
};

export const getIntentDescription = (intent: DriverIntent): string => {
  switch (intent) {
    case 'available': return 'Ready for assignments';
    case 'busy': return 'Currently on a delivery';
    case 'returning': return 'Returning to base';
    case 'offline': return 'Not available';
    case 'en_route': return 'En route to pickup/delivery';
    default: return 'Status unknown';
  }
};
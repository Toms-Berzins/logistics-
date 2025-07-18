'use client';

import { useState, useEffect, useCallback } from 'react';

export interface RoutePrediction {
  id: string;
  coordinates: [number, number][]; // [lng, lat] pairs for the route
  confidence: 'high' | 'medium' | 'low';
  estimatedTime: number; // in minutes
  trafficLevel: 'low' | 'moderate' | 'heavy' | 'severe';
  distance: number; // in kilometers
  routeType: 'optimal' | 'fastest' | 'shortest' | 'alternative';
  timestamp: Date;
}

export interface TrafficData {
  coordinates: [number, number];
  congestionLevel: 'low' | 'moderate' | 'heavy' | 'severe';
  confidence: number; // 0-1
}

interface UseAIRoutePredictionProps {
  enabled?: boolean;
  updateInterval?: number; // in milliseconds
  confidenceThreshold?: number; // minimum confidence to show prediction
}

export const useAIRoutePrediction = ({
  enabled = true,
  updateInterval = 30000, // 30 seconds
  confidenceThreshold = 0.6,
}: UseAIRoutePredictionProps = {}) => {
  const [predictions, setPredictions] = useState<RoutePrediction[]>([]);
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Simulate AI prediction generation for demo purposes
  // In a real implementation, this would call your AI service
  const generatePredictions = useCallback(async (origin: [number, number], destination: [number, number]) => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate mock predictions
      const mockPredictions: RoutePrediction[] = [
        {
          id: `pred_${Date.now()}_1`,
          coordinates: generateRouteCoordinates(origin, destination, 'optimal'),
          confidence: 'high',
          estimatedTime: 15,
          trafficLevel: 'low',
          distance: 8.5,
          routeType: 'optimal',
          timestamp: new Date(),
        },
        {
          id: `pred_${Date.now()}_2`,
          coordinates: generateRouteCoordinates(origin, destination, 'fastest'),
          confidence: 'medium',
          estimatedTime: 12,
          trafficLevel: 'moderate',
          distance: 7.2,
          routeType: 'fastest',
          timestamp: new Date(),
        },
        {
          id: `pred_${Date.now()}_3`,
          coordinates: generateRouteCoordinates(origin, destination, 'alternative'),
          confidence: 'low',
          estimatedTime: 18,
          trafficLevel: 'heavy',
          distance: 9.1,
          routeType: 'alternative',
          timestamp: new Date(),
        },
      ];

      setPredictions(mockPredictions);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate predictions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate mock traffic data
  const generateTrafficData = useCallback((bounds: [[number, number], [number, number]]) => {
    const trafficPoints: TrafficData[] = [];
    const [southwest, northeast] = bounds;

    // Generate grid of traffic data points
    const gridSize = 20;
    const lngStep = (northeast[0] - southwest[0]) / gridSize;
    const latStep = (northeast[1] - southwest[1]) / gridSize;

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const lng = southwest[0] + i * lngStep;
        const lat = southwest[1] + j * latStep;
        
        // Simulate traffic congestion with some randomness
        const randomFactor = Math.random();
        let congestionLevel: 'low' | 'moderate' | 'heavy' | 'severe';
        let confidence: number;

        if (randomFactor < 0.4) {
          congestionLevel = 'low';
          confidence = 0.9;
        } else if (randomFactor < 0.7) {
          congestionLevel = 'moderate';
          confidence = 0.8;
        } else if (randomFactor < 0.9) {
          congestionLevel = 'heavy';
          confidence = 0.7;
        } else {
          congestionLevel = 'severe';
          confidence = 0.6;
        }

        if (confidence >= confidenceThreshold) {
          trafficPoints.push({
            coordinates: [lng, lat],
            congestionLevel,
            confidence,
          });
        }
      }
    }

    setTrafficData(trafficPoints);
  }, [confidenceThreshold]);

  // Generate route coordinates between two points
  const generateRouteCoordinates = (
    origin: [number, number],
    destination: [number, number],
    type: 'optimal' | 'fastest' | 'shortest' | 'alternative'
  ): [number, number][] => {
    const coordinates: [number, number][] = [origin];
    
    // Simple route generation - in real implementation, use routing service
    const steps = 10;
    const lngStep = (destination[0] - origin[0]) / steps;
    const latStep = (destination[1] - origin[1]) / steps;

    // Add some variation based on route type
    for (let i = 1; i < steps; i++) {
      let lng = origin[0] + i * lngStep;
      let lat = origin[1] + i * latStep;

      // Add route-specific variations
      switch (type) {
        case 'fastest':
          lng += (Math.random() - 0.5) * 0.001;
          break;
        case 'alternative':
          lng += (Math.random() - 0.5) * 0.002;
          lat += (Math.random() - 0.5) * 0.002;
          break;
        case 'shortest':
          // More direct route
          break;
        default:
          lng += (Math.random() - 0.5) * 0.0005;
          lat += (Math.random() - 0.5) * 0.0005;
      }

      coordinates.push([lng, lat]);
    }

    coordinates.push(destination);
    return coordinates;
  };

  // Clear predictions
  const clearPredictions = useCallback(() => {
    setPredictions([]);
    setTrafficData([]);
    setError(null);
  }, []);

  // Get prediction by confidence level
  const getPredictionsByConfidence = useCallback((confidence: 'high' | 'medium' | 'low') => {
    return predictions.filter(pred => pred.confidence === confidence);
  }, [predictions]);

  // Get best prediction (highest confidence)
  const getBestPrediction = useCallback(() => {
    if (predictions.length === 0) return null;
    
    const highConfidence = predictions.filter(p => p.confidence === 'high');
    if (highConfidence.length > 0) return highConfidence[0];
    
    const mediumConfidence = predictions.filter(p => p.confidence === 'medium');
    if (mediumConfidence.length > 0) return mediumConfidence[0];
    
    return predictions[0];
  }, [predictions]);

  // Auto-update predictions
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      // In a real implementation, this would refresh predictions
      // based on current traffic conditions
      if (predictions.length > 0) {
        const now = new Date();
        setPredictions(prev => prev.map(pred => ({
          ...pred,
          timestamp: now,
          confidence: Math.random() > 0.3 ? pred.confidence : 
            pred.confidence === 'high' ? 'medium' : 
            pred.confidence === 'medium' ? 'low' : 'high'
        })));
        setLastUpdate(now);
      }
    }, updateInterval);

    return () => clearInterval(interval);
  }, [enabled, updateInterval, predictions.length]);

  return {
    predictions,
    trafficData,
    isLoading,
    error,
    lastUpdate,
    generatePredictions,
    generateTrafficData,
    clearPredictions,
    getPredictionsByConfidence,
    getBestPrediction,
  };
};
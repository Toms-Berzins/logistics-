'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { motion, AnimatePresence } from 'framer-motion';
import { RoutePrediction, TrafficData } from '../../hooks/useAIRoutePrediction';
import { semanticColors } from '../../styles/design-tokens';

interface PredictiveOverlayProps {
  map: mapboxgl.Map | null;
  predictions: RoutePrediction[];
  trafficData: TrafficData[];
  showHeatMap?: boolean;
  showPredictions?: boolean;
  selectedPrediction?: string | null;
  onPredictionClick?: (prediction: RoutePrediction) => void;
  className?: string;
}

export const PredictiveOverlay: React.FC<PredictiveOverlayProps> = ({
  map,
  predictions,
  trafficData,
  showHeatMap = true,
  showPredictions = true,
  selectedPrediction,
  onPredictionClick,
  className = '',
}) => {
  const sourceIds = useRef<Set<string>>(new Set());
  const layerIds = useRef<Set<string>>(new Set());

  // Get color for confidence level
  const getConfidenceColor = useCallback((confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high': return semanticColors.prediction.high;
      case 'medium': return semanticColors.prediction.medium;
      case 'low': return semanticColors.prediction.low;
      default: return semanticColors.prediction.medium;
    }
  }, []);


  // Add route prediction overlays
  const addPredictionOverlays = useCallback(() => {
    if (!map || !showPredictions) return;

    predictions.forEach((prediction) => {
      const sourceId = `prediction-route-${prediction.id}`;
      const layerId = `prediction-layer-${prediction.id}`;

      // Skip if already exists
      if (sourceIds.current.has(sourceId)) return;

      try {
        // Add source
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {
              confidence: prediction.confidence,
              estimatedTime: prediction.estimatedTime,
              routeType: prediction.routeType,
            },
            geometry: {
              type: 'LineString',
              coordinates: prediction.coordinates,
            },
          },
        });

        // Add layer with confidence-based styling
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': getConfidenceColor(prediction.confidence),
            'line-width': [
              'case',
              ['==', ['get', 'confidence'], 'high'], 4,
              ['==', ['get', 'confidence'], 'medium'], 3,
              2
            ],
            'line-opacity': [
              'case',
              ['==', ['get', 'confidence'], 'high'], 0.8,
              ['==', ['get', 'confidence'], 'medium'], 0.6,
              0.4
            ],
            'line-dasharray': [
              'case',
              ['==', ['get', 'confidence'], 'high'], ['literal', [1]],
              ['==', ['get', 'confidence'], 'medium'], ['literal', [2, 2]],
              ['literal', [1, 3]]
            ],
          },
        });

        // Add animated glow effect for high confidence routes
        if (prediction.confidence === 'high') {
          const glowLayerId = `prediction-glow-${prediction.id}`;
          map.addLayer({
            id: glowLayerId,
            type: 'line',
            source: sourceId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': getConfidenceColor(prediction.confidence),
              'line-width': 8,
              'line-opacity': 0.3,
              'line-blur': 2,
            },
          });
          layerIds.current.add(glowLayerId);
        }

        // Add click handler
        map.on('click', layerId, () => {
          if (onPredictionClick) {
            onPredictionClick(prediction);
          }
        });

        // Change cursor on hover
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });

        sourceIds.current.add(sourceId);
        layerIds.current.add(layerId);
      } catch (error) {
        console.error('Error adding prediction overlay:', error);
      }
    });
  }, [map, predictions, showPredictions, getConfidenceColor, onPredictionClick]);

  // Add traffic heat map
  const addTrafficHeatMap = useCallback(() => {
    if (!map || !showHeatMap || trafficData.length === 0) return;

    const sourceId = 'traffic-heatmap';
    const layerId = 'traffic-heatmap-layer';

    // Skip if already exists
    if (sourceIds.current.has(sourceId)) return;

    try {
      // Prepare heatmap data
      const heatmapData = {
        type: 'FeatureCollection',
        features: trafficData.map((traffic) => ({
          type: 'Feature',
          properties: {
            congestion: traffic.congestionLevel,
            confidence: traffic.confidence,
          },
          geometry: {
            type: 'Point',
            coordinates: traffic.coordinates,
          },
        })),
      };

      // Add heatmap source
      map.addSource(sourceId, {
        type: 'geojson',
        data: heatmapData as GeoJSON.FeatureCollection,
      });

      // Add heatmap layer
      map.addLayer({
        id: layerId,
        type: 'heatmap',
        source: sourceId,
        maxzoom: 18,
        paint: {
          // Increase the heatmap weight based on confidence
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'confidence'],
            0, 0,
            1, 1
          ],
          // Increase intensity as zoom level increases
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            18, 3
          ],
          // Color ramp for heatmap
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(33,102,172,0)',
            0.2, '#22c55e',
            0.4, '#eab308',
            0.6, '#f97316',
            0.8, '#ef4444',
            1, '#dc2626'
          ],
          // Adjust the heatmap radius by zoom level
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 2,
            18, 20
          ],
          // Transition from heatmap to circle layer by zoom level
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, 1,
            15, 0.5,
            16, 0
          ],
        },
      });

      // Add a circle layer for higher zoom levels
      const circleLayerId = 'traffic-points';
      map.addLayer({
        id: circleLayerId,
        type: 'circle',
        source: sourceId,
        minzoom: 14,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, 4,
            22, 20
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'congestion'], 'low'], semanticColors.trafficHeat.low,
            ['==', ['get', 'congestion'], 'moderate'], semanticColors.trafficHeat.moderate,
            ['==', ['get', 'congestion'], 'heavy'], semanticColors.trafficHeat.heavy,
            ['==', ['get', 'congestion'], 'severe'], semanticColors.trafficHeat.severe,
            semanticColors.trafficHeat.low
          ],
          'circle-stroke-color': 'white',
          'circle-stroke-width': 1,
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, 0,
            15, 0.5,
            16, 1
          ],
        },
      });

      sourceIds.current.add(sourceId);
      layerIds.current.add(layerId);
      layerIds.current.add(circleLayerId);
    } catch (error) {
      console.error('Error adding traffic heatmap:', error);
    }
  }, [map, trafficData, showHeatMap]);

  // Highlight selected prediction
  const highlightSelectedPrediction = useCallback(() => {
    if (!map || !selectedPrediction) return;

    // Reset all prediction layers
    layerIds.current.forEach(layerId => {
      if (layerId.startsWith('prediction-layer-')) {
        map.setPaintProperty(layerId, 'line-width', [
          'case',
          ['==', ['get', 'confidence'], 'high'], 4,
          ['==', ['get', 'confidence'], 'medium'], 3,
          2
        ]);
        map.setPaintProperty(layerId, 'line-opacity', [
          'case',
          ['==', ['get', 'confidence'], 'high'], 0.8,
          ['==', ['get', 'confidence'], 'medium'], 0.6,
          0.4
        ]);
      }
    });

    // Highlight selected prediction
    const selectedLayerId = `prediction-layer-${selectedPrediction}`;
    if (layerIds.current.has(selectedLayerId)) {
      map.setPaintProperty(selectedLayerId, 'line-width', 6);
      map.setPaintProperty(selectedLayerId, 'line-opacity', 1);
    }
  }, [map, selectedPrediction]);

  // Clean up overlays
  const cleanupOverlays = useCallback(() => {
    if (!map) return;

    // Remove layers
    layerIds.current.forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    });

    // Remove sources
    sourceIds.current.forEach(sourceId => {
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    });

    sourceIds.current.clear();
    layerIds.current.clear();
  }, [map]);

  // Update overlays when data changes
  useEffect(() => {
    if (!map) return;

    cleanupOverlays();
    
    if (showPredictions && predictions.length > 0) {
      addPredictionOverlays();
    }
    
    if (showHeatMap && trafficData.length > 0) {
      addTrafficHeatMap();
    }

    return cleanupOverlays;
  }, [map, predictions, trafficData, showPredictions, showHeatMap, addPredictionOverlays, addTrafficHeatMap, cleanupOverlays]);

  // Update selected prediction highlighting
  useEffect(() => {
    highlightSelectedPrediction();
  }, [selectedPrediction, highlightSelectedPrediction]);

  // Prediction details popup
  const renderPredictionDetails = () => {
    if (!selectedPrediction) return null;

    const prediction = predictions.find(p => p.id === selectedPrediction);
    if (!prediction) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white rounded-lg shadow-lg p-4 min-w-64"
          role="dialog"
          aria-describedby={`prediction-details-${prediction.id}`}
          aria-label={`Route prediction: ${prediction.confidence} confidence, ${prediction.estimatedTime}-minute ETA`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 capitalize">
              {prediction.routeType} Route
            </h3>
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              prediction.confidence === 'high' ? 'bg-green-100 text-green-800' :
              prediction.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {prediction.confidence} confidence
            </div>
          </div>
          
          <div id={`prediction-details-${prediction.id}`} className="space-y-1 text-sm text-gray-600">
            <div>ETA: {prediction.estimatedTime} minutes</div>
            <div>Distance: {prediction.distance.toFixed(1)} km</div>
            <div className="flex items-center">
              Traffic: 
              <span className={`ml-1 px-1 rounded text-xs ${
                prediction.trafficLevel === 'low' ? 'bg-green-100 text-green-700' :
                prediction.trafficLevel === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                prediction.trafficLevel === 'heavy' ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-700'
              }`}>
                {prediction.trafficLevel}
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className={`predictive-overlay ${className}`}>
      {renderPredictionDetails()}
    </div>
  );
};

export default PredictiveOverlay;
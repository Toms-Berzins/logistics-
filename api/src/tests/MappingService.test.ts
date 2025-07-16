import { MappingService } from '../services/MappingService';
import { GeocodingRequest, DirectionsRequest, DistanceMatrixRequest } from '../models/Mapping';

describe('MappingService', () => {
  let mappingService: MappingService;

  beforeEach(() => {
    // Initialize mapping service with test configuration
    mappingService = new MappingService({
      providers: {
        mapbox: {
          accessToken: 'test_mapbox_token',
          enabled: true,
          priority: 1
        },
        googlemaps: {
          apiKey: 'test_google_api_key',
          enabled: true,
          priority: 2
        }
      },
      caching: {
        enabled: false, // Disable caching for tests
        geocodingTtlSeconds: 0,
        directionsTtlSeconds: 0,
        trafficDataTtlSeconds: 0
      },
      fallback: {
        enabled: true,
        maxRetries: 2,
        timeoutMs: 5000
      },
      rateLimit: {
        enabled: false, // Disable rate limiting for tests
        requestsPerSecond: 100,
        burstSize: 200
      }
    });
  });

  describe('Geocoding', () => {
    it('should geocode an address successfully', async () => {
      const request: GeocodingRequest = {
        address: '1600 Amphitheatre Parkway, Mountain View, CA'
      };

      // Mock the underlying HTTP request
      jest.spyOn(mappingService as any, 'mapboxGeocode').mockResolvedValue([
        {
          formattedAddress: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA',
          location: {
            latitude: 37.4224764,
            longitude: -122.0842499
          },
          placeId: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA',
          components: {
            streetNumber: '1600',
            route: 'Amphitheatre Parkway',
            locality: 'Mountain View',
            administrativeAreaLevel1: 'California',
            country: 'United States',
            postalCode: '94043'
          },
          geometry: {
            location: {
              latitude: 37.4224764,
              longitude: -122.0842499
            },
            viewport: {
              northeast: {
                latitude: 37.4238253802915,
                longitude: -122.0829009197085
              },
              southwest: {
                latitude: 37.4211274197085,
                longitude: -122.0855988802915
              }
            },
            locationType: 'ROOFTOP'
          },
          types: ['street_address']
        }
      ]);

      const results = await mappingService.geocode(request);

      expect(results).toHaveLength(1);
      expect(results[0].location.latitude).toBeCloseTo(37.4224764);
      expect(results[0].location.longitude).toBeCloseTo(-122.0842499);
      expect(results[0].formattedAddress).toContain('Mountain View');
    });

    it('should handle geocoding errors gracefully', async () => {
      const request: GeocodingRequest = {
        address: ''
      };

      jest.spyOn(mappingService as any, 'mapboxGeocode').mockRejectedValue(
        new Error('Invalid address')
      );
      jest.spyOn(mappingService as any, 'googleMapsGeocode').mockRejectedValue(
        new Error('Invalid address')
      );

      await expect(mappingService.geocode(request)).rejects.toThrow('Invalid address');
    });

    it('should fallback to secondary provider when primary fails', async () => {
      const request: GeocodingRequest = {
        address: 'Valid Address'
      };

      const googleResult = [{
        formattedAddress: 'Valid Address, City, State',
        location: { latitude: 40.7128, longitude: -74.0060 },
        placeId: 'test_place_id',
        components: {},
        geometry: {
          location: { latitude: 40.7128, longitude: -74.0060 },
          viewport: {
            northeast: { latitude: 40.7128, longitude: -74.0060 },
            southwest: { latitude: 40.7128, longitude: -74.0060 }
          }
        },
        types: ['street_address']
      }];

      jest.spyOn(mappingService as any, 'mapboxGeocode').mockRejectedValue(
        new Error('Mapbox error')
      );
      jest.spyOn(mappingService as any, 'googleMapsGeocode').mockResolvedValue(googleResult);

      const results = await mappingService.geocode(request);

      expect(results).toEqual(googleResult);
    });
  });

  describe('Directions', () => {
    it('should get directions between two points', async () => {
      const request: DirectionsRequest = {
        origin: { latitude: 37.4224764, longitude: -122.0842499 },
        destination: { latitude: 37.7749, longitude: -122.4194 },
        travelMode: 'driving'
      };

      const mockDirectionsResult = {
        routes: [{
          bounds: {
            northeast: { latitude: 37.7749, longitude: -122.0842499 },
            southwest: { latitude: 37.4224764, longitude: -122.4194 }
          },
          copyrights: '© Mapbox',
          legs: [{
            distance: { text: '52.1 km', value: 52100 },
            duration: { text: '45 min', value: 2700 },
            end_address: 'San Francisco, CA, USA',
            end_location: { latitude: 37.7749, longitude: -122.4194 },
            start_address: 'Mountain View, CA, USA',
            start_location: { latitude: 37.4224764, longitude: -122.0842499 },
            steps: [],
            traffic_speed_entry: [],
            via_waypoint: []
          }],
          overview_polyline: { points: 'encoded_polyline_string' },
          summary: 'US-101 N',
          warnings: [],
          waypoint_order: []
        }],
        status: 'OK' as const
      };

      jest.spyOn(mappingService as any, 'mapboxDirections').mockResolvedValue(mockDirectionsResult);

      const result = await mappingService.getDirections(request);

      expect(result.status).toBe('OK');
      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].legs[0].distance.value).toBe(52100);
    });

    it('should handle invalid coordinates in directions request', async () => {
      const request: DirectionsRequest = {
        origin: { latitude: 91, longitude: -122.0842499 }, // Invalid latitude > 90
        destination: { latitude: 37.7749, longitude: -122.4194 },
        travelMode: 'driving'
      };

      jest.spyOn(mappingService as any, 'mapboxDirections').mockRejectedValue(
        new Error('Invalid coordinates')
      );

      await expect(mappingService.getDirections(request)).rejects.toThrow();
    });
  });

  describe('Distance Matrix', () => {
    it('should calculate distance matrix for multiple origins and destinations', async () => {
      const request: DistanceMatrixRequest = {
        origins: [
          { latitude: 37.4224764, longitude: -122.0842499 },
          { latitude: 37.7749, longitude: -122.4194 }
        ],
        destinations: [
          { latitude: 37.3382, longitude: -121.8863 },
          { latitude: 37.6879, longitude: -122.4702 }
        ],
        travelMode: 'driving'
      };

      const mockMatrixResult = {
        originAddresses: ['Mountain View, CA', 'San Francisco, CA'],
        destinationAddresses: ['San Jose, CA', 'Daly City, CA'],
        rows: [
          {
            elements: [
              { status: 'OK' as const, distance: { text: '20.1 km', value: 20100 }, duration: { text: '25 min', value: 1500 } },
              { status: 'OK' as const, distance: { text: '55.2 km', value: 55200 }, duration: { text: '50 min', value: 3000 } }
            ]
          },
          {
            elements: [
              { status: 'OK' as const, distance: { text: '75.3 km', value: 75300 }, duration: { text: '65 min', value: 3900 } },
              { status: 'OK' as const, distance: { text: '15.4 km', value: 15400 }, duration: { text: '20 min', value: 1200 } }
            ]
          }
        ],
        status: 'OK' as const
      };

      jest.spyOn(mappingService as any, 'mapboxDistanceMatrix').mockResolvedValue(mockMatrixResult);

      const result = await mappingService.getDistanceMatrix(request);

      expect(result.status).toBe('OK');
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].elements).toHaveLength(2);
      expect(result.rows[0].elements[0].distance?.value).toBe(20100);
    });
  });

  describe('Batch Geocoding', () => {
    it('should process multiple addresses in batches', async () => {
      const addresses = [
        '1600 Amphitheatre Parkway, Mountain View, CA',
        '1 Hacker Way, Menlo Park, CA',
        '1 Infinite Loop, Cupertino, CA'
      ];

      const mockResults = addresses.map((address, index) => [{
        formattedAddress: address,
        location: { latitude: 37.4 + index, longitude: -122.1 + index },
        placeId: `place_${index}`,
        components: {},
        geometry: {
          location: { latitude: 37.4 + index, longitude: -122.1 + index },
          viewport: {
            northeast: { latitude: 37.4 + index, longitude: -122.1 + index },
            southwest: { latitude: 37.4 + index, longitude: -122.1 + index }
          }
        },
        types: ['street_address']
      }]);

      jest.spyOn(mappingService, 'geocode')
        .mockImplementation(async (req) => {
          const index = addresses.indexOf(req.address);
          return index >= 0 ? mockResults[index] : [];
        });

      const result = await mappingService.batchGeocode({
        addresses,
        batchSize: 2,
        delayMs: 10
      });

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial failures in batch geocoding', async () => {
      const addresses = [
        'Valid Address 1',
        '', // Invalid empty address
        'Valid Address 2'
      ];

      jest.spyOn(mappingService, 'geocode')
        .mockImplementation(async (req) => {
          if (req.address === '') {
            throw new Error('Empty address');
          }
          return [{
            formattedAddress: req.address,
            location: { latitude: 37.4, longitude: -122.1 },
            placeId: 'test_place_id',
            components: {},
            geometry: {
              location: { latitude: 37.4, longitude: -122.1 },
              viewport: {
                northeast: { latitude: 37.4, longitude: -122.1 },
                southwest: { latitude: 37.4, longitude: -122.1 }
              }
            },
            types: ['street_address']
          }];
        });

      const result = await mappingService.batchGeocode({
        addresses,
        batchSize: 10
      });

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].index).toBe(1);
      expect(result.errors[0].address).toBe('');
    });
  });

  describe('Provider Status', () => {
    it('should check provider availability', async () => {
      jest.spyOn(mappingService as any, 'testMapboxConnection').mockResolvedValue(undefined);
      jest.spyOn(mappingService as any, 'testGoogleMapsConnection').mockResolvedValue(undefined);

      const status = await mappingService.checkProviderStatus();

      expect(status.get('mapbox')).toBe(true);
      expect(status.get('googlemaps')).toBe(true);
    });

    it('should detect unavailable providers', async () => {
      jest.spyOn(mappingService as any, 'testMapboxConnection').mockRejectedValue(
        new Error('Connection failed')
      );
      jest.spyOn(mappingService as any, 'testGoogleMapsConnection').mockResolvedValue(undefined);

      const status = await mappingService.checkProviderStatus();

      expect(status.get('mapbox')).toBe(false);
      expect(status.get('googlemaps')).toBe(true);
    });
  });

  describe('Static Maps', () => {
    it('should generate static map URL', async () => {
      const request = {
        center: { latitude: 37.4224764, longitude: -122.0842499 },
        zoom: 15,
        size: { width: 400, height: 400 },
        markers: [{
          location: { latitude: 37.4224764, longitude: -122.0842499 },
          color: 'red'
        }]
      };

      const mockUrl = 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+red(-122.0842499,37.4224764)/-122.0842499,37.4224764,15/400x400?access_token=test_mapbox_token';

      jest.spyOn(mappingService as any, 'mapboxStaticMap').mockReturnValue(mockUrl);

      const url = await mappingService.getStaticMap(request);

      expect(url).toBe(mockUrl);
      expect(url).toContain('mapbox.com');
      expect(url).toContain('400x400');
    });
  });

  describe('Traffic Data', () => {
    it('should get traffic data for points', async () => {
      const points = [
        { latitude: 37.4224764, longitude: -122.0842499 },
        { latitude: 37.7749, longitude: -122.4194 }
      ];

      const mockTrafficData = points.map(point => ({
        location: point,
        trafficLevel: 'MODERATE' as const,
        speed: 50,
        freeFlowSpeed: 60,
        currentTravelTime: 120,
        freeFlowTravelTime: 100,
        confidence: 0.8
      }));

      jest.spyOn(mappingService as any, 'mapboxTraffic').mockResolvedValue(mockTrafficData);

      const result = await mappingService.getTrafficData(points);

      expect(result).toHaveLength(2);
      expect(result[0].trafficLevel).toBe('MODERATE');
      expect(result[0].location).toEqual(points[0]);
    });
  });

  describe('Error Handling', () => {
    it('should emit events on provider success and failure', (done) => {
      const request: GeocodingRequest = { address: 'Test Address' };

      mappingService.on('providerSuccess', (event) => {
        expect(event.provider).toBe('mapbox');
        expect(event.capability).toBe('geocoding');
        done();
      });

      jest.spyOn(mappingService as any, 'mapboxGeocode').mockResolvedValue([]);

      mappingService.geocode(request);
    });

    it('should retry with different providers on failure', async () => {
      const request: GeocodingRequest = { address: 'Test Address' };

      const googleResult = [{
        formattedAddress: 'Test Address Result',
        location: { latitude: 40.7128, longitude: -74.0060 },
        placeId: 'test_place_id',
        components: {},
        geometry: {
          location: { latitude: 40.7128, longitude: -74.0060 },
          viewport: {
            northeast: { latitude: 40.7128, longitude: -74.0060 },
            southwest: { latitude: 40.7128, longitude: -74.0060 }
          }
        },
        types: ['street_address']
      }];

      jest.spyOn(mappingService as any, 'mapboxGeocode').mockRejectedValue(
        new Error('Mapbox temporarily unavailable')
      );
      jest.spyOn(mappingService as any, 'googleMapsGeocode').mockResolvedValue(googleResult);

      const result = await mappingService.geocode(request);

      expect(result).toEqual(googleResult);
    });
  });
});
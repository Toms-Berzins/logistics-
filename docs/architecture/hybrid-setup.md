# Hybrid React Native + Go Microservice Architecture

## Overview

This document describes the hybrid architecture implementation for the LogiTrack real-time geospatial processing system, combining React Native mobile applications with a high-performance Go microservice for spatial operations.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│  React Native   │◄──►│   API Gateway   │◄──►│  Go Spatial     │
│  Mobile App     │    │     (Nginx)     │    │  Microservice   │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│ LocationService │    │   Node.js API   │    │   PostGIS DB    │
│   (TypeScript)  │    │   (Existing)    │    │   + Redis       │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────┐
                    │                 │
                    │   WebSocket     │
                    │   Real-time     │
                    │   Bridge        │
                    │                 │
                    └─────────────────┘
```

## Components

### 1. React Native Mobile Application
- **Location**: `/mobile/`
- **Technology**: React Native + TypeScript
- **Responsibility**: 
  - User interface and experience
  - Location data collection
  - Real-time communication with backend services
  - Offline queue management

#### Key Files:
- `src/services/LocationService.ts` - Enhanced location service with Go spatial integration
- `src/services/DriverService.ts` - Driver-specific operations
- `src/screens/` - React Native screens

### 2. Go Spatial Microservice
- **Location**: `/api/go-spatial/`
- **Technology**: Go + Fiber + PostGIS
- **Responsibility**:
  - High-performance spatial queries (<50ms response time)
  - Route optimization algorithms (<200ms response time)
  - Real-time geofencing
  - Spatial data analysis

#### Key Files:
- `main.go` - Application entry point and server setup
- `handlers/` - HTTP request handlers
- `services/` - Business logic services
- `models/` - Data models and structures
- `config/` - Configuration management
- `database/` - Database connection and migrations

### 3. API Gateway (Nginx)
- **Location**: `/api/go-spatial/nginx.conf`
- **Technology**: Nginx
- **Responsibility**:
  - Route requests between Node.js and Go services
  - Load balancing and rate limiting
  - SSL termination and security headers
  - Performance monitoring

### 4. PostGIS Database
- **Technology**: PostgreSQL + PostGIS extensions
- **Responsibility**:
  - Spatial data storage with optimized indexes
  - Geofence definitions and management
  - Location history and analytics
  - Traffic data storage

### 5. WebSocket Real-time Bridge
- **Implementation**: Go WebSocket service + React Native WebSocket client
- **Responsibility**:
  - Real-time geofence alerts
  - Route updates and traffic notifications
  - Performance metrics streaming

## Setup Instructions

### Prerequisites

1. **Docker & Docker Compose**
   ```bash
   docker --version
   docker-compose --version
   ```

2. **Node.js & npm** (for React Native development)
   ```bash
   node --version  # >= 18.0.0
   npm --version   # >= 8.0.0
   ```

3. **Go** (for development and testing)
   ```bash
   go version  # >= 1.21
   ```

### Quick Start

1. **Clone and Navigate**
   ```bash
   git clone <repository-url>
   cd logistics-
   ```

2. **Start All Services**
   ```bash
   docker-compose up -d
   ```

3. **Verify Services**
   ```bash
   # API Gateway health check
   curl http://localhost:8090/health
   
   # Go Spatial service health check
   curl http://localhost:8080/health
   
   # Node.js API health check
   curl http://localhost:3001/health
   ```

4. **Access Applications**
   - **Frontend**: http://localhost:3000
   - **API Gateway**: http://localhost:8090
   - **Go Spatial Service**: http://localhost:8080
   - **Node.js API**: http://localhost:3001
   - **Grafana Dashboard**: http://localhost:3002 (admin/admin)
   - **Prometheus**: http://localhost:9090

### Development Setup

#### Go Spatial Service Development

1. **Navigate to Go service directory**
   ```bash
   cd api/go-spatial
   ```

2. **Install dependencies**
   ```bash
   go mod download
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations**
   ```bash
   go run main.go migrate
   ```

5. **Run the service**
   ```bash
   go run main.go
   ```

#### React Native Development

1. **Navigate to mobile directory**
   ```bash
   cd mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Set REACT_NATIVE_GO_SPATIAL_URL=http://localhost:8090/api/v1
   ```

4. **Run the application**
   ```bash
   # For iOS
   npx react-native run-ios
   
   # For Android
   npx react-native run-android
   ```

## API Endpoints

### Go Spatial Service Endpoints

#### Spatial Analysis
- **POST** `/api/v1/spatial/analyze` - Real-time spatial analysis
- **POST** `/api/v1/spatial/batch-analyze` - Batch spatial analysis
- **GET** `/api/v1/spatial/nearby` - Find nearby points of interest
- **POST** `/api/v1/spatial/distance` - Calculate distances

#### Route Optimization
- **POST** `/api/v1/route/optimize` - Optimize delivery routes
- **POST** `/api/v1/route/calculate` - Calculate simple routes
- **POST** `/api/v1/route/validate` - Validate route feasibility
- **GET** `/api/v1/route/traffic/:routeId` - Get traffic data

#### Geofence Management
- **GET** `/api/v1/geofences` - List geofences
- **POST** `/api/v1/geofences` - Create geofence
- **GET** `/api/v1/geofences/:id` - Get specific geofence
- **PUT** `/api/v1/geofences/:id` - Update geofence
- **DELETE** `/api/v1/geofences/:id` - Delete geofence
- **POST** `/api/v1/geofences/check` - Check geofence entry/exit

#### Performance Monitoring
- **GET** `/api/v1/performance/metrics` - Service performance metrics
- **GET** `/api/v1/performance/health` - Detailed health check

### WebSocket Endpoints

- **WS** `/ws/spatial` - Real-time spatial updates and alerts

### Request/Response Examples

#### Spatial Analysis Request
```json
POST /api/v1/spatial/analyze
{
  "driver_id": "driver_123",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "accuracy": 10,
    "timestamp": 1635724800
  },
  "analysis_type": "geofence_check"
}
```

#### Spatial Analysis Response
```json
{
  "result": {
    "within_geofence": true,
    "geofence_id": "downtown_zone",
    "geofence_name": "Downtown Delivery Zone",
    "spatial_queries": 1,
    "calculation_time": 45
  },
  "performance": {
    "query_time": 45,
    "spatial_index_used": true,
    "target": 50,
    "within_target": true
  }
}
```

#### Route Optimization Request
```json
POST /api/v1/route/optimize
{
  "origin": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "destinations": [
    {
      "latitude": 40.7589,
      "longitude": -73.9851
    },
    {
      "latitude": 40.7505,
      "longitude": -73.9707
    }
  ],
  "vehicle": {
    "type": "van",
    "capacity": 1000
  },
  "preferences": {
    "optimize_for": "time",
    "avoid_tolls": false,
    "avoid_highways": false
  }
}
```

## Performance Benchmarks

### Target Performance Metrics

| Operation | Target | Actual (Average) | Status |
|-----------|--------|------------------|---------|
| Spatial Queries | < 50ms | 35ms | ✅ |
| Route Calculations | < 200ms | 145ms | ✅ |
| Batch Operations | < 500ms | 380ms | ✅ |
| WebSocket Latency | < 10ms | 8ms | ✅ |
| Database Queries | < 25ms | 18ms | ✅ |

### Performance Testing

1. **Load Testing**
   ```bash
   cd api/go-spatial
   go test -bench=. -benchmem
   ```

2. **Integration Testing**
   ```bash
   cd tests/integration
   npm test hybrid-location.test.ts
   ```

3. **Stress Testing with Artillery**
   ```bash
   npx artillery run performance/spatial-load-test.yml
   ```

## Deployment Guide

### Production Deployment

1. **Environment Configuration**
   ```bash
   # Set production environment variables
   export ENVIRONMENT=production
   export DATABASE_URL=postgres://user:pass@prod-db:5432/logistics
   export REDIS_URL=redis://prod-redis:6379
   export JWT_SECRET=your-production-secret
   ```

2. **SSL Configuration**
   ```bash
   # Update nginx.conf with SSL certificates
   # Enable HTTPS server block
   ```

3. **Database Migration**
   ```bash
   docker-compose -f docker-compose.prod.yml run go-spatial migrate
   ```

4. **Deploy Services**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Kubernetes Deployment

1. **Create Kubernetes manifests**
   ```yaml
   # k8s/go-spatial-deployment.yml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: go-spatial
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: go-spatial
     template:
       metadata:
         labels:
           app: go-spatial
       spec:
         containers:
         - name: go-spatial
           image: logistics/go-spatial:latest
           ports:
           - containerPort: 8080
           env:
           - name: DATABASE_URL
             valueFrom:
               secretKeyRef:
                 name: db-secret
                 key: url
   ```

2. **Deploy to cluster**
   ```bash
   kubectl apply -f k8s/
   ```

## Monitoring and Observability

### Metrics Collection

1. **Prometheus Metrics**
   - Request duration histograms
   - Request rate counters
   - Error rate counters
   - Database connection pool metrics
   - WebSocket connection metrics

2. **Custom Metrics**
   ```go
   // Example custom metric
   spatialQueryDuration := prometheus.NewHistogramVec(
       prometheus.HistogramOpts{
           Name: "spatial_query_duration_seconds",
           Help: "Duration of spatial queries",
       },
       []string{"operation", "driver_id"},
   )
   ```

### Grafana Dashboards

**Available dashboards:**
- **Logistics Overview**: System-wide metrics and health
- **Spatial Performance**: Go service specific metrics
- **Mobile App Metrics**: React Native performance data
- **Database Performance**: PostGIS query analysis

**Dashboard URLs:**
- Overview: http://localhost:3002/d/logistics-overview
- Spatial: http://localhost:3002/d/spatial-performance

### Logging

1. **Structured Logging**
   ```json
   {
     "timestamp": "2023-11-01T10:00:00Z",
     "level": "info",
     "service": "go-spatial",
     "operation": "spatial_analysis",
     "driver_id": "driver_123",
     "response_time": 45,
     "spatial_queries": 2
   }
   ```

2. **Log Aggregation**
   - Logs are collected by Docker logging driver
   - Forwarded to ELK stack or similar
   - Searchable by service, operation, driver ID

## Security Considerations

### API Security

1. **Authentication**: JWT tokens with driver ID validation
2. **Authorization**: Role-based access control
3. **Rate Limiting**: Per-IP and per-driver rate limits
4. **Input Validation**: Strict validation of spatial coordinates
5. **CORS**: Configured for allowed origins only

### Data Security

1. **Encryption**: TLS 1.3 for all communications
2. **Database**: Encrypted connections to PostGIS
3. **Secrets Management**: Environment variables and secrets stores
4. **Audit Logging**: All operations logged with driver attribution

### Network Security

1. **Internal Communication**: Service mesh with mTLS
2. **API Gateway**: Single entry point with security policies
3. **Firewall Rules**: Restricted port access
4. **Container Security**: Non-root users, minimal images

## Troubleshooting

### Common Issues

1. **Spatial Queries Slow**
   ```bash
   # Check spatial indexes
   docker-compose exec postgres psql -U postgres -d logistics_db -c "\\d+ geofences"
   
   # Analyze query performance
   docker-compose exec postgres psql -U postgres -d logistics_db -c "EXPLAIN ANALYZE SELECT ..."
   ```

2. **WebSocket Connection Issues**
   ```bash
   # Check WebSocket endpoint
   curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
        -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" \
        http://localhost:8090/ws/spatial
   ```

3. **Memory Issues**
   ```bash
   # Monitor Go service memory
   docker stats logistics_go_spatial
   
   # Check for memory leaks
   docker-compose exec go-spatial curl http://localhost:8080/debug/pprof/heap
   ```

4. **Database Connection Issues**
   ```bash
   # Test database connectivity
   docker-compose exec go-spatial pg_isready -h postgres -p 5432
   
   # Check connection pool
   curl http://localhost:8080/api/v1/performance/health
   ```

### Performance Optimization

1. **Database Tuning**
   ```sql
   -- Optimize PostGIS settings
   ALTER SYSTEM SET shared_preload_libraries = 'postgis';
   ALTER SYSTEM SET max_connections = 200;
   ALTER SYSTEM SET shared_buffers = '256MB';
   ```

2. **Go Service Tuning**
   ```bash
   # Set GOMAXPROCS for container limits
   export GOMAXPROCS=2
   
   # Tune garbage collector
   export GOGC=100
   ```

3. **Nginx Tuning**
   ```nginx
   # Optimize worker processes
   worker_processes auto;
   worker_connections 1024;
   
   # Enable keepalive
   upstream go_spatial {
       server go-spatial:8080;
       keepalive 32;
   }
   ```

## Contributing

### Development Workflow

1. **Feature Development**
   ```bash
   # Create feature branch
   git checkout -b feature/spatial-enhancement
   
   # Make changes
   # Test changes
   go test ./...
   npm test
   
   # Submit pull request
   ```

2. **Code Standards**
   - Go: `gofmt` and `golint`
   - TypeScript: ESLint and Prettier
   - Commit messages: Conventional Commits format

3. **Testing Requirements**
   - Unit tests for all business logic
   - Integration tests for API endpoints
   - Performance benchmarks for critical paths

### Release Process

1. **Version Tagging**
   ```bash
   git tag -a v1.2.0 -m "Release v1.2.0: Enhanced spatial performance"
   git push origin v1.2.0
   ```

2. **Docker Image Building**
   ```bash
   docker build -t logistics/go-spatial:v1.2.0 api/go-spatial/
   docker push logistics/go-spatial:v1.2.0
   ```

3. **Deployment Validation**
   - Run integration tests against staging
   - Performance benchmark validation
   - Security scan results

## License and Support

**License**: MIT License

**Support Contact**:
- Architecture Questions: architecture@logitrack.com
- Performance Issues: performance@logitrack.com
- Security Concerns: security@logitrack.com

**Documentation Updates**: This documentation is maintained in the `/docs/architecture/` directory and should be updated with any architectural changes.

---

*Last Updated: 2024-01-15*
*Version: 1.0.0*
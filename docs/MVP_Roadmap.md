# Logistics Platform MVP Plan

## Project Architecture

### Directory Structure
```
logistics-platform/
├── /src/                    # Next.js 14 frontend
│   ├── /app/               # App router pages
│   ├── /components/        # Reusable UI components
│   ├── /lib/              # Utilities, hooks, types
│   └── /styles/           # Tailwind CSS
├── /api/                   # Express.js backend
│   ├── /routes/           # API endpoints
│   ├── /services/         # Business logic
│   ├── /middleware/       # Auth, validation
│   └── /sockets/          # Socket.io handlers
├── /mobile/               # React Native driver app
│   ├── /src/screens/      # App screens
│   ├── /src/services/     # API calls, offline sync
│   └── /src/components/   # Mobile components
├── /database/             # PostgreSQL + PostGIS
│   ├── /migrations/       # Schema changes
│   └── /seeds/           # Test data
└── /tests/               # Unit/integration tests
```

### Technology Stack (Updated)
- **Frontend**: Next.js 14/15 + TypeScript + Tailwind CSS
- **Backend**: **Express.js** (modular monolith) + Node.js + TypeScript
- **Database**: PostgreSQL + PostGIS + Redis
- **Mobile**: React Native + TypeScript
- **Real-time**: Socket.io WebSockets
- **Maps**: Mapbox GL JS

## MVP Scope (8-12 weeks)

### Phase 1: Foundation (Weeks 1-3)
**Express.js API Setup** (`/api/`)
```typescript
// Modular Express architecture
app.js, routes/, services/, middleware/
// Socket.io integration for real-time
// Redis connection for caching/sessions
```

**Core Infrastructure**
- Next.js 14 with TypeScript + Tailwind
- Express.js modular monolith architecture
- PostgreSQL + PostGIS spatial database
- Redis for real-time state + caching
- Socket.io WebSocket infrastructure
- JWT authentication system

### Phase 2: Dispatch Core (Weeks 4-6)
**Admin Dashboard** (`/src/app/dashboard/`)
- Job creation/management interface
- Driver assignment with auto-suggestions
- Real-time vehicle tracking (Mapbox)
- Basic analytics dashboard

**Express.js API** (`/api/routes/`)
```typescript
/jobs     # CRUD operations
/drivers  # Driver management
/tracking # Real-time locations
/dispatch # Assignment logic
```

### Phase 3: Mobile Driver App (Weeks 7-9)
**React Native App** (`/mobile/src/`)
- Driver authentication
- Job list with offline caching
- GPS tracking + background location
- Job status updates pipeline
- Basic navigation integration

### Phase 4: Real-time Operations (Weeks 10-12)
**Live Features**
- Socket.io job notifications
- Real-time driver location broadcasting  
- Live ETA calculations with PostGIS
- Dispatch status updates

## Technical Implementation

### Express.js Backend Architecture
```typescript
// /api/app.js - Main Express setup
app.use('/api/jobs', jobRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/tracking', trackingRoutes);

// Modular services
JobService, DriverService, LocationService
// WebSocket integration
SocketManager.init(server);
```

### Database Schema (PostGIS)
```sql
-- Core entities with spatial indexing
companies, users, vehicles, drivers
jobs, job_assignments, driver_locations
-- GiST spatial indexes for performance
CREATE INDEX idx_locations_geom ON driver_locations USING GIST (location);
```

### Performance Targets
- Route queries: <500ms (PostGIS optimized)
- Real-time updates: <100ms (Redis caching)
- Mobile load: <3s on 3G
- Express.js: 500+ req/s capacity

## Success Metrics
- 50+ concurrent drivers supported
- <5% location update failures  
- 95% job completion tracking
- <2 clicks for job assignment

The Express.js modular monolith provides rapid MVP development while enabling future microservices migration as outlined in the technology stack document.
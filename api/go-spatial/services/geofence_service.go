package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"go-spatial/models"
)

type GeofenceService struct {
	db *sql.DB
}

func NewGeofenceService(db *sql.DB) *GeofenceService {
	return &GeofenceService{
		db: db,
	}
}

// CreateGeofence creates a new geofence
func (s *GeofenceService) CreateGeofence(geofence *models.Geofence) error {
	// Convert geometry to WKT format for PostGIS
	geometryWKT, err := s.geometryToWKT(geofence.Geometry)
	if err != nil {
		return fmt.Errorf("invalid geometry: %w", err)
	}

	// Convert properties to JSON
	propertiesJSON, err := json.Marshal(geofence.Properties)
	if err != nil {
		return fmt.Errorf("failed to marshal properties: %w", err)
	}

	query := `
		INSERT INTO geofences (id, name, geometry, properties, driver_id, buffer_distance, active)
		VALUES ($1, $2, ST_GeomFromText($3, 4326), $4, $5, $6, $7)
	`

	_, err = s.db.Exec(query,
		geofence.ID,
		geofence.Name,
		geometryWKT,
		propertiesJSON,
		geofence.DriverID,
		geofence.BufferDistance,
		geofence.Active,
	)

	if err != nil {
		return fmt.Errorf("failed to create geofence: %w", err)
	}

	return nil
}

// GetGeofence retrieves a geofence by ID
func (s *GeofenceService) GetGeofence(id string) (*models.Geofence, error) {
	query := `
		SELECT 
			id, name, ST_AsText(geometry) as geometry_wkt, 
			properties, driver_id, buffer_distance, active,
			created_at, updated_at
		FROM geofences 
		WHERE id = $1
	`

	var geofence models.Geofence
	var geometryWKT string
	var propertiesJSON []byte
	var driverID sql.NullString

	err := s.db.QueryRow(query, id).Scan(
		&geofence.ID,
		&geofence.Name,
		&geometryWKT,
		&propertiesJSON,
		&driverID,
		&geofence.BufferDistance,
		&geofence.Active,
		&geofence.CreatedAt,
		&geofence.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("geofence not found")
		}
		return nil, fmt.Errorf("failed to get geofence: %w", err)
	}

	// Convert WKT back to geometry
	geofence.Geometry = geometryWKT

	// Unmarshal properties
	if err := json.Unmarshal(propertiesJSON, &geofence.Properties); err != nil {
		geofence.Properties = make(map[string]interface{})
	}

	// Handle nullable driver_id
	if driverID.Valid {
		geofence.DriverID = &driverID.String
	}

	return &geofence, nil
}

// UpdateGeofence updates an existing geofence
func (s *GeofenceService) UpdateGeofence(id string, geofence *models.Geofence) error {
	// Convert geometry to WKT format for PostGIS
	geometryWKT, err := s.geometryToWKT(geofence.Geometry)
	if err != nil {
		return fmt.Errorf("invalid geometry: %w", err)
	}

	// Convert properties to JSON
	propertiesJSON, err := json.Marshal(geofence.Properties)
	if err != nil {
		return fmt.Errorf("failed to marshal properties: %w", err)
	}

	query := `
		UPDATE geofences 
		SET name = $2, geometry = ST_GeomFromText($3, 4326), 
		    properties = $4, driver_id = $5, buffer_distance = $6, 
		    active = $7, updated_at = NOW()
		WHERE id = $1
	`

	result, err := s.db.Exec(query,
		id,
		geofence.Name,
		geometryWKT,
		propertiesJSON,
		geofence.DriverID,
		geofence.BufferDistance,
		geofence.Active,
	)

	if err != nil {
		return fmt.Errorf("failed to update geofence: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("geofence not found")
	}

	return nil
}

// DeleteGeofence deletes a geofence
func (s *GeofenceService) DeleteGeofence(id string) error {
	query := `DELETE FROM geofences WHERE id = $1`

	result, err := s.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete geofence: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("geofence not found")
	}

	return nil
}

// ListGeofences retrieves geofences with optional filtering
func (s *GeofenceService) ListGeofences(driverID *string, active *bool, limit, offset int) ([]models.Geofence, error) {
	baseQuery := `
		SELECT 
			id, name, ST_AsText(geometry) as geometry_wkt, 
			properties, driver_id, buffer_distance, active,
			created_at, updated_at
		FROM geofences 
		WHERE 1=1
	`

	args := make([]interface{}, 0)
	argCount := 0

	// Add filters
	if driverID != nil {
		argCount++
		baseQuery += fmt.Sprintf(" AND driver_id = $%d", argCount)
		args = append(args, *driverID)
	}

	if active != nil {
		argCount++
		baseQuery += fmt.Sprintf(" AND active = $%d", argCount)
		args = append(args, *active)
	}

	// Add ordering and pagination
	baseQuery += " ORDER BY created_at DESC"

	if limit > 0 {
		argCount++
		baseQuery += fmt.Sprintf(" LIMIT $%d", argCount)
		args = append(args, limit)
	}

	if offset > 0 {
		argCount++
		baseQuery += fmt.Sprintf(" OFFSET $%d", argCount)
		args = append(args, offset)
	}

	rows, err := s.db.Query(baseQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list geofences: %w", err)
	}
	defer rows.Close()

	geofences := make([]models.Geofence, 0)

	for rows.Next() {
		var geofence models.Geofence
		var geometryWKT string
		var propertiesJSON []byte
		var driverIDField sql.NullString

		err := rows.Scan(
			&geofence.ID,
			&geofence.Name,
			&geometryWKT,
			&propertiesJSON,
			&driverIDField,
			&geofence.BufferDistance,
			&geofence.Active,
			&geofence.CreatedAt,
			&geofence.UpdatedAt,
		)

		if err != nil {
			continue
		}

		// Convert WKT back to geometry
		geofence.Geometry = geometryWKT

		// Unmarshal properties
		if err := json.Unmarshal(propertiesJSON, &geofence.Properties); err != nil {
			geofence.Properties = make(map[string]interface{})
		}

		// Handle nullable driver_id
		if driverIDField.Valid {
			geofence.DriverID = &driverIDField.String
		}

		geofences = append(geofences, geofence)
	}

	return geofences, nil
}

// CheckGeofenceEntry checks if a location triggers any geofence alerts
func (s *GeofenceService) CheckGeofenceEntry(driverID string, location models.Location) ([]models.GeofenceAlert, error) {
	query := `
		SELECT 
			g.id,
			g.name,
			CASE 
				WHEN ST_Contains(g.geometry, ST_Point($1, $2)) THEN 'entry'
				ELSE 'exit'
			END as alert_type,
			ST_Contains(g.geometry, ST_Point($1, $2)) as is_inside
		FROM geofences g
		WHERE 
			g.active = true
			AND (g.driver_id IS NULL OR g.driver_id = $3)
			AND (
				ST_Contains(g.geometry, ST_Point($1, $2))
				OR ST_DWithin(
					g.geometry::geography,
					ST_Point($1, $2)::geography,
					g.buffer_distance
				)
			)
	`

	rows, err := s.db.Query(query, location.Longitude, location.Latitude, driverID)
	if err != nil {
		return nil, fmt.Errorf("failed to check geofence entry: %w", err)
	}
	defer rows.Close()

	alerts := make([]models.GeofenceAlert, 0)

	for rows.Next() {
		var geofenceID, geofenceName, alertType string
		var isInside bool

		if err := rows.Scan(&geofenceID, &geofenceName, &alertType, &isInside); err != nil {
			continue
		}

		// Only create alerts for actual entry/exit events
		if isInside {
			alert := models.GeofenceAlert{
				GeofenceID: geofenceID,
				DriverID:   driverID,
				AlertType:  alertType,
				Location:   location,
				Timestamp:  time.Now(),
			}
			alerts = append(alerts, alert)
		}
	}

	return alerts, nil
}

// GetGeofenceStats returns statistics about geofences
func (s *GeofenceService) GetGeofenceStats() (map[string]interface{}, error) {
	query := `
		SELECT 
			COUNT(*) as total_geofences,
			COUNT(CASE WHEN active = true THEN 1 END) as active_geofences,
			COUNT(CASE WHEN driver_id IS NOT NULL THEN 1 END) as driver_specific,
			AVG(buffer_distance) as avg_buffer_distance
		FROM geofences
	`

	var totalGeofences, activeGeofences, driverSpecific int
	var avgBufferDistance sql.NullFloat64

	err := s.db.QueryRow(query).Scan(
		&totalGeofences,
		&activeGeofences,
		&driverSpecific,
		&avgBufferDistance,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get geofence stats: %w", err)
	}

	stats := map[string]interface{}{
		"total_geofences":     totalGeofences,
		"active_geofences":    activeGeofences,
		"driver_specific":     driverSpecific,
		"avg_buffer_distance": 0.0,
		"timestamp":           time.Now().Unix(),
	}

	if avgBufferDistance.Valid {
		stats["avg_buffer_distance"] = avgBufferDistance.Float64
	}

	return stats, nil
}

// Helper methods

func (s *GeofenceService) geometryToWKT(geom interface{}) (string, error) {
	// Handle different geometry input formats
	switch v := geom.(type) {
	case string:
		// Assume it's already WKT
		return v, nil
	case map[string]interface{}:
		// Handle GeoJSON format
		return s.geoJSONToWKT(v)
	default:
		return "", fmt.Errorf("unsupported geometry type")
	}
}

func (s *GeofenceService) geoJSONToWKT(geoJSON map[string]interface{}) (string, error) {
	geomType, ok := geoJSON["type"].(string)
	if !ok {
		return "", fmt.Errorf("missing geometry type")
	}

	coordinates, ok := geoJSON["coordinates"].([]interface{})
	if !ok {
		return "", fmt.Errorf("missing coordinates")
	}

	switch geomType {
	case "Polygon":
		return s.coordinatesToPolygonWKT(coordinates)
	case "Point":
		return s.coordinatesToPointWKT(coordinates)
	case "LineString":
		return s.coordinatesToLineStringWKT(coordinates)
	default:
		return "", fmt.Errorf("unsupported geometry type: %s", geomType)
	}
}

func (s *GeofenceService) coordinatesToPolygonWKT(coordinates []interface{}) (string, error) {
	if len(coordinates) == 0 {
		return "", fmt.Errorf("empty coordinates")
	}

	rings := make([]string, 0)

	for _, ring := range coordinates {
		ringCoords, ok := ring.([]interface{})
		if !ok {
			continue
		}

		ringWKT := ""
		for i, coord := range ringCoords {
			coordArray, ok := coord.([]interface{})
			if !ok || len(coordArray) < 2 {
				continue
			}

			lng, ok1 := coordArray[0].(float64)
			lat, ok2 := coordArray[1].(float64)
			if !ok1 || !ok2 {
				continue
			}

			if i > 0 {
				ringWKT += ","
			}
			ringWKT += fmt.Sprintf("%.6f %.6f", lng, lat)
		}

		if ringWKT != "" {
			rings = append(rings, fmt.Sprintf("(%s)", ringWKT))
		}
	}

	if len(rings) == 0 {
		return "", fmt.Errorf("no valid rings found")
	}

	return fmt.Sprintf("POLYGON(%s)", strings.Join(rings, ",")), nil
}

func (s *GeofenceService) coordinatesToPointWKT(coordinates []interface{}) (string, error) {
	if len(coordinates) < 2 {
		return "", fmt.Errorf("point coordinates must have at least 2 elements")
	}

	lng, ok1 := coordinates[0].(float64)
	lat, ok2 := coordinates[1].(float64)
	if !ok1 || !ok2 {
		return "", fmt.Errorf("invalid coordinate values")
	}

	return fmt.Sprintf("POINT(%.6f %.6f)", lng, lat), nil
}

func (s *GeofenceService) coordinatesToLineStringWKT(coordinates []interface{}) (string, error) {
	if len(coordinates) < 2 {
		return "", fmt.Errorf("linestring must have at least 2 points")
	}

	points := make([]string, 0)

	for _, coord := range coordinates {
		coordArray, ok := coord.([]interface{})
		if !ok || len(coordArray) < 2 {
			continue
		}

		lng, ok1 := coordArray[0].(float64)
		lat, ok2 := coordArray[1].(float64)
		if !ok1 || !ok2 {
			continue
		}

		points = append(points, fmt.Sprintf("%.6f %.6f", lng, lat))
	}

	if len(points) < 2 {
		return "", fmt.Errorf("insufficient valid points for linestring")
	}

	return fmt.Sprintf("LINESTRING(%s)", strings.Join(points, ",")), nil
}

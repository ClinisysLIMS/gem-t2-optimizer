# GEM Optimizer Backend API Documentation

## Base URL
```
http://localhost:3001
```

## Authentication
No authentication required (development version).

## Response Format
All API responses follow this structure:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "error": "Error description",
  "details": "Additional error details (development mode only)"
}
```

## Endpoints

### Health Check

#### GET /health
Check if the API server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### Jamboree Management

#### POST /api/jamboree
Save a new jamboree configuration.

**Request Body:**
```json
{
  "eventDetails": {
    "name": "Event Name",
    "date": "2024-06-15",
    "location": "Event Location",
    "type": "jamboree"
  },
  "vehicleConfigurations": [
    {
      "id": "vehicle-1",
      "name": "Vehicle Name",
      "type": "gem_e4",
      "specifications": {
        "maxSpeed": 25,
        "range": 30,
        "capacity": 4
      }
    }
  ],
  "controllerSettings": {
    "speedLimits": {
      "eco": 15,
      "normal": 20,
      "sport": 25
    },
    "regenerativeBraking": true,
    "torqueSettings": {
      "acceleration": 75,
      "deceleration": 60
    }
  },
  "weatherData": {
    "temperature": 75,
    "humidity": 60,
    "windSpeed": 5,
    "conditions": "sunny"
  },
  "terrainData": {
    "type": "hilly",
    "grade": 5,
    "surface": "paved"
  },
  "groupInfo": {
    "name": "Group Name",
    "memberCount": 15,
    "contact": "contact@example.com"
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    // ... all the request data plus:
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Jamboree configuration saved successfully"
}
```

#### GET /api/jamboree/:id
Retrieve a specific jamboree configuration.

**Parameters:**
- `id` (string): Jamboree ID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    // Complete jamboree configuration object
  }
}
```

**Error:** `404 Not Found` if jamboree doesn't exist.

#### GET /api/jamboree
List recent jamboree configurations.

**Query Parameters:**
- `limit` (optional, number): Number of results to return (default: 20, max: 100)
- `offset` (optional, number): Number of results to skip (default: 0)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-string",
      "eventDetails": {
        "name": "Event Name",
        "date": "2024-06-15",
        "location": "Event Location",
        "type": "jamboree"
      },
      "vehicleCount": 2,
      "groupInfo": {
        "name": "Group Name",
        "memberCount": 15
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 10,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

#### PUT /api/jamboree/:id
Update an existing jamboree configuration.

**Parameters:**
- `id` (string): Jamboree ID

**Request Body:** Same as POST /api/jamboree

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    // Updated jamboree configuration
  },
  "message": "Jamboree configuration updated successfully"
}
```

**Error:** `404 Not Found` if jamboree doesn't exist.

#### DELETE /api/jamboree/:id
Delete a jamboree configuration.

**Parameters:**
- `id` (string): Jamboree ID

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Jamboree configuration deleted successfully"
}
```

**Error:** `404 Not Found` if jamboree doesn't exist.

---

### Sharing

#### POST /api/jamboree/:id/share
Generate a shareable link for a jamboree configuration.

**Parameters:**
- `id` (string): Jamboree ID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "shareId": "uuid-string",
    "shareUrl": "http://localhost:3001/api/share/uuid-string",
    "expiresAt": "2024-02-14T10:30:00.000Z"
  },
  "message": "Shareable link generated successfully"
}
```

**Error:** `404 Not Found` if jamboree doesn't exist.

#### GET /api/share/:shareId
Access a shared jamboree configuration.

**Parameters:**
- `shareId` (string): Share ID from the share link

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "jamboree": {
      // Complete jamboree configuration
    },
    "shareInfo": {
      "createdAt": "2024-01-15T10:30:00.000Z",
      "accessCount": 1,
      "expiresAt": "2024-02-14T10:30:00.000Z"
    }
  }
}
```

**Errors:**
- `404 Not Found`: Share link not found
- `410 Gone`: Share link has expired

---

## Data Models

### Event Details
```typescript
{
  name: string;           // Event name
  date: string;           // ISO date string (YYYY-MM-DD)
  location: string;       // Event location
  type: "jamboree" | "rally" | "camp";
}
```

### Vehicle Configuration
```typescript
{
  id: string;             // Unique vehicle identifier
  name: string;           // Vehicle display name
  type: "gem_e2" | "gem_e4" | "gem_e6";
  specifications: {
    maxSpeed: number;     // Maximum speed in mph
    range: number;        // Range in miles
    capacity: number;     // Passenger capacity
  };
}
```

### Controller Settings
```typescript
{
  speedLimits: {
    eco: number;          // Eco mode speed limit
    normal: number;       // Normal mode speed limit
    sport: number;        // Sport mode speed limit
  };
  regenerativeBraking: boolean;
  torqueSettings: {
    acceleration: number; // Acceleration torque percentage
    deceleration: number; // Deceleration torque percentage
  };
}
```

### Weather Data
```typescript
{
  temperature: number;    // Temperature in Fahrenheit
  humidity: number;       // Humidity percentage
  windSpeed: number;      // Wind speed in mph
  conditions: "sunny" | "cloudy" | "rainy" | "snow";
}
```

### Terrain Data
```typescript
{
  type: "flat" | "hilly" | "mixed";
  grade: number;          // Average grade percentage
  surface: "paved" | "gravel" | "dirt" | "mixed";
}
```

### Group Information
```typescript
{
  name: string;           // Group/organization name
  memberCount: number;    // Number of group members
  contact: string;        // Contact email or phone
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request (validation errors) |
| 404  | Not Found |
| 410  | Gone (expired share link) |
| 500  | Internal Server Error |

---

## Rate Limiting
No rate limiting implemented in this version.

## CORS
All origins are allowed in development mode. Configure specific origins for production.

## Data Persistence
- Data is stored in JSON files in the `data/` directory
- Automatic cleanup keeps only the 100 most recent jamborees
- Share links expire after 30 days
# GEM Optimizer Backend API

A comprehensive Express.js backend server for the GEM T2 Controller Optimizer application with SQLite database, trip planning, and community sharing features.

## Features

### Core Functionality
- **Trip Planning**: Create, manage, and optimize weekend outings and jamborees
- **Community Sharing**: Share configurations with shareable links and community features
- **SQLite Database**: Robust data persistence with proper relationships
- **Real-time Analytics**: Track views, downloads, and community engagement

### Technical Features
- **Security**: Helmet.js security headers, rate limiting, input validation
- **Performance**: Compression, caching, database indexing
- **Monitoring**: Request logging, health checks, database statistics
- **Scalability**: Connection pooling, transaction support, automated cleanup

## Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Initialize the database:
   ```bash
   npm run init-db
   ```

4. (Optional) Copy environment template:
   ```bash
   cp .env.example .env
   ```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run prod
```

### Database Management
```bash
npm run init-db    # Initialize database schema
npm run setup      # Full setup (install + init-db)
npm run clean      # Clean database and data files
```

The server will start on port 3001 by default. You can change this by setting the `PORT` environment variable.

## API Endpoints

### System
- **GET** `/api/health` - Health check with database statistics

### Trip Planning (`/api/trips`)
- **POST** `/` - Create new trip plan
- **GET** `/` - List trips (with filtering and pagination)
- **GET** `/:id` - Get specific trip
- **PUT** `/:id` - Update trip
- **DELETE** `/:id` - Delete trip
- **POST** `/:id/participants` - Add trip participant
- **GET** `/stats/overview` - Trip statistics

### Community Sharing (`/api/community`)
- **POST** `/share` - Share a configuration
- **GET** `/shared` - Browse shared configurations
- **GET** `/shared/:shareCode` - Get shared configuration
- **POST** `/shared/:shareCode/download` - Record download
- **POST** `/shared/:shareCode/like` - Like/unlike configuration
- **GET** `/featured` - Get featured configurations
- **GET** `/stats` - Community statistics
- **GET** `/tags` - Popular tags

### Jamboree Configuration Management

#### Save New Configuration
- **POST** `/api/jamboree`
- **Body:** Complete jamboree configuration object
- **Response:** Created configuration with generated ID

#### Retrieve Configuration
- **GET** `/api/jamboree/:id`
- **Response:** Complete jamboree configuration

#### List Configurations
- **GET** `/api/jamboree`
- **Query Parameters:**
  - `limit` (optional): Number of results to return (default: 20)
  - `offset` (optional): Number of results to skip (default: 0)
- **Response:** Array of jamboree summaries with pagination info

#### Update Configuration
- **PUT** `/api/jamboree/:id`
- **Body:** Updated jamboree configuration object
- **Response:** Updated configuration

#### Delete Configuration
- **DELETE** `/api/jamboree/:id`
- **Response:** Success confirmation

### Sharing

#### Generate Share Link
- **POST** `/api/jamboree/:id/share`
- **Response:** Shareable URL and expiration info

#### Access Shared Configuration
- **GET** `/api/share/:shareId`
- **Response:** Jamboree configuration and share metadata

## Data Structure

### Jamboree Configuration Object

```json
{
  "id": "uuid-string",
  "eventDetails": {
    "name": "Event Name",
    "date": "2024-06-15",
    "location": "Event Location",
    "type": "jamboree|rally|camp"
  },
  "vehicleConfigurations": [
    {
      "id": "vehicle-id",
      "name": "Vehicle Name",
      "type": "gem_e2|gem_e4|gem_e6",
      "specifications": {
        "maxSpeed": 25,
        "range": 30,
        "capacity": 2
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
    "conditions": "sunny|cloudy|rainy|snow"
  },
  "terrainData": {
    "type": "flat|hilly|mixed",
    "grade": 5,
    "surface": "paved|gravel|dirt|mixed"
  },
  "groupInfo": {
    "name": "Group Name",
    "memberCount": 15,
    "contact": "contact@example.com"
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## Storage

The API uses JSON files for data persistence:

- `data/jamborees.json` - Stores all jamboree configurations
- `data/shares.json` - Stores share link metadata

Data files are automatically created when the server starts.

## Error Handling

The API returns structured error responses:

```json
{
  "error": "Error description",
  "details": "Additional error details (development mode only)"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `410` - Gone (expired share link)
- `500` - Internal Server Error

## CORS Configuration

The server is configured to allow all origins for development. In production, you should configure specific allowed origins for security.

## Limitations

- Uses file-based storage (not suitable for high-traffic production use)
- No authentication or authorization
- Limited to 100 stored configurations (automatically pruned)
- Share links expire after 30 days

## Development Notes

- The server automatically creates the data directory and files if they don't exist
- Nodemon is included for development hot-reloading
- All data is stored in JSON format for easy debugging and manual inspection
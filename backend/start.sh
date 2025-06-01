#!/bin/bash

# GEM Optimizer Backend Startup Script

echo "🚀 Starting GEM Optimizer Backend Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16+ first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the backend directory."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Initialize database
if [ ! -f "database/gem_optimizer.db" ]; then
    echo "🗄️ Initializing SQLite database..."
    npm run init-db
    if [ $? -ne 0 ]; then
        echo "❌ Failed to initialize database"
        exit 1
    fi
fi

# Create data directory for legacy support
if [ ! -d "data" ]; then
    echo "📁 Creating data directory..."
    mkdir -p data
fi

# Initialize legacy data files if they don't exist
if [ ! -f "data/jamborees.json" ]; then
    echo "[]" > data/jamborees.json
fi

if [ ! -f "data/shares.json" ]; then
    echo "{}" > data/shares.json
fi

# Create logs directory
if [ ! -d "logs" ]; then
    mkdir -p logs
fi

echo "✅ Setup complete!"
echo ""
echo "🌐 Starting server..."
echo "📊 API Base: http://localhost:3001/api"
echo "🔍 Health Check: http://localhost:3001/api/health"
echo "📚 Available endpoints:"
echo "   - POST /api/trips (Create trip)"
echo "   - GET  /api/trips (List trips)"
echo "   - POST /api/community/share (Share config)"
echo "   - GET  /api/community/shared (Browse shared)"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm start
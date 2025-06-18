#!/bin/bash

# Check for foreground flag
FOREGROUND=false
if [[ "$1" == "--foreground" || "$1" == "-f" ]]; then
    FOREGROUND=true
fi

echo "Starting PhilsAxioms..."

# Build shared package
echo "Building shared package..."
npm run build --workspace=packages/shared

if [ "$FOREGROUND" = true ]; then
    echo "Starting in foreground mode with logging output..."
    echo "Backend: http://localhost:3001"
    echo "Frontend: http://localhost:3000"
    echo ""
    echo "=== Starting Backend ==="
    
    # Start backend in foreground with concurrency
    npx concurrently \
        --names "BACKEND,FRONTEND" \
        --prefix-colors "blue,green" \
        "npm run dev --workspace=packages/backend" \
        "sleep 3 && npm run dev --workspace=packages/frontend"
else
    # Original background mode
    echo "Starting backend server..."
    npm run dev --workspace=packages/backend &
    BACKEND_PID=$!

    # Wait a moment for backend to start
    sleep 3

    # Start frontend
    echo "Starting frontend server..."
    npm run dev --workspace=packages/frontend &
    FRONTEND_PID=$!

    echo "PhilsAxioms is starting up..."
    echo "Backend: http://localhost:3001"
    echo "Frontend: http://localhost:3000"
    echo ""
    echo "Press Ctrl+C to stop all servers"
    echo "Run './start.sh --foreground' to see logging output"

    # Function to kill all processes when script exits
    cleanup() {
        echo "Shutting down servers..."
        kill $BACKEND_PID 2>/dev/null
        kill $FRONTEND_PID 2>/dev/null
        exit
    }

    # Set up trap to catch Ctrl+C
    trap cleanup SIGINT

    # Wait for both processes
    wait
fi
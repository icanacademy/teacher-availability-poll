#!/bin/bash

# Get the directory where this script is located
cd "$(dirname "$0")"

echo "🚀 Starting NOAH's Ark..."
echo "📍 Location: $(pwd)"
echo ""
echo "Starting backend server and frontend..."
echo "----------------------------------------"
echo ""

# Run npm start which uses concurrently to run both servers
npm start

#!/bin/bash
# Transaction Service Setup Script

echo "Setting up Transaction Service..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "Node.js version: $(node --version)"

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 &> /dev/null; then
    echo "PostgreSQL is not running. Starting with Docker..."
    docker-compose up -d transaction-db
    sleep 10
else
    echo "PostgreSQL is running"
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Copy environment file
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
fi

# Run migrations
echo "Running database migrations..."
npm run migrate

# Seed database
echo "Seeding database with sample data..."
npm run seed

echo "Setup complete! You can now start the service with 'npm run dev'"
echo "API Documentation will be available at: http://localhost:3003/api-docs"
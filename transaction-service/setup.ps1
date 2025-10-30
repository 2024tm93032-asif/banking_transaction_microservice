# Transaction Service Setup Script
Write-Host "Setting up Transaction Service..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check if PostgreSQL is running
try {
    $pgStatus = pg_isready -h localhost -p 5432
    Write-Host "PostgreSQL is running" -ForegroundColor Green
} catch {
    Write-Host "PostgreSQL is not running. Starting with Docker..." -ForegroundColor Yellow
    docker-compose up -d transaction-db
    Start-Sleep -Seconds 10
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# Copy environment file
if (!(Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

# Run migrations
Write-Host "Running database migrations..." -ForegroundColor Yellow
npm run migrate

# Seed database
Write-Host "Seeding database with sample data..." -ForegroundColor Yellow
npm run seed

Write-Host "Setup complete! You can now start the service with 'npm run dev'" -ForegroundColor Green
Write-Host "API Documentation will be available at: http://localhost:3003/api-docs" -ForegroundColor Cyan
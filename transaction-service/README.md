# Transaction Service

A Node.js microservice for handling banking transactions including deposits, withdrawals, transfers, and transaction statements.

## Features

- ✅ Deposit transactions
- ✅ Withdrawal transactions  
- ✅ Transfer transactions (with dual entry)
- ✅ Transaction statements/history
- ✅ Idempotency key support
- ✅ Business rule validation (no overdraft for basic accounts)
- ✅ PostgreSQL database per service
- ✅ RESTful API with OpenAPI documentation
- ✅ Comprehensive logging and error handling
- ✅ Dockerized deployment
- ✅ Database admin interface (Adminer)

## Architecture

This service follows microservices architecture principles:
- **Database per Service**: Owns `transactions` and `idempotency_keys` tables
- **Denormalized Data**: Contains minimal account/customer info for queries
- **Service Boundaries**: No shared database tables with other services
- **API First**: Well-defined REST API with OpenAPI specification
- **Containerized**: Fully containerized with Docker and Docker Compose

## 🐳 Docker Setup (Recommended)

### Prerequisites
- Docker Desktop installed
- Docker Compose installed
- Minimum 4GB RAM available for containers

### Quick Start with Docker

1. **Clone the repository**
```bash
git clone <repository-url>
cd transaction-service
```

2. **Create the external network**
```bash
docker network create banking-network
```

3. **Build and start all services**
```bash
docker-compose up --build
```

4. **Seed the database with test data**
```bash
docker exec transaction-service node src/database/seed.js
```

5. **Access the services**
- **Transaction API**: http://localhost:3003
- **API Documentation**: http://localhost:3003/api-docs
- **Database Admin** (Adminer): http://localhost:8081 (with `--profile dev`)

### Docker Commands Reference

#### 🚀 **Starting Services**

```bash
# Start all services in foreground
docker-compose up

# Start all services in background (detached)
docker-compose up -d

# Start with development tools (includes Adminer)
docker-compose --profile dev up -d

# Rebuild and start (after code changes)
docker-compose up --build
```

#### 🛠️ **Development Commands**

```bash
# View logs from all services
docker-compose logs

# View logs from specific service
docker-compose logs transaction-service
docker-compose logs transaction-db

# Follow logs in real-time
docker-compose logs -f transaction-service

# Execute commands inside containers
docker exec transaction-service npm test
docker exec transaction-service npm run lint

# Access container shell
docker exec -it transaction-service sh
docker exec -it transaction-db psql -U postgres -d transaction_db
```

#### 🗄️ **Database Commands**

```bash
# Seed database with test data
docker exec transaction-service node src/database/seed.js

# Run database migrations
docker exec transaction-service npm run migrate

# Connect to PostgreSQL directly
docker exec -it transaction-db psql -U postgres -d transaction_db

# Backup database
docker exec transaction-db pg_dump -U postgres transaction_db > backup.sql

# Restore database
docker exec -i transaction-db psql -U postgres transaction_db < backup.sql
```

#### 🧹 **Cleanup Commands**

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes database data)
docker-compose down -v

# Remove all containers and networks
docker-compose down --remove-orphans

# Clean up Docker system
docker system prune -f
```

### Services Overview

| Service | Container Name | Internal Port | External Port | Description |
|---------|----------------|---------------|---------------|-------------|
| **Transaction Service** | `transaction-service` | 3003 | 3003 | Main Node.js application |
| **PostgreSQL Database** | `transaction-db` | 5432 | 5433 | Database server |
| **Adminer** | `transaction-adminer` | 8080 | 8081 | Database admin UI (dev only) |

### Environment Configuration

The Docker setup uses these environment variables (configured in `docker-compose.yml`):

```yaml
NODE_ENV: development
PORT: 3003
DB_HOST: transaction-db
DB_PORT: 5432
DB_NAME: transaction_db
DB_USER: postgres
DB_PASSWORD: password
LOG_LEVEL: info
```

### Volumes and Data Persistence

- **Database Data**: Persisted in `transaction-db-data` volume
- **Application Logs**: Mounted to `./logs` directory on host
- **Database Schema**: Auto-loaded from `./src/database/schema.sql`

## 🧪 Testing the API

### 1. **Health Check**
```bash
curl http://localhost:3003/health
```

### 2. **Swagger Documentation**
Open http://localhost:3003/api-docs in your browser for interactive API testing

### 3. **Sample API Calls**

#### Deposit Transaction
```bash
curl -X POST http://localhost:3003/api/v1/transactions/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": 1,
    "amount": 1000.00,
    "counterparty": "ATM Deposit",
    "description": "Cash deposit"
  }'
```

#### Withdrawal Transaction
```bash
curl -X POST http://localhost:3003/api/v1/transactions/withdraw \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": 1,
    "amount": 500.00,
    "counterparty": "ATM Withdrawal",
    "description": "Cash withdrawal"
  }'
```

#### Transfer Transaction
```bash
curl -X POST http://localhost:3003/api/v1/transactions/transfer \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: transfer-12345" \
  -d '{
    "from_account_id": 1,
    "to_account_id": 3,
    "amount": 2000.00,
    "description": "Transfer to savings"
  }'
```

#### Get Transaction Statement
```bash
curl "http://localhost:3003/api/v1/transactions/statement/1?limit=10&offset=0"
```

### 4. **Database Admin Interface**

Access Adminer at http://localhost:8081 (when started with `--profile dev`):

**Login Credentials:**
- **System**: PostgreSQL
- **Server**: transaction-db
- **Username**: postgres
- **Password**: password
- **Database**: transaction_db

  <img width="478" height="215" alt="image" src="https://github.com/user-attachments/assets/e548d707-bf9c-4571-866b-9e7a87fcb256" />


## 📊 Sample Data

After running the seed command, you'll have:

- **8 Account Projections** with different account types
- **10 Sample Transactions** across various accounts
- **2 Idempotency Keys** for testing duplicate prevention

### Available Test Accounts

| Account ID | Account Number | Type | Balance | Status |
|------------|----------------|------|---------|---------|
| 1 | 688833778006 | SALARY | 498,715.54 | ACTIVE |
| 2 | 711203034246 | CURRENT | 85,821.84 | FROZEN |
| 3 | 526468425099 | SALARY | 319,830.41 | ACTIVE |
| 16 | 123456789016 | SAVINGS | 250,000.00 | ACTIVE |
| 17 | 123456789017 | CURRENT | 150,000.00 | ACTIVE |

## 🐛 Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Check what's using the port
netstat -ano | findstr :3003

# Change port in docker-compose.yml if needed
```

**2. Database Connection Issues**
```bash
# Check if database is healthy
docker-compose ps

# View database logs
docker-compose logs transaction-db
```

**3. Build Failures**
```bash
# Clean build
docker-compose down
docker system prune -f
docker-compose build --no-cache
docker-compose up
```

**4. SSL Certificate Issues**
```bash
# The Dockerfile includes SSL workarounds
# If issues persist, check your network/firewall settings
```

### Health Checks

Both services include health checks:

- **Database**: `pg_isready` command
- **Application**: HTTP health endpoint at `/health`

Check health status:
```bash
docker-compose ps
```

## 🔧 Local Development (Without Docker)

If you prefer local development without Docker:

### Prerequisites
- Node.js 18+
- PostgreSQL 12+

### Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npm run migrate

# Seed sample data
npm run seed

# Start development server
npm run dev
```

## API Documentation

Once the service is running, access the API documentation at:
- **Swagger UI**: http://localhost:3003/api-docs
- **OpenAPI JSON**: http://localhost:3003/swagger.json

## Database Schema

### Tables Owned by This Service:

#### transactions
- `txn_id` (Primary Key)
- `account_id` (Foreign Key reference)
- `amount` (Decimal)
- `txn_type` (ENUM: DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT)
- `counterparty` (String)
- `reference` (String - unique)
- `description` (String)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### idempotency_keys
- `id` (Primary Key)
- `key` (String - unique)
- `request_body` (JSON)
- `expires_at` (Timestamp)
- `created_at` (Timestamp)

#### account_projections (denormalized)
- `account_id` (Primary Key)
- `customer_id` (Reference)
- `account_number` (String)
- `account_type` (ENUM)
- `current_balance` (Decimal)
- `currency` (String)
- `status` (ENUM)
- `last_updated` (Timestamp)

## API Endpoints

### Transactions
- `POST /api/v1/transactions/deposit` - Process deposit
- `POST /api/v1/transactions/withdraw` - Process withdrawal
- `POST /api/v1/transactions/transfer` - Process transfer (with idempotency)
- `GET /api/v1/transactions/statement/:accountId` - Get transaction history

### Health Check
- `GET /health` - Service health status

## Business Rules

1. **No Overdraft**: Basic accounts cannot have negative balances
2. **Transfer Dual Entry**: All transfers create two transaction records (debit/credit)
3. **Idempotency**: Transfer operations support idempotency keys to prevent duplicates
4. **Validation**: All transactions validated against account status and balance

## Testing

```bash
# Run tests (inside container)
docker exec transaction-service npm test

# Run with coverage
docker exec transaction-service npm run test:coverage

# Local testing (if Node.js installed)
npm test
npm run test:coverage
```

## 📝 Logs and Monitoring

### Viewing Logs
```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View specific service logs
docker-compose logs transaction-service
docker-compose logs transaction-db

# View logs with timestamps
docker-compose logs -t transaction-service
```

### Log Files
Application logs are also written to files in the `./logs` directory:
- `./logs/app.log` - Application logs
- `./logs/error.log` - Error logs

### Health Monitoring
- Health checks available at `/health`
- Structured logging with Winston
- Request/response logging
- Error tracking and reporting

## 🔒 Security Features

- **Helmet.js**: Security headers
- **CORS**: Configurable cross-origin requests
- **Rate Limiting**: Prevents abuse
- **Input Validation**: Request validation middleware
- **Non-root User**: Container runs as non-root user
- **Idempotency**: Prevents duplicate transactions

## 🚀 Production Considerations

### Environment Variables for Production
```yaml
NODE_ENV: production
LOG_LEVEL: warn
RATE_LIMIT_WINDOW_MS: 900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS: 100
ALLOWED_ORIGINS: "https://your-frontend.com"
```

### Scaling
- Use Docker Swarm or Kubernetes for orchestration
- Configure load balancer for multiple instances
- Set up database clustering for high availability
- Implement proper monitoring and alerting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Test with Docker: `docker-compose up --build`
6. Submit a pull request

## License

MIT License

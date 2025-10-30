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

## Architecture

This service follows microservices architecture principles:
- **Database per Service**: Owns `transactions` and `idempotency_keys` tables
- **Denormalized Data**: Contains minimal account/customer info for queries
- **Service Boundaries**: No shared database tables with other services
- **API First**: Well-defined REST API with OpenAPI specification

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- Docker (optional)

### Installation

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

### Environment Variables

```env
PORT=3003
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transaction_db
DB_USER=postgres
DB_PASSWORD=password
NODE_ENV=development
LOG_LEVEL=info
```

## API Documentation

Once the service is running, access the API documentation at:
- Swagger UI: `http://localhost:3003/api-docs`
- OpenAPI JSON: `http://localhost:3003/api-docs.json`

## Database Schema

### Tables Owned by This Service:

#### transactions
- `txn_id` (Primary Key)
- `account_id` (Foreign Key reference)
- `amount` (Decimal)
- `txn_type` (ENUM: DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT)
- `counterparty` (String)
- `reference` (String - unique)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### idempotency_keys
- `id` (Primary Key)
- `key` (String - unique)
- `txn_id` (Foreign Key to transactions)
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
- `GET /api/v1/transactions/account/:accountId` - Get transaction history
- `GET /api/v1/transactions/:txnId` - Get transaction details

### Health Check
- `GET /health` - Service health status

## Business Rules

1. **No Overdraft**: Basic accounts cannot have negative balances
2. **Transfer Dual Entry**: All transfers create two transaction records (debit/credit)
3. **Idempotency**: Transfer operations support idempotency keys to prevent duplicates
4. **Validation**: All transactions validated against account status and balance

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Docker

```bash
# Build image
docker build -t transaction-service .

# Run with docker-compose
docker-compose up
```

## Monitoring

- Health checks available at `/health`
- Structured logging with Winston
- Request/response logging
- Error tracking and reporting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License
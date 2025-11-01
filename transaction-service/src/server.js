require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

// Import routes
const transactionRoutes = require('./routes/transactions');
const healthRoutes = require('./routes/health');

// Import swagger config
const swaggerSpec = require('./config/swagger');

// Import logger
const { logger } = require('./utils/logger');

// Import messaging
const consumerManager = require('./messaging/ConsumerManager');
const transactionService = require('./services/TransactionService');

// Create Express app
const app = express();

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    timestamp: new Date().toISOString(),
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use(requestLogger);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Serve OpenAPI spec as JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check endpoint
app.use('/health', healthRoutes);

// API routes
const apiVersion = process.env.API_VERSION || 'v1';
app.use(`/api/${apiVersion}/transactions`, transactionRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Transaction Service API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    statusCode: 404
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Server configuration
const PORT = process.env.PORT || 3003;
const HOST = process.env.HOST || '0.0.0.0';

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Stop RabbitMQ consumers
  await consumerManager.shutdown();
  
  // Close database connections
  const db = require('./database/connection');
  await db.close();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  // Stop RabbitMQ consumers
  await consumerManager.shutdown();
  
  // Close database connections
  const db = require('./database/connection');
  await db.close();
  
  process.exit(0);
});

// Unhandled promise rejection
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
});

// Uncaught exception
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, HOST, async () => {
  logger.info(`Transaction Service started on ${HOST}:${PORT}`);
  logger.info(`API Documentation available at http://${HOST}:${PORT}/api-docs`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize and start RabbitMQ consumers
  try {
    logger.info('Initializing RabbitMQ consumers...');
    await consumerManager.startAll();
    logger.info('RabbitMQ consumers started successfully');
    
    // Initialize transaction publisher
    const transactionPublisher = consumerManager.getPublisher('transaction');
    if (transactionPublisher) {
      transactionService.setTransactionPublisher(transactionPublisher);
      logger.info('Transaction publisher initialized successfully');
    } else {
      logger.warn('Transaction publisher not available');
    }
  } catch (error) {
    logger.error('Failed to start RabbitMQ consumers:', error);
    // Don't exit, allow the service to run without messaging
    logger.warn('Service will continue without RabbitMQ consumers');
  }
});

// Export app for testing
module.exports = app;
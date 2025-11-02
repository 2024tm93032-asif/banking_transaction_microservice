const rabbitMQConnection = require('./connection');
const AccountConsumer = require('./consumers/AccountConsumer');
const CustomerConsumer = require('./consumers/CustomerConsumer');
const { logger } = require('../utils/logger');

class ConsumerManager {
  constructor() {
    this.consumers = [];
    this.publishers = [];
    this.isInitialized = false;
    this.isStarted = false;
  }

  /**
   * Initialize all consumers
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        logger.warn('ConsumerManager already initialized');
        return;
      }

      logger.info('Initializing ConsumerManager...');

      // Connect to RabbitMQ first
      await rabbitMQConnection.connect();

      // Initialize consumers
      const accountConsumer = new AccountConsumer();
      const customerConsumer = new CustomerConsumer();

      // Initialize publishers (import singleton instances)
      const transactionPublisher = require('./publishers/TransactionPublisher');

      // Add consumers and publishers to the lists
      this.consumers = [accountConsumer, customerConsumer];
      this.publishers = [transactionPublisher];

      // Initialize each consumer
      for (const consumer of this.consumers) {
        await consumer.initialize();
        logger.info(`Initialized ${consumer.constructor.name}`);
      }

      // Initialize each publisher
      for (const publisher of this.publishers) {
        await publisher.initialize();
        logger.info(`Initialized ${publisher.constructor.name}`);
      }

      this.isInitialized = true;
      logger.info('ConsumerManager initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize ConsumerManager:', error);
      throw error;
    }
  }

  /**
   * Start all consumers
   */
  async startAll() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.isStarted) {
        logger.warn('ConsumerManager already started');
        return;
      }

      logger.info('Starting all consumers...');

      // Start each consumer
      for (const consumer of this.consumers) {
        await consumer.startConsuming();
        logger.info(`Started ${consumer.constructor.name}`);
      }

      this.isStarted = true;
      logger.info('All consumers started successfully');

    } catch (error) {
      logger.error('Failed to start consumers:', error);
      throw error;
    }
  }

  /**
   * Stop all consumers
   */
  async stopAll() {
    try {
      if (!this.isStarted) {
        logger.warn('ConsumerManager not started');
        return;
      }

      logger.info('Stopping all consumers...');

      // Stop each consumer
      for (const consumer of this.consumers) {
        try {
          await consumer.stopConsuming();
          logger.info(`Stopped ${consumer.constructor.name}`);
        } catch (error) {
          logger.error(`Error stopping ${consumer.constructor.name}:`, error);
        }
      }

      this.isStarted = false;
      logger.info('All consumers stopped');

    } catch (error) {
      logger.error('Error stopping consumers:', error);
    }
  }

  /**
   * Restart all consumers
   */
  async restartAll() {
    try {
      logger.info('Restarting all consumers...');
      
      await this.stopAll();
      await this.startAll();
      
      logger.info('All consumers restarted successfully');
    } catch (error) {
      logger.error('Failed to restart consumers:', error);
      throw error;
    }
  }

  /**
   * Get status of all consumers
   */
  getStatus() {
    return {
      managerInitialized: this.isInitialized,
      managerStarted: this.isStarted,
      rabbitMQConnected: rabbitMQConnection.isConnectionReady(),
      consumers: this.consumers.map(consumer => consumer.getStatus())
    };
  }

  /**
   * Get a specific consumer by name
   */
  getConsumer(consumerName) {
    return this.consumers.find(consumer => 
      consumer.constructor.name === consumerName
    );
  }

  /**
   * Start a specific consumer
   */
  async startConsumer(consumerName) {
    try {
      const consumer = this.getConsumer(consumerName);
      if (!consumer) {
        throw new Error(`Consumer not found: ${consumerName}`);
      }

      await consumer.startConsuming();
      logger.info(`Started consumer: ${consumerName}`);
    } catch (error) {
      logger.error(`Failed to start consumer ${consumerName}:`, error);
      throw error;
    }
  }

  /**
   * Stop a specific consumer
   */
  async stopConsumer(consumerName) {
    try {
      const consumer = this.getConsumer(consumerName);
      if (!consumer) {
        throw new Error(`Consumer not found: ${consumerName}`);
      }

      await consumer.stopConsuming();
      logger.info(`Stopped consumer: ${consumerName}`);
    } catch (error) {
      logger.error(`Failed to stop consumer ${consumerName}:`, error);
      throw error;
    }
  }

  /**
   * Health check for all consumers
   */
  async healthCheck() {
    const status = this.getStatus();
    
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      details: {
        rabbitMQ: status.rabbitMQConnected ? 'connected' : 'disconnected',
        manager: {
          initialized: status.managerInitialized,
          started: status.managerStarted
        },
        consumers: {}
      }
    };

    // Check each consumer
    for (const consumer of status.consumers) {
      health.details.consumers[consumer.name] = {
        consuming: consumer.isConsuming,
        connected: consumer.isConnected
      };

      // Mark as unhealthy if any consumer is not working properly
      if (!consumer.isConsuming || !consumer.isConnected) {
        health.status = 'unhealthy';
      }
    }

    // Mark as unhealthy if RabbitMQ is not connected
    if (!status.rabbitMQConnected) {
      health.status = 'unhealthy';
    }

    return health;
  }

  /**
   * Get publisher instance by type
   * @param {string} publisherType - Type of publisher ('transaction')
   * @returns {Object|null} Publisher instance
   */
  getPublisher(publisherType) {
    if (publisherType === 'transaction') {
      return this.publishers.find(publisher => publisher.constructor.name === 'TransactionPublisher') || null;
    }
    return null;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      logger.info('Shutting down ConsumerManager...');
      
      // Stop all consumers
      await this.stopAll();
      
      // Close RabbitMQ connection
      await rabbitMQConnection.close();
      
      this.isInitialized = false;
      this.isStarted = false;
      
      logger.info('ConsumerManager shut down successfully');
    } catch (error) {
      logger.error('Error during ConsumerManager shutdown:', error);
    }
  }

  /**
   * Handle process signals for graceful shutdown
   */
  setupGracefulShutdown() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, initiating graceful shutdown...`);
        await this.shutdown();
        process.exit(0);
      });
    });
  }
}

// Singleton instance
const consumerManager = new ConsumerManager();

module.exports = consumerManager;
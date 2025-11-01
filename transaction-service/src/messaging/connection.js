const amqp = require('amqplib');
const { logger } = require('../utils/logger');

class RabbitMQConnection {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectInterval = 5000; // 5 seconds
  }

  /**
   * Connect to RabbitMQ
   */
  async connect() {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://admin:password@localhost:5672';
      
      logger.info('Connecting to RabbitMQ...', { url: rabbitmqUrl.replace(/\/\/.*@/, '//***:***@') });
      
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      logger.info('Successfully connected to RabbitMQ');

      // Handle connection events
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.isConnected = false;
        this.scheduleReconnect();
      });

      // Set up channel recovery
      this.channel.on('error', (err) => {
        logger.error('RabbitMQ channel error:', err);
      });

      this.channel.on('close', () => {
        logger.warn('RabbitMQ channel closed');
      });

      return this.channel;
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    
    logger.info(`Scheduling RabbitMQ reconnection attempt ${this.reconnectAttempts} in ${this.reconnectInterval}ms`);
    
    setTimeout(() => {
      this.connect().catch((error) => {
        logger.error('Reconnection attempt failed:', error);
      });
    }, this.reconnectInterval);
  }

  /**
   * Get the current channel
   */
  getChannel() {
    if (!this.isConnected || !this.channel) {
      throw new Error('RabbitMQ not connected');
    }
    return this.channel;
  }

  /**
   * Check if connected
   */
  isConnectionReady() {
    return this.isConnected && this.channel !== null;
  }

  /**
   * Close connection
   */
  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      
      this.isConnected = false;
      logger.info('RabbitMQ connection closed successfully');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
    }
  }

  /**
   * Declare a queue with default options
   */
  async declareQueue(queueName, options = {}) {
    const channel = this.getChannel();
    
    const defaultOptions = {
      durable: true,
      exclusive: false,
      autoDelete: false,
      ...options
    };

    const result = await channel.assertQueue(queueName, defaultOptions);
    logger.info(`Queue declared: ${queueName}`, { options: defaultOptions });
    
    return result;
  }

  /**
   * Declare an exchange
   */
  async declareExchange(exchangeName, type = 'topic', options = {}) {
    const channel = this.getChannel();
    
    const defaultOptions = {
      durable: true,
      ...options
    };

    await channel.assertExchange(exchangeName, type, defaultOptions);
    logger.info(`Exchange declared: ${exchangeName}`, { type, options: defaultOptions });
  }

  /**
   * Bind queue to exchange
   */
  async bindQueue(queueName, exchangeName, routingKey) {
    const channel = this.getChannel();
    await channel.bindQueue(queueName, exchangeName, routingKey);
    logger.info(`Queue bound: ${queueName} -> ${exchangeName} (${routingKey})`);
  }
}

// Singleton instance
const rabbitMQConnection = new RabbitMQConnection();

module.exports = rabbitMQConnection;
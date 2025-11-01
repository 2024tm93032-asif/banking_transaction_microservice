const rabbitMQConnection = require('../connection');
const { logger } = require('../../utils/logger');
const CustomerProjectionRepository = require('../../repositories/CustomerProjectionRepository');

class CustomerConsumer {
  constructor() {
    this.queueName = 'customer.updates';
    this.exchangeName = 'customer.events';
    this.routingKeys = [
      'customer.created',
      'customer.updated',
      'customer.status.changed',
      'customer.deleted'
    ];
    this.isConsuming = false;
    this.customerRepository = new CustomerProjectionRepository();
  }

  /**
   * Initialize the consumer
   */
  async initialize() {
    try {
      const channel = rabbitMQConnection.getChannel();

      // Declare exchange
      await rabbitMQConnection.declareExchange(this.exchangeName, 'topic');

      // Declare queue
      await rabbitMQConnection.declareQueue(this.queueName, {
        durable: true,
        exclusive: false,
        autoDelete: false
      });

      // Bind queue to exchange with routing keys
      for (const routingKey of this.routingKeys) {
        await rabbitMQConnection.bindQueue(this.queueName, this.exchangeName, routingKey);
      }

      logger.info('Customer consumer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Customer consumer:', error);
      throw error;
    }
  }

  /**
   * Start consuming messages
   */
  async startConsuming() {
    try {
      if (this.isConsuming) {
        logger.warn('Customer consumer is already consuming');
        return;
      }

      const channel = rabbitMQConnection.getChannel();

      // Set prefetch count to process one message at a time
      await channel.prefetch(1);

      // Start consuming
      await channel.consume(this.queueName, async (message) => {
        if (message) {
          await this.processMessage(message);
        }
      }, {
        noAck: false // Manual acknowledgment
      });

      this.isConsuming = true;
      logger.info('Customer consumer started successfully');
    } catch (error) {
      logger.error('Failed to start Customer consumer:', error);
      throw error;
    }
  }

  /**
   * Process incoming message
   */
  async processMessage(message) {
    const channel = rabbitMQConnection.getChannel();
    
    try {
      const routingKey = message.fields.routingKey;
      const content = JSON.parse(message.content.toString());
      
      logger.info('Processing customer message', { 
        routingKey, 
        messageId: content.messageId,
        customerId: content.data?.customerId 
      });

      // Route message based on event type
      switch (routingKey) {
        case 'customer.created':
          await this.handleCustomerCreated(content);
          break;
        case 'customer.updated':
          await this.handleCustomerUpdated(content);
          break;
        case 'customer.status.changed':
          await this.handleCustomerStatusChanged(content);
          break;
        case 'customer.deleted':
          await this.handleCustomerDeleted(content);
          break;
        default:
          logger.warn('Unknown routing key for customer message:', routingKey);
      }

      // Acknowledge message
      channel.ack(message);
      
      logger.info('Customer message processed successfully', { 
        routingKey, 
        messageId: content.messageId 
      });

    } catch (error) {
      logger.error('Error processing customer message:', error);
      
      // Check if we should retry or send to dead letter queue
      const retryCount = message.properties.headers?.['x-retry-count'] || 0;
      const maxRetries = 3;

      if (retryCount < maxRetries) {
        // Reject and requeue with retry count
        const headers = {
          ...message.properties.headers,
          'x-retry-count': retryCount + 1
        };
        
        // Reject without requeue, we'll republish with delay
        channel.nack(message, false, false);
        
        // Republish with delay (exponential backoff)
        setTimeout(() => {
          this.republishWithRetry(message, headers);
        }, 5000 * (retryCount + 1));
        
      } else {
        // Max retries reached, send to dead letter queue or log
        logger.error('Max retries reached for customer message, discarding:', {
          routingKey: message.fields.routingKey,
          content: message.content.toString()
        });
        channel.nack(message, false, false);
      }
    }
  }

  /**
   * Handle customer created event
   */
  async handleCustomerCreated(messageContent) {
    const { data } = messageContent;
    
    const customerProjection = {
      customer_id: data.customerId,
      customer_number: data.customerNumber,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      status: data.status || 'ACTIVE'
    };

    await this.customerRepository.create(customerProjection);
    
    logger.info('Customer projection created', { customerId: data.customerId });
  }

  /**
   * Handle customer updated event
   */
  async handleCustomerUpdated(messageContent) {
    const { data } = messageContent;
    
    const updates = {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      last_updated: new Date()
    };

    // Remove undefined fields
    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });

    await this.customerRepository.update(data.customerId, updates);
    
    logger.info('Customer projection updated', { customerId: data.customerId });
  }

  /**
   * Handle customer status changed event
   */
  async handleCustomerStatusChanged(messageContent) {
    const { data } = messageContent;
    
    await this.customerRepository.updateStatus(data.customerId, data.newStatus);
    
    logger.info('Customer status updated', { 
      customerId: data.customerId, 
      newStatus: data.newStatus 
    });
  }

  /**
   * Handle customer deleted event
   */
  async handleCustomerDeleted(messageContent) {
    const { data } = messageContent;
    
    // Check if customer has any accounts before deleting
    // In a real scenario, you might want to soft delete or archive
    try {
      const exists = await this.customerRepository.exists(data.customerId);
      if (exists) {
        // For now, we'll update status to CLOSED instead of deleting
        // to maintain referential integrity with account_projections
        await this.customerRepository.updateStatus(data.customerId, 'CLOSED');
        logger.info('Customer projection marked as CLOSED', { customerId: data.customerId });
      }
    } catch (error) {
      logger.warn('Customer projection not found for deletion', { customerId: data.customerId });
    }
  }

  /**
   * Republish message with retry information
   */
  async republishWithRetry(originalMessage, headers) {
    try {
      const channel = rabbitMQConnection.getChannel();
      
      await channel.publish(
        this.exchangeName,
        originalMessage.fields.routingKey,
        originalMessage.content,
        {
          ...originalMessage.properties,
          headers
        }
      );
      
      logger.info('Message republished with retry', { 
        routingKey: originalMessage.fields.routingKey,
        retryCount: headers['x-retry-count']
      });
    } catch (error) {
      logger.error('Failed to republish message:', error);
    }
  }

  /**
   * Stop consuming
   */
  async stopConsuming() {
    try {
      if (!this.isConsuming) {
        logger.warn('Customer consumer is not consuming');
        return;
      }

      const channel = rabbitMQConnection.getChannel();
      await channel.cancel(this.queueName);
      
      this.isConsuming = false;
      logger.info('Customer consumer stopped');
    } catch (error) {
      logger.error('Error stopping Customer consumer:', error);
    }
  }

  /**
   * Get consumer status
   */
  getStatus() {
    return {
      name: 'CustomerConsumer',
      queueName: this.queueName,
      exchangeName: this.exchangeName,
      routingKeys: this.routingKeys,
      isConsuming: this.isConsuming,
      isConnected: rabbitMQConnection.isConnectionReady()
    };
  }
}

module.exports = CustomerConsumer;
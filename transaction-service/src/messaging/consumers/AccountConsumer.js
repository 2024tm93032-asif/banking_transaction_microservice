const rabbitMQConnection = require('../connection');
const { logger } = require('../../utils/logger');
const AccountProjectionRepository = require('../../repositories/AccountProjectionRepository');

class AccountConsumer {
  constructor() {
    this.queueName = 'account.updates';
    this.exchangeName = 'account.events';
    this.routingKeys = [
      'account.created',
      'account.updated',
      'account.status.changed',
      'account.balance.updated'
    ];
    this.isConsuming = false;
    this.accountRepository = new AccountProjectionRepository();
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

      logger.info('Account consumer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Account consumer:', error);
      throw error;
    }
  }

  /**
   * Start consuming messages
   */
  async startConsuming() {
    try {
      if (this.isConsuming) {
        logger.warn('Account consumer is already consuming');
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
      logger.info('Account consumer started successfully');
    } catch (error) {
      logger.error('Failed to start Account consumer:', error);
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
      
      logger.info('Processing account message', { 
        routingKey, 
        messageId: content.messageId,
        accountId: content.data?.accountId 
      });

      // Route message based on event type
      switch (routingKey) {
        case 'account.created':
          await this.handleAccountCreated(content);
          break;
        case 'account.updated':
          await this.handleAccountUpdated(content);
          break;
        case 'account.status.changed':
          await this.handleAccountStatusChanged(content);
          break;
        case 'account.balance.updated':
          await this.handleAccountBalanceUpdated(content);
          break;
        default:
          logger.warn('Unknown routing key for account message:', routingKey);
      }

      // Acknowledge message
      channel.ack(message);
      
      logger.info('Account message processed successfully', { 
        routingKey, 
        messageId: content.messageId 
      });

    } catch (error) {
      logger.error('Error processing account message:', error);
      
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
        
        // Republish with delay (you might want to use a delay queue)
        setTimeout(() => {
          this.republishWithRetry(message, headers);
        }, 5000 * (retryCount + 1)); // Exponential backoff
        
      } else {
        // Max retries reached, send to dead letter queue or log
        logger.error('Max retries reached for account message, discarding:', {
          routingKey: message.fields.routingKey,
          content: message.content.toString()
        });
        channel.nack(message, false, false);
      }
    }
  }

  /**
   * Handle account created event
   */
  async handleAccountCreated(messageContent) {
    const { data } = messageContent;
    
    const accountProjection = {
      account_id: data.accountId,
      customer_id: data.customerId,
      account_number: data.accountNumber,
      account_type: data.accountType,
      current_balance: data.initialBalance || 0,
      currency: data.currency || 'INR',
      status: data.status || 'ACTIVE'
    };

    await this.accountRepository.create(accountProjection);
    
    logger.info('Account projection created', { accountId: data.accountId });
  }

  /**
   * Handle account updated event
   */
  async handleAccountUpdated(messageContent) {
    const { data } = messageContent;
    
    const updates = {
      account_type: data.accountType,
      currency: data.currency,
      last_updated: new Date()
    };

    // Remove undefined fields
    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });

    await this.accountRepository.update(data.accountId, updates);
    
    logger.info('Account projection updated', { accountId: data.accountId });
  }

  /**
   * Handle account status changed event
   */
  async handleAccountStatusChanged(messageContent) {
    const { data } = messageContent;
    
    await this.accountRepository.update(data.accountId, {
      status: data.newStatus,
      last_updated: new Date()
    });
    
    logger.info('Account status updated', { 
      accountId: data.accountId, 
      newStatus: data.newStatus 
    });
  }

  /**
   * Handle account balance updated event
   */
  async handleAccountBalanceUpdated(messageContent) {
    const { data } = messageContent;
    
    await this.accountRepository.update(data.accountId, {
      current_balance: data.newBalance,
      last_updated: new Date()
    });
    
    logger.info('Account balance updated', { 
      accountId: data.accountId, 
      newBalance: data.newBalance 
    });
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
        logger.warn('Account consumer is not consuming');
        return;
      }

      const channel = rabbitMQConnection.getChannel();
      await channel.cancel(this.queueName);
      
      this.isConsuming = false;
      logger.info('Account consumer stopped');
    } catch (error) {
      logger.error('Error stopping Account consumer:', error);
    }
  }

  /**
   * Get consumer status
   */
  getStatus() {
    return {
      name: 'AccountConsumer',
      queueName: this.queueName,
      exchangeName: this.exchangeName,
      routingKeys: this.routingKeys,
      isConsuming: this.isConsuming,
      isConnected: rabbitMQConnection.isConnectionReady()
    };
  }
}

module.exports = AccountConsumer;
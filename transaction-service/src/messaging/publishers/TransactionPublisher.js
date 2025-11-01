const rabbitMQConnection = require('../connection');
const { logger } = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

class TransactionPublisher {
  constructor() {
    this.exchangeName = 'transaction.events';
    this.routingKeys = {
      DEPOSIT: 'transaction.deposit.completed',
      WITHDRAWAL: 'transaction.withdrawal.completed',
      TRANSFER_IN: 'transaction.transfer.in.completed',
      TRANSFER_OUT: 'transaction.transfer.out.completed',
      TRANSFER_CREATED: 'transaction.transfer.created',
      BALANCE_UPDATED: 'account.balance.updated'
    };
    this.isInitialized = false;
  }

  /**
   * Initialize the publisher
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        logger.warn('TransactionPublisher already initialized');
        return;
      }

      // Declare exchange
      await rabbitMQConnection.declareExchange(this.exchangeName, 'topic', {
        durable: true
      });

      this.isInitialized = true;
      logger.info('Transaction publisher initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Transaction publisher:', error);
      throw error;
    }
  }

  /**
   * Publish transaction completed event
   */
  async publishTransactionCompleted(transaction, accountData = null, customerData = null) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const routingKey = this.routingKeys[transaction.txn_type];
      if (!routingKey) {
        logger.warn('Unknown transaction type for publishing:', transaction.txn_type);
        return;
      }

      const eventData = {
        messageId: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType: routingKey,
        source: 'transaction-service',
        version: '1.0.0',
        data: {
          transactionId: transaction.txn_id,
          accountId: transaction.account_id,
          amount: parseFloat(transaction.amount),
          transactionType: transaction.txn_type,
          counterparty: transaction.counterparty,
          reference: transaction.reference,
          description: transaction.description,
          balanceAfter: parseFloat(transaction.balance_after),
          currency: accountData?.currency || 'INR',
          createdAt: transaction.created_at,
          // Include account context if available
          account: accountData ? {
            accountId: accountData.account_id,
            accountNumber: accountData.account_number,
            accountType: accountData.account_type,
            customerId: accountData.customer_id,
            status: accountData.status
          } : null,
          // Include customer context if available
          customer: customerData ? {
            customerId: customerData.customer_id,
            customerNumber: customerData.customer_number,
            firstName: customerData.first_name,
            lastName: customerData.last_name
          } : null
        }
      };

      await this.publishEvent(routingKey, eventData);

      logger.info('Transaction event published', {
        transactionId: transaction.txn_id,
        eventType: routingKey,
        messageId: eventData.messageId
      });

    } catch (error) {
      logger.error('Failed to publish transaction event:', error);
      // Don't throw error to avoid breaking transaction processing
    }
  }

  /**
   * Publish transfer created event (for dual-entry transfers)
   */
  async publishTransferCreated(transferData, fromAccount, toAccount, fromCustomer = null, toCustomer = null) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const eventData = {
        messageId: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType: this.routingKeys.TRANSFER_CREATED,
        source: 'transaction-service',
        version: '1.0.0',
        data: {
          transferId: transferData.idempotencyKey || transferData.reference,
          amount: parseFloat(transferData.amount),
          currency: fromAccount?.currency || 'INR',
          description: transferData.description,
          createdAt: new Date().toISOString(),
          fromAccount: {
            accountId: transferData.from_account_id,
            accountNumber: fromAccount?.account_number,
            accountType: fromAccount?.account_type,
            customerId: fromAccount?.customer_id,
            balanceAfter: parseFloat(transferData.fromBalanceAfter || 0),
            customer: fromCustomer ? {
              customerId: fromCustomer.customer_id,
              customerNumber: fromCustomer.customer_number,
              firstName: fromCustomer.first_name,
              lastName: fromCustomer.last_name
            } : null
          },
          toAccount: {
            accountId: transferData.to_account_id,
            accountNumber: toAccount?.account_number,
            accountType: toAccount?.account_type,
            customerId: toAccount?.customer_id,
            balanceAfter: parseFloat(transferData.toBalanceAfter || 0),
            customer: toCustomer ? {
              customerId: toCustomer.customer_id,
              customerNumber: toCustomer.customer_number,
              firstName: toCustomer.first_name,
              lastName: toCustomer.last_name
            } : null
          }
        }
      };

      await this.publishEvent(this.routingKeys.TRANSFER_CREATED, eventData);

      logger.info('Transfer created event published', {
        transferId: transferData.idempotencyKey,
        fromAccountId: transferData.from_account_id,
        toAccountId: transferData.to_account_id,
        amount: transferData.amount,
        messageId: eventData.messageId
      });

    } catch (error) {
      logger.error('Failed to publish transfer created event:', error);
      // Don't throw error to avoid breaking transaction processing
    }
  }

  /**
   * Publish balance updated event
   */
  async publishBalanceUpdated(accountId, oldBalance, newBalance, transactionId, transactionType) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const eventData = {
        messageId: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType: this.routingKeys.BALANCE_UPDATED,
        source: 'transaction-service',
        version: '1.0.0',
        data: {
          accountId: accountId,
          oldBalance: parseFloat(oldBalance),
          newBalance: parseFloat(newBalance),
          balanceChange: parseFloat(newBalance) - parseFloat(oldBalance),
          transactionId: transactionId,
          transactionType: transactionType,
          updatedAt: new Date().toISOString()
        }
      };

      await this.publishEvent(this.routingKeys.BALANCE_UPDATED, eventData);

      logger.info('Balance updated event published', {
        accountId,
        oldBalance,
        newBalance,
        transactionId,
        messageId: eventData.messageId
      });

    } catch (error) {
      logger.error('Failed to publish balance updated event:', error);
      // Don't throw error to avoid breaking transaction processing
    }
  }

  /**
   * Generic method to publish events
   */
  async publishEvent(routingKey, eventData) {
    try {
      const channel = rabbitMQConnection.getChannel();
      
      const messageBuffer = Buffer.from(JSON.stringify(eventData));
      
      const published = channel.publish(
        this.exchangeName,
        routingKey,
        messageBuffer,
        {
          persistent: true, // Make message persistent
          timestamp: Date.now(),
          messageId: eventData.messageId,
          contentType: 'application/json',
          headers: {
            source: eventData.source,
            eventType: eventData.eventType,
            version: eventData.version
          }
        }
      );

      if (!published) {
        throw new Error('Failed to publish message - channel buffer full');
      }

      logger.debug('Event published successfully', {
        exchange: this.exchangeName,
        routingKey,
        messageId: eventData.messageId
      });

    } catch (error) {
      logger.error('Failed to publish event to RabbitMQ:', error);
      throw error;
    }
  }

  /**
   * Publish multiple events in batch
   */
  async publishBatch(events) {
    try {
      const promises = events.map(({ routingKey, eventData }) => 
        this.publishEvent(routingKey, eventData)
      );
      
      await Promise.all(promises);
      
      logger.info('Batch events published successfully', { 
        count: events.length 
      });

    } catch (error) {
      logger.error('Failed to publish batch events:', error);
      throw error;
    }
  }

  /**
   * Get publisher status
   */
  getStatus() {
    return {
      name: 'TransactionPublisher',
      exchangeName: this.exchangeName,
      routingKeys: Object.values(this.routingKeys),
      isInitialized: this.isInitialized,
      isConnected: rabbitMQConnection.isConnectionReady()
    };
  }

  /**
   * Test connectivity by publishing a test event
   */
  async testConnectivity() {
    try {
      const testEvent = {
        messageId: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType: 'transaction.test',
        source: 'transaction-service',
        version: '1.0.0',
        data: {
          test: true,
          timestamp: new Date().toISOString()
        }
      };

      await this.publishEvent('transaction.test', testEvent);
      logger.info('Publisher connectivity test successful');
      return true;
    } catch (error) {
      logger.error('Publisher connectivity test failed:', error);
      return false;
    }
  }
}

// Singleton instance
const transactionPublisher = new TransactionPublisher();

module.exports = transactionPublisher;
#!/usr/bin/env node

const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');

const RABBITMQ_URL = 'amqp://admin:password@localhost:5672';

class TestEventPublisher {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    try {
      console.log('Connecting to RabbitMQ...');
      this.connection = await amqp.connect(RABBITMQ_URL);
      this.channel = await this.connection.createChannel();
      console.log('✅ Connected to RabbitMQ');
    } catch (error) {
      console.error('❌ Failed to connect to RabbitMQ:', error.message);
      throw error;
    }
  }

  async publishCustomerEvent(eventType, customerData) {
    const exchange = 'customer.events';
    const routingKey = eventType;
    
    // Ensure exchange exists
    await this.channel.assertExchange(exchange, 'topic', { durable: true });

    const message = {
      messageId: uuidv4(),
      timestamp: new Date().toISOString(),
      eventType: eventType,
      data: customerData
    };

    await this.channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        messageId: message.messageId,
        timestamp: Date.now()
      }
    );

    console.log(`📨 Published customer event: ${eventType}`);
    console.log(`📄 Message:`, JSON.stringify(message, null, 2));
  }

  async publishAccountEvent(eventType, accountData) {
    const exchange = 'account.events';
    const routingKey = eventType;
    
    // Ensure exchange exists
    await this.channel.assertExchange(exchange, 'topic', { durable: true });

    const message = {
      messageId: uuidv4(),
      timestamp: new Date().toISOString(),
      eventType: eventType,
      data: accountData
    };

    await this.channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        messageId: message.messageId,
        timestamp: Date.now()
      }
    );

    console.log(`📨 Published account event: ${eventType}`);
    console.log(`📄 Message:`, JSON.stringify(message, null, 2));
  }

  async close() {
    if (this.connection) {
      await this.connection.close();
      console.log('🔐 Connection closed');
    }
  }
}

async function publishTestEvents() {
  const publisher = new TestEventPublisher();
  
  try {
    await publisher.connect();

    // Publish a new customer event
    console.log('\n🎯 Publishing Customer Created Event...');
    await publisher.publishCustomerEvent('customer.created', {
      customerId: 100,
      customerNumber: 'CUST100',
      firstName: 'Test',
      lastName: 'Customer',
      email: 'test.customer@example.com',
      phone: '+91-9876543210',
      status: 'ACTIVE'
    });

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Publish a new account event
    console.log('\n🎯 Publishing Account Created Event...');
    await publisher.publishAccountEvent('account.created', {
      accountId: 100,
      customerId: 100,
      accountNumber: 'ACC100123456',
      accountType: 'SAVINGS',
      currentBalance: 50000.00,
      currency: 'INR',
      status: 'ACTIVE'
    });

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Publish an account update event
    console.log('\n🎯 Publishing Account Updated Event...');
    await publisher.publishAccountEvent('account.updated', {
      accountId: 1,
      customerId: 1,
      accountNumber: '688833778006',
      accountType: 'SALARY',
      currentBalance: 600000.00, // Updated balance
      currency: 'INR',
      status: 'ACTIVE'
    });

    console.log('\n✅ All test events published successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Check RabbitMQ Management UI for queues and messages');
    console.log('2. Check transaction service logs for consumption');
    console.log('3. Make API calls to test transaction events');

  } catch (error) {
    console.error('❌ Error publishing events:', error);
  } finally {
    await publisher.close();
  }
}

// Run if called directly
if (require.main === module) {
  publishTestEvents();
}

module.exports = { TestEventPublisher, publishTestEvents };
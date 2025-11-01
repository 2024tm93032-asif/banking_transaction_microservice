const db = require('./connection');
const { generateReference } = require('../utils/referenceGenerator');

/**
 * Seed data for development and testing
 */
const seedData = {
  // Customer projections (denormalized from customer service)
  customerProjections: [
    {
      customer_id: 1,
      customer_number: 'CUST001',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@email.com',
      phone: '+91-9876543210',
      status: 'ACTIVE'
    },
    {
      customer_id: 2,
      customer_number: 'CUST002',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@email.com',
      phone: '+91-9876543211',
      status: 'ACTIVE'
    },
    {
      customer_id: 8,
      customer_number: 'CUST008',
      first_name: 'Michael',
      last_name: 'Johnson',
      email: 'michael.johnson@email.com',
      phone: '+91-9876543218',
      status: 'ACTIVE'
    },
    {
      customer_id: 9,
      customer_number: 'CUST009',
      first_name: 'Sarah',
      last_name: 'Wilson',
      email: 'sarah.wilson@email.com',
      phone: '+91-9876543219',
      status: 'ACTIVE'
    },
    {
      customer_id: 25,
      customer_number: 'CUST025',
      first_name: 'David',
      last_name: 'Brown',
      email: 'david.brown@email.com',
      phone: '+91-9876543225',
      status: 'ACTIVE'
    },
    {
      customer_id: 28,
      customer_number: 'CUST028',
      first_name: 'Emily',
      last_name: 'Davis',
      email: 'emily.davis@email.com',
      phone: '+91-9876543228',
      status: 'ACTIVE'
    },
    {
      customer_id: 35,
      customer_number: 'CUST035',
      first_name: 'Robert',
      last_name: 'Miller',
      email: 'robert.miller@email.com',
      phone: '+91-9876543235',
      status: 'ACTIVE'
    }
  ],

  // Account projections (denormalized from account service)
  accountProjections: [
    {
      account_id: 1,
      customer_id: 1,
      account_number: '688833778006',
      account_type: 'SALARY',
      current_balance: 498715.54,
      currency: 'INR',
      status: 'ACTIVE'
    },
    {
      account_id: 2,
      customer_id: 1,
      account_number: '711203034246',
      account_type: 'CURRENT',
      current_balance: 85821.84,
      currency: 'INR',
      status: 'FROZEN'
    },
    {
      account_id: 3,
      customer_id: 2,
      account_number: '526468425099',
      account_type: 'SALARY',
      current_balance: 319830.41,
      currency: 'INR',
      status: 'ACTIVE'
    },
    {
      account_id: 16,
      customer_id: 8,
      account_number: '123456789016',
      account_type: 'SAVINGS',
      current_balance: 250000.00,
      currency: 'INR',
      status: 'ACTIVE'
    },
    {
      account_id: 17,
      customer_id: 9,
      account_number: '123456789017',
      account_type: 'CURRENT',
      current_balance: 150000.00,
      currency: 'INR',
      status: 'ACTIVE'
    },
    {
      account_id: 46,
      customer_id: 25,
      account_number: '123456789046',
      account_type: 'SALARY',
      current_balance: 75000.00,
      currency: 'INR',
      status: 'ACTIVE'
    },
    {
      account_id: 51,
      customer_id: 28,
      account_number: '123456789051',
      account_type: 'SAVINGS',
      current_balance: 300000.00,
      currency: 'INR',
      status: 'ACTIVE'
    },
    {
      account_id: 63,
      customer_id: 35,
      account_number: '123456789063',
      account_type: 'SALARY',
      current_balance: 450000.00,
      currency: 'INR',
      status: 'ACTIVE'
    }
  ],

  // Sample transactions based on provided data
  transactions: [
    {
      account_id: 16,
      amount: 100.0,
      txn_type: 'TRANSFER_OUT',
      counterparty: 'IMPS:External',
      reference: 'REF20250827-GXPBWH',
      description: 'Transfer to external account',
      created_at: '2025-04-27 15:38:22'
    },
    {
      account_id: 17,
      amount: 110.4,
      txn_type: 'WITHDRAWAL',
      counterparty: 'IMPS:External',
      reference: 'REF20250827-HKZ2U2',
      description: 'ATM withdrawal',
      created_at: '2025-01-04 06:48:25'
    },
    {
      account_id: 46,
      amount: 100.0,
      txn_type: 'WITHDRAWAL',
      counterparty: 'UPI:paytm',
      reference: 'REF20250827-QJ5SXV',
      description: 'UPI payment to Paytm',
      created_at: '2025-06-05 14:17:31'
    },
    {
      account_id: 63,
      amount: 292.9,
      txn_type: 'TRANSFER_IN',
      counterparty: 'Salary:ACME Corp',
      reference: 'REF20250827-MQGY27',
      description: 'Monthly salary credit',
      created_at: '2025-04-23 03:05:08'
    },
    {
      account_id: 2,
      amount: 100.0,
      txn_type: 'TRANSFER_OUT',
      counterparty: 'Salary:ACME Corp',
      reference: 'REF20250827-EKGYSP',
      description: 'Transfer to savings account',
      created_at: '2022-10-10 20:55:40'
    },
    {
      account_id: 51,
      amount: 100.0,
      txn_type: 'WITHDRAWAL',
      counterparty: 'UPI:paytm',
      reference: 'REF20250827-RT77GG',
      description: 'UPI payment to Paytm',
      created_at: '2023-08-15 05:06:28'
    },
    // Additional sample transactions for testing
    {
      account_id: 1,
      amount: 5000.0,
      txn_type: 'DEPOSIT',
      counterparty: 'Bank:Cash Deposit',
      reference: generateReference(),
      description: 'Cash deposit at branch',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    },
    {
      account_id: 3,
      amount: 25000.0,
      txn_type: 'TRANSFER_IN',
      counterparty: 'Salary:Tech Corp',
      reference: generateReference(),
      description: 'Monthly salary',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    },
    {
      account_id: 1,
      amount: 1500.0,
      txn_type: 'WITHDRAWAL',
      counterparty: 'ATM:123456',
      reference: generateReference(),
      description: 'ATM withdrawal',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    },
    {
      account_id: 3,
      amount: 2000.0,
      txn_type: 'TRANSFER_OUT',
      counterparty: 'UPI:phonepe',
      reference: generateReference(),
      description: 'UPI payment',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
    }
  ]
};

/**
 * Clear all data from tables
 */
async function clearData() {
  console.log('Clearing existing data...');
  
  // Clear in reverse order due to foreign key constraints
  await db.query('DELETE FROM idempotency_keys');
  await db.query('DELETE FROM transactions');
  await db.query('DELETE FROM account_projections');
  await db.query('DELETE FROM customer_projections');
  
  // Reset sequences
  await db.query('ALTER SEQUENCE transactions_txn_id_seq RESTART WITH 1');
  await db.query('ALTER SEQUENCE idempotency_keys_id_seq RESTART WITH 1');
  
  console.log('Existing data cleared');
}

/**
 * Seed customer projections
 */
async function seedCustomerProjections() {
  console.log('Seeding customer projections...');
  
  for (const customer of seedData.customerProjections) {
    await db.query(`
      INSERT INTO customer_projections 
      (customer_id, customer_number, first_name, last_name, email, phone, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      customer.customer_id,
      customer.customer_number,
      customer.first_name,
      customer.last_name,
      customer.email,
      customer.phone,
      customer.status
    ]);
  }
  
  console.log(`Seeded ${seedData.customerProjections.length} customer projections`);
}

/**
 * Seed account projections
 */
async function seedAccountProjections() {
  console.log('Seeding account projections...');
  
  for (const account of seedData.accountProjections) {
    await db.query(`
      INSERT INTO account_projections 
      (account_id, customer_id, account_number, account_type, current_balance, currency, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      account.account_id,
      account.customer_id,
      account.account_number,
      account.account_type,
      account.current_balance,
      account.currency,
      account.status
    ]);
  }
  
  console.log(`Seeded ${seedData.accountProjections.length} account projections`);
}

/**
 * Seed transactions (without triggering balance updates)
 */
async function seedTransactions() {
  console.log('Seeding transactions...');
  
  // Temporarily disable the trigger to seed historical data
  await db.query('ALTER TABLE transactions DISABLE TRIGGER trigger_update_balance');
  
  try {
    for (const txn of seedData.transactions) {
      await db.query(`
        INSERT INTO transactions 
        (account_id, amount, txn_type, counterparty, reference, description, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        txn.account_id,
        txn.amount,
        txn.txn_type,
        txn.counterparty,
        txn.reference,
        txn.description,
        txn.created_at
      ]);
    }
    
    console.log(`Seeded ${seedData.transactions.length} transactions`);
  } finally {
    // Re-enable the trigger
    await db.query('ALTER TABLE transactions ENABLE TRIGGER trigger_update_balance');
  }
}

/**
 * Create sample idempotency keys for testing
 */
async function seedIdempotencyKeys() {
  console.log('Seeding sample idempotency keys...');
  
  const sampleKeys = [
    {
      key: 'test-transfer-001',
      request_body: JSON.stringify({
        from_account_id: 1,
        to_account_id: 3,
        amount: 1000,
        description: 'Test transfer'
      }),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    },
    {
      key: 'test-transfer-002',
      request_body: JSON.stringify({
        from_account_id: 16,
        to_account_id: 17,
        amount: 500,
        description: 'Test transfer 2'
      }),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    }
  ];
  
  for (const key of sampleKeys) {
    await db.query(`
      INSERT INTO idempotency_keys (key, request_body, expires_at)
      VALUES ($1, $2, $3)
    `, [key.key, key.request_body, key.expires_at]);
  }
  
  console.log(`Seeded ${sampleKeys.length} idempotency keys`);
}

/**
 * Main seed function
 */
async function seed() {
  try {
    console.log('Starting database seeding...');
    
    await clearData();
    await seedCustomerProjections();
    await seedAccountProjections();
    await seedTransactions();
    await seedIdempotencyKeys();
    
    console.log('Database seeding completed successfully!');
    
    // Show summary
    const customerCount = await db.query('SELECT COUNT(*) FROM customer_projections');
    const accountCount = await db.query('SELECT COUNT(*) FROM account_projections');
    const transactionCount = await db.query('SELECT COUNT(*) FROM transactions');
    const keyCount = await db.query('SELECT COUNT(*) FROM idempotency_keys');
    
    console.log('\nSeeding Summary:');
    console.log(`- Customer Projections: ${customerCount.rows[0].count}`);
    console.log(`- Account Projections: ${accountCount.rows[0].count}`);
    console.log(`- Transactions: ${transactionCount.rows[0].count}`);
    console.log(`- Idempotency Keys: ${keyCount.rows[0].count}`);
    
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}

module.exports = { seed, clearData };
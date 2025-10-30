const request = require('supertest');
const app = require('../../src/server');

describe('Transaction API', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.service).toBe('transaction-service');
    });
  });

  describe('POST /api/v1/transactions/deposit', () => {
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/transactions/deposit')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate amount is positive', async () => {
      const response = await request(app)
        .post('/api/v1/transactions/deposit')
        .send({
          account_id: 1,
          amount: -100,
          description: 'Test deposit'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/transactions/transfer', () => {
    it('should validate transfer data', async () => {
      const response = await request(app)
        .post('/api/v1/transactions/transfer')
        .send({
          from_account_id: 1,
          to_account_id: 1, // Same account
          amount: 100
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});

describe('Transaction Models', () => {
  const Transaction = require('../../src/models/Transaction');
  
  describe('Transaction validation', () => {
    it('should validate correct transaction data', () => {
      const transaction = new Transaction({
        account_id: 1,
        amount: 100.50,
        txn_type: 'DEPOSIT',
        reference: 'REF20250101-ABC123'
      });

      const validation = transaction.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid transaction type', () => {
      const transaction = new Transaction({
        account_id: 1,
        amount: 100.50,
        txn_type: 'INVALID_TYPE',
        reference: 'REF20250101-ABC123'
      });

      const validation = transaction.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Valid transaction type is required');
    });

    it('should reject invalid reference format', () => {
      const transaction = new Transaction({
        account_id: 1,
        amount: 100.50,
        txn_type: 'DEPOSIT',
        reference: 'INVALID_REF'
      });

      const validation = transaction.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Reference must follow pattern REF[YYYYMMDD]-[6CHARS]');
    });
  });
});
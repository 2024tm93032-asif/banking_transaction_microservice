const db = require('../database/connection');
const { logger } = require('../utils/logger');

class CustomerProjectionRepository {
  /**
   * Create a new customer projection
   */
  async create(customerData) {
    try {
      const {
        customer_id,
        customer_number,
        first_name,
        last_name,
        email,
        phone,
        status = 'ACTIVE'
      } = customerData;

      const query = `
        INSERT INTO customer_projections 
        (customer_id, customer_number, first_name, last_name, email, phone, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [customer_id, customer_number, first_name, last_name, email, phone, status];
      const result = await db.query(query, values);

      logger.info('Customer projection created', { 
        customerId: customer_id,
        customerNumber: customer_number 
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating customer projection:', error);
      throw error;
    }
  }

  /**
   * Update customer projection
   */
  async update(customerId, updates) {
    try {
      // Add last_updated timestamp
      updates.last_updated = new Date();

      const setClause = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');

      const query = `
        UPDATE customer_projections 
        SET ${setClause}
        WHERE customer_id = $1
        RETURNING *
      `;

      const values = [customerId, ...Object.values(updates)];
      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Customer projection not found: ${customerId}`);
      }

      logger.info('Customer projection updated', { 
        customerId,
        updatedFields: Object.keys(updates)
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating customer projection:', error);
      throw error;
    }
  }

  /**
   * Find customer projection by ID
   */
  async findById(customerId) {
    try {
      const query = `
        SELECT * FROM customer_projections 
        WHERE customer_id = $1
      `;

      const result = await db.query(query, [customerId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding customer projection by ID:', error);
      throw error;
    }
  }

  /**
   * Find customer projection by customer number
   */
  async findByCustomerNumber(customerNumber) {
    try {
      const query = `
        SELECT * FROM customer_projections 
        WHERE customer_number = $1
      `;

      const result = await db.query(query, [customerNumber]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding customer projection by customer number:', error);
      throw error;
    }
  }

  /**
   * Find customer projection by email
   */
  async findByEmail(email) {
    try {
      const query = `
        SELECT * FROM customer_projections 
        WHERE email = $1
      `;

      const result = await db.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding customer projection by email:', error);
      throw error;
    }
  }

  /**
   * Check if customer exists
   */
  async exists(customerId) {
    try {
      const query = `
        SELECT 1 FROM customer_projections 
        WHERE customer_id = $1
        LIMIT 1
      `;

      const result = await db.query(query, [customerId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking customer existence:', error);
      throw error;
    }
  }

  /**
   * Delete customer projection
   */
  async delete(customerId) {
    try {
      const query = `
        DELETE FROM customer_projections 
        WHERE customer_id = $1
        RETURNING *
      `;

      const result = await db.query(query, [customerId]);

      if (result.rows.length === 0) {
        throw new Error(`Customer projection not found: ${customerId}`);
      }

      logger.info('Customer projection deleted', { customerId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting customer projection:', error);
      throw error;
    }
  }

  /**
   * Get all customer projections (with pagination)
   */
  async findAll(options = {}) {
    try {
      const { limit = 100, offset = 0, status } = options;
      
      let query = `
        SELECT * FROM customer_projections
      `;
      
      const conditions = [];
      const values = [];

      if (status) {
        conditions.push(`status = $${values.length + 1}`);
        values.push(status);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` ORDER BY customer_id LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
      values.push(limit, offset);

      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Error finding all customer projections:', error);
      throw error;
    }
  }

  /**
   * Get customer count
   */
  async getCount(status = null) {
    try {
      let query = `SELECT COUNT(*) FROM customer_projections`;
      const values = [];

      if (status) {
        query += ` WHERE status = $1`;
        values.push(status);
      }

      const result = await db.query(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting customer count:', error);
      throw error;
    }
  }

  /**
   * Update customer status
   */
  async updateStatus(customerId, newStatus) {
    try {
      return await this.update(customerId, { status: newStatus });
    } catch (error) {
      logger.error('Error updating customer status:', error);
      throw error;
    }
  }
}

module.exports = CustomerProjectionRepository;
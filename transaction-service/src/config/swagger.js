const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Transaction Service API',
    version: '1.0.0',
    description: 'Banking Transaction Microservice - Handles deposits, withdrawals, transfers and transaction statements',
    contact: {
      name: 'Banking Team',
      email: 'banking-team@example.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3003',
      description: 'Development server'
    },
    {
      url: 'https://api.bank.example.com',
      description: 'Production server'
    }
  ],
  components: {
    schemas: {
      Transaction: {
        type: 'object',
        properties: {
          txn_id: {
            type: 'integer',
            description: 'Unique transaction identifier'
          },
          account_id: {
            type: 'integer',
            description: 'Account identifier'
          },
          amount: {
            type: 'number',
            description: 'Transaction amount'
          },
          txn_type: {
            type: 'string',
            enum: ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT'],
            description: 'Transaction type'
          },
          counterparty: {
            type: 'string',
            description: 'Transaction counterparty'
          },
          reference: {
            type: 'string',
            description: 'Unique transaction reference'
          },
          description: {
            type: 'string',
            description: 'Transaction description'
          },
          balance_after: {
            type: 'number',
            description: 'Account balance after transaction'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Transaction creation timestamp'
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'Transaction update timestamp'
          }
        }
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Indicates if the request was successful'
          },
          message: {
            type: 'string',
            description: 'Response message'
          },
          data: {
            type: 'object',
            description: 'Response data'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Response timestamp'
          },
          statusCode: {
            type: 'integer',
            description: 'HTTP status code'
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            description: 'Error message'
          },
          errors: {
            type: 'array',
            items: {
              type: 'object'
            },
            description: 'Detailed error information'
          },
          timestamp: {
            type: 'string',
            format: 'date-time'
          },
          statusCode: {
            type: 'integer'
          }
        }
      },
      TransferRequest: {
        type: 'object',
        required: ['from_account_id', 'to_account_id', 'amount'],
        properties: {
          from_account_id: {
            type: 'integer',
            description: 'Source account ID'
          },
          to_account_id: {
            type: 'integer',
            description: 'Destination account ID'
          },
          amount: {
            type: 'number',
            minimum: 0.01,
            maximum: 1000000,
            description: 'Transfer amount'
          },
          description: {
            type: 'string',
            maxLength: 255,
            description: 'Transfer description'
          },
          idempotency_key: {
            type: 'string',
            maxLength: 255,
            description: 'Idempotency key to prevent duplicate transfers'
          }
        }
      },
      DepositRequest: {
        type: 'object',
        required: ['account_id', 'amount'],
        properties: {
          account_id: {
            type: 'integer',
            description: 'Account ID to deposit to'
          },
          amount: {
            type: 'number',
            minimum: 0.01,
            maximum: 10000000,
            description: 'Deposit amount'
          },
          counterparty: {
            type: 'string',
            maxLength: 255,
            description: 'Source of the deposit'
          },
          description: {
            type: 'string',
            maxLength: 255,
            description: 'Deposit description'
          }
        }
      },
      WithdrawalRequest: {
        type: 'object',
        required: ['account_id', 'amount'],
        properties: {
          account_id: {
            type: 'integer',
            description: 'Account ID to withdraw from'
          },
          amount: {
            type: 'number',
            minimum: 0.01,
            maximum: 10000000,
            description: 'Withdrawal amount'
          },
          counterparty: {
            type: 'string',
            maxLength: 255,
            description: 'Destination of the withdrawal'
          },
          description: {
            type: 'string',
            maxLength: 255,
            description: 'Withdrawal description'
          }
        }
      }
    },
    responses: {
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      Conflict: {
        description: 'Conflict',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Transactions',
      description: 'Transaction operations'
    },
    {
      name: 'Health',
      description: 'Health check operations'
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.js'], // Path to the API files
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
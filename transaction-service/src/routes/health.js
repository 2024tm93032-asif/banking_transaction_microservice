const express = require('express');
const transactionController = require('../controllers/TransactionController');

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     service:
 *                       type: string
 *                     version:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                     database:
 *                       type: object
 *                     uptime:
 *                       type: number
 *       503:
 *         description: Service is unhealthy
 */
router.get('/', transactionController.healthCheck);

module.exports = router;
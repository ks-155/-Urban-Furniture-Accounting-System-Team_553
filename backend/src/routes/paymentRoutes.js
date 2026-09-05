const express = require('express');
const router = express.Router();
const { getPayments, getPaymentById } = require('../controllers/paymentController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/', getPayments);
router.get('/:id', getPaymentById);

module.exports = router;

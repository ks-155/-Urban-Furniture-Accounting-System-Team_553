const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

router.use(authenticateToken);

// Read Sales Orders: Staff sees all, Customer sees own SOs
router.get('/', salesController.getSalesOrders);
router.get('/:id', salesController.getSalesOrderById);

// Staff only operations
router.post('/', authorizeRoles('ADMIN', 'ACCOUNTANT'), salesController.createSalesOrder);
router.post('/:id/confirm', authorizeRoles('ADMIN', 'ACCOUNTANT'), salesController.confirmSalesOrder);
router.post('/:id/create-invoice', authorizeRoles('ADMIN', 'ACCOUNTANT'), salesController.createInvoiceFromSO);

module.exports = router;

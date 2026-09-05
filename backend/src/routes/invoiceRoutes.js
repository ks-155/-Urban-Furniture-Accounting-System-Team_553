const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

router.use(authenticateToken);

// Read Invoices: Staff sees all, Customer sees own invoices
router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoiceById);

// Staff operations
router.post('/', authorizeRoles('ADMIN', 'ACCOUNTANT'), invoiceController.createInvoice);
router.post('/:id/confirm', authorizeRoles('ADMIN', 'ACCOUNTANT'), invoiceController.confirmInvoice);

// Payment: Both Staff and Customer (paying dues online) can access; Controller verifies ownership for USER role
router.post('/:id/pay', invoiceController.payInvoice);

module.exports = router;

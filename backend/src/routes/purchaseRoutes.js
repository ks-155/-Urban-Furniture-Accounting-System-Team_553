const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

router.use(authenticateToken);

// Read POs: Staff sees all, Vendor sees own POs
router.get('/', purchaseController.getPurchaseOrders);
router.get('/:id', purchaseController.getPurchaseOrderById);

// Staff only operations
router.post('/', authorizeRoles('ADMIN', 'ACCOUNTANT'), purchaseController.createPurchaseOrder);
router.post('/:id/confirm', authorizeRoles('ADMIN', 'ACCOUNTANT'), purchaseController.confirmPurchaseOrder);
router.post('/:id/create-bill', authorizeRoles('ADMIN', 'ACCOUNTANT'), purchaseController.createBillFromPO);

// Vendor Portal: Vendor submits bill against approved PO
router.post('/:id/vendor-submit-bill', purchaseController.vendorSubmitBill);

module.exports = router;

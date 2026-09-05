const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Purchase routes require Staff role (Admin or Accountant)
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN', 'ACCOUNTANT'));

router.get('/', purchaseController.getPurchaseOrders);
router.get('/:id', purchaseController.getPurchaseOrderById);
router.post('/', purchaseController.createPurchaseOrder);
router.post('/:id/confirm', purchaseController.confirmPurchaseOrder);
router.post('/:id/create-bill', purchaseController.createBillFromPO);

module.exports = router;

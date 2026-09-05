const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

router.use(authenticateToken);

// Read Bills: Staff sees all, Vendor sees own bills
router.get('/', billController.getBills);
router.get('/:id', billController.getBillById);

// Staff only operations: Direct creation, Posting/Confirming, and Paying
router.post('/', authorizeRoles('ADMIN', 'ACCOUNTANT'), billController.createBill);
router.post('/:id/confirm', authorizeRoles('ADMIN', 'ACCOUNTANT'), billController.confirmBill);
router.post('/:id/pay', authorizeRoles('ADMIN', 'ACCOUNTANT'), billController.payBill);

module.exports = router;

const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Vendor bill routes require Staff role (Admin or Accountant)
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN', 'ACCOUNTANT'));

router.get('/', billController.getBills);
router.get('/:id', billController.getBillById);
router.post('/', billController.createBill);
router.post('/:id/confirm', billController.confirmBill);
router.post('/:id/pay', billController.payBill);

module.exports = router;

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

router.use(authenticateToken);
router.use(authorizeRoles('ADMIN', 'ACCOUNTANT'));

router.get('/balance-sheet', reportController.getBalanceSheet);
router.get('/profit-loss', reportController.getProfitLoss);
router.get('/budget', reportController.getBudgetReport);
router.get('/budget-report', reportController.getBudgetReport);

module.exports = router;

const express = require('express');
const router = express.Router();
const analyticController = require('../controllers/analyticController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

router.use(authenticateToken);
router.use(authorizeRoles('ADMIN', 'ACCOUNTANT'));

router.get('/', analyticController.getAnalyticAccounts);
router.post('/', analyticController.createAnalyticAccount);

module.exports = router;

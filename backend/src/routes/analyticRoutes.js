const express = require('express');
const router = express.Router();
const analyticController = require('../controllers/analyticController');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', analyticController.getAnalyticAccounts);
router.post('/', authenticateToken, analyticController.createAnalyticAccount);

module.exports = router;

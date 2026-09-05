const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', accountController.getAccounts);
router.post('/', authenticateToken, accountController.createAccount);

module.exports = router;

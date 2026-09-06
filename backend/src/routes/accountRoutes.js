const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

router.use(authenticateToken);
router.use(authorizeRoles('ADMIN', 'ACCOUNTANT'));

router.get('/', accountController.getAccounts);
router.post('/', accountController.createAccount);

module.exports = router;

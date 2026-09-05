const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;

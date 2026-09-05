const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// List users (Admin or Accountant)
router.get('/', authenticateToken, authorizeRoles('ADMIN', 'ACCOUNTANT'), userController.listUsers);

// Create user (Admin only)
router.post('/', authenticateToken, authorizeRoles('ADMIN'), userController.createUser);

module.exports = router;

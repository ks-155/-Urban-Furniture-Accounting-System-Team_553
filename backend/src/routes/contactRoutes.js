const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', contactController.getContacts);
router.get('/:id', contactController.getContactById);
router.post('/', authenticateToken, contactController.createContact);
router.put('/:id', authenticateToken, contactController.updateContact);

module.exports = router;

const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/', contactController.getContacts);
router.get('/:id', contactController.getContactById);
router.post('/', authorizeRoles('ADMIN', 'ACCOUNTANT'), contactController.createContact);
router.put('/:id', contactController.updateContact);

module.exports = router;

const express = require('express');
const router = express.Router();
const journalController = require('../controllers/journalController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

router.use(authenticateToken);
router.use(authorizeRoles('ADMIN', 'ACCOUNTANT'));

router.get('/', journalController.getJournals);
router.post('/', journalController.createJournal);

module.exports = router;

const express = require('express');
const router = express.Router();
const journalEntryController = require('../controllers/journalEntryController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

router.use(authenticateToken);
router.use(authorizeRoles('ADMIN', 'ACCOUNTANT'));

router.get('/', journalEntryController.getJournalEntries);
router.post('/', journalEntryController.createManualEntry);

module.exports = router;

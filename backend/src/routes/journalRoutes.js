const express = require('express');
const router = express.Router();
const journalController = require('../controllers/journalController');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', journalController.getJournals);
router.post('/', authenticateToken, journalController.createJournal);

module.exports = router;

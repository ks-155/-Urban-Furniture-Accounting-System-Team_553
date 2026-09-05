const prisma = require('../prisma');

// GET /api/journals
async function getJournals(req, res) {
  try {
    const journals = await prisma.journal.findMany({
      include: {
        defaultAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    return res.status(200).json({ journals });
  } catch (error) {
    console.error('getJournals error:', error);
    return res.status(500).json({ error: 'Failed to fetch journals.' });
  }
}

// POST /api/journals
async function createJournal(req, res) {
  try {
    const { name, code, type, defaultAccountId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Journal name is required.' });
    }

    const jCode = (code || '').trim().toUpperCase();
    if (!jCode) {
      return res.status(400).json({ error: 'Journal code is required.' });
    }

    const jType = (type || '').toUpperCase();
    const validTypes = ['SALES', 'PURCHASE', 'BANK', 'CASH'];
    if (!validTypes.includes(jType)) {
      return res.status(400).json({ error: 'Journal type must be SALES, PURCHASE, BANK, or CASH.' });
    }

    const defAccId = parseInt(defaultAccountId, 10);
    if (isNaN(defAccId)) {
      return res.status(400).json({ error: 'Valid defaultAccountId is required.' });
    }

    const accountExists = await prisma.account.findUnique({
      where: { id: defAccId },
    });
    if (!accountExists) {
      return res.status(404).json({ error: 'Default account not found in Chart of Accounts.' });
    }

    const existingCode = await prisma.journal.findUnique({
      where: { code: jCode },
    });
    if (existingCode) {
      return res.status(400).json({ error: `Journal code ${jCode} already exists.` });
    }

    const journal = await prisma.journal.create({
      data: {
        name: name.trim(),
        code: jCode,
        type: jType,
        defaultAccountId: defAccId,
      },
      include: {
        defaultAccount: true,
      },
    });

    return res.status(201).json({
      message: 'Journal created successfully',
      journal,
    });
  } catch (error) {
    console.error('createJournal error:', error);
    return res.status(500).json({ error: 'Failed to create journal.' });
  }
}

module.exports = {
  getJournals,
  createJournal,
};

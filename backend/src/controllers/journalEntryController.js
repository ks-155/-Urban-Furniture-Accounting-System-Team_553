const prisma = require('../prisma');

// GET /api/journal-entries
async function getJournalEntries(req, res) {
  try {
    const { journalId, status } = req.query;
    const where = {};

    if (journalId) where.journalId = parseInt(journalId, 10);
    if (status) where.status = status.toUpperCase();

    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        journal: { select: { id: true, name: true, code: true, type: true } },
        items: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true } },
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    const formatted = entries.map((entry) => {
      const totalDebit = entry.items.reduce((s, it) => s + parseFloat(it.debit || 0), 0);
      const totalCredit = entry.items.reduce((s, it) => s + parseFloat(it.credit || 0), 0);

      return {
        id: entry.id,
        entryNumber: entry.entryNumber,
        date: entry.date,
        reference: entry.reference,
        journal: entry.journal,
        status: entry.status,
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
        items: entry.items,
      };
    });

    return res.status(200).json({ journalEntries: formatted });
  } catch (error) {
    console.error('getJournalEntries error:', error);
    return res.status(500).json({ error: 'Failed to fetch journal entries.' });
  }
}

// POST /api/journal-entries (Manual entry with strict balance check)
async function createManualEntry(req, res) {
  try {
    const { date, journalId, reference, lines } = req.body;

    if (!journalId) return res.status(400).json({ error: 'Journal is required.' });
    if (!Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({ error: 'At least two line items (debit and credit) are required.' });
    }

    const journal = await prisma.journal.findUnique({ where: { id: parseInt(journalId, 10) } });
    if (!journal) return res.status(404).json({ error: 'Journal not found.' });

    let totalDebit = 0;
    let totalCredit = 0;
    const itemsData = [];

    for (const l of lines) {
      const accId = parseInt(l.accountId, 10);
      const debit = parseFloat(l.debit || 0);
      const credit = parseFloat(l.credit || 0);

      totalDebit += debit;
      totalCredit += credit;

      itemsData.push({
        accountId: accId,
        partnerId: l.partnerId ? parseInt(l.partnerId, 10) : null,
        analyticAccountId: l.analyticAccountId ? parseInt(l.analyticAccountId, 10) : null,
        debit,
        credit,
        label: l.label || reference || 'Manual Entry',
      });
    }

    // STRICT EXCALIDRAW RULE: Blocking error if debits and credits do not match
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({
        error: `Journal Entry is unbalanced! Total Debit (₹${totalDebit.toFixed(2)}) does not match Total Credit (₹${totalCredit.toFixed(2)}). Every entry must satisfy Double-Entry principle.`,
      });
    }

    const lastJE = await prisma.journalEntry.findFirst({
      orderBy: { id: 'desc' },
      select: { entryNumber: true },
    });
    let nextNum = 1;
    if (lastJE && lastJE.entryNumber) {
      const match = lastJE.entryNumber.match(/\d+$/);
      if (match) nextNum = parseInt(match[0], 10) + 1;
    }
    const entryNumber = `JE${String(nextNum).padStart(4, '0')}`;

    const entry = await prisma.journalEntry.create({
      data: {
        entryNumber,
        date: date ? new Date(date) : new Date(),
        reference: reference || 'Manual Entry',
        journalId: parseInt(journalId, 10),
        status: 'POSTED',
        items: {
          create: itemsData,
        },
      },
      include: {
        items: { include: { account: true } },
      },
    });

    return res.status(201).json({
      message: 'Journal Entry created and posted successfully',
      journalEntry: entry,
    });
  } catch (error) {
    console.error('createManualEntry error:', error);
    return res.status(500).json({ error: 'Failed to create journal entry.' });
  }
}

module.exports = {
  getJournalEntries,
  createManualEntry,
};

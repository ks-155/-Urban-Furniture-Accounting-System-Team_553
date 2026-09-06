const prisma = require('../prisma');

// GET /api/analytic-accounts
async function getAnalyticAccounts(req, res) {
  try {
    const analytics = await prisma.analyticAccount.findMany({
      include: {
        budgets: {
          select: {
            id: true,
            name: true,
            plannedAmount: true,
            committedAmount: true,
            status: true,
            periodStart: true,
            periodEnd: true,
          },
        },
        journalItems: {
          select: {
            id: true,
            debit: true,
            credit: true,
            label: true,
            account: { select: { code: true, name: true } },
            entry: { select: { entryNumber: true, date: true, reference: true } },
          },
          take: 20,
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({ analyticAccounts: analytics });
  } catch (error) {
    console.error('getAnalyticAccounts error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytic accounts.' });
  }
}

// POST /api/analytic-accounts
async function createAnalyticAccount(req, res) {
  try {
    const { name, type } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Analytic account name is required.' });
    }

    const aType = (type || 'EXPENSE').toUpperCase();
    if (!['INCOME', 'EXPENSE'].includes(aType)) {
      return res.status(400).json({ error: 'Type must be INCOME or EXPENSE.' });
    }

    const analytic = await prisma.analyticAccount.create({
      data: {
        name: name.trim(),
        type: aType,
      },
    });

    return res.status(201).json({
      message: 'Analytic account created successfully',
      analyticAccount: analytic,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Analytic account with this name already exists.' });
    }
    console.error('createAnalyticAccount error:', error);
    return res.status(500).json({ error: 'Failed to create analytic account.' });
  }
}

module.exports = {
  getAnalyticAccounts,
  createAnalyticAccount,
};

const prisma = require('../prisma');

// GET /api/accounts
async function getAccounts(req, res) {
  try {
    const { type } = req.query;
    const where = {};

    if (type) {
      where.type = type.toUpperCase();
    }

    const accounts = await prisma.account.findMany({
      where,
      include: {
        journalItems: {
          select: {
            debit: true,
            credit: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    // Calculate live net balance for each account
    const accountsWithBalance = accounts.map((acc) => {
      const totalDebit = acc.journalItems.reduce((sum, item) => sum + parseFloat(item.debit || 0), 0);
      const totalCredit = acc.journalItems.reduce((sum, item) => sum + parseFloat(item.credit || 0), 0);

      // Standard accounting convention:
      // Assets & Expenses increase with Debit
      // Liabilities, Capital & Incomes increase with Credit
      let currentBalance = 0;
      if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
        currentBalance = totalDebit - totalCredit;
      } else {
        currentBalance = totalCredit - totalDebit;
      }

      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        totalDebit,
        totalCredit,
        balance: currentBalance,
        createdAt: acc.createdAt,
      };
    });

    return res.status(200).json({ accounts: accountsWithBalance });
  } catch (error) {
    console.error('getAccounts error:', error);
    return res.status(500).json({ error: 'Failed to fetch Chart of Accounts.' });
  }
}

// POST /api/accounts
async function createAccount(req, res) {
  try {
    const { code, name, type, accountType } = req.body;

    const accCode = (code || '').trim();
    const accName = (name || '').trim();
    const accType = (type || accountType || '').toUpperCase();

    if (!accCode) {
      return res.status(400).json({ error: 'Account code is required (e.g. 1004).' });
    }

    if (!accName) {
      return res.status(400).json({ error: 'Account name is required.' });
    }

    const validTypes = ['ASSET', 'LIABILITY', 'CAPITAL', 'INCOME', 'EXPENSE'];
    if (!validTypes.includes(accType)) {
      return res.status(400).json({ error: 'Account type must be ASSET, LIABILITY, CAPITAL, INCOME, or EXPENSE.' });
    }

    const existing = await prisma.account.findUnique({
      where: { code: accCode },
    });
    if (existing) {
      return res.status(400).json({ error: `Account code ${accCode} already exists.` });
    }

    const account = await prisma.account.create({
      data: {
        code: accCode,
        name: accName,
        type: accType,
      },
    });

    return res.status(201).json({
      message: 'Account created successfully',
      account,
    });
  } catch (error) {
    console.error('createAccount error:', error);
    return res.status(500).json({ error: 'Failed to create account.' });
  }
}

module.exports = {
  getAccounts,
  createAccount,
};

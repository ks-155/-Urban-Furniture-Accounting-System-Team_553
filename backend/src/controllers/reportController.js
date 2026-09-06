const prisma = require('../prisma');

function buildDateFilter(year, startDate, endDate) {
  const filter = { status: 'POSTED' };
  if (year) {
    const yr = parseInt(year, 10);
    if (!isNaN(yr)) {
      filter.date = {
        gte: new Date(`${yr}-01-01T00:00:00.000Z`),
        lte: new Date(`${yr}-12-31T23:59:59.999Z`),
      };
    }
  } else if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.gte = new Date(startDate);
    if (endDate) filter.date.lte = new Date(endDate);
  }
  return filter;
}

// GET /api/reports/balance-sheet
async function getBalanceSheet(req, res) {
  try {
    const entryFilter = buildDateFilter(req.query.year, req.query.startDate, req.query.endDate);
    const accounts = await prisma.account.findMany({
      include: {
        journalItems: {
          where: { entry: entryFilter },
          select: { debit: true, credit: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    const assets = [];
    const liabilities = [];
    const equity = [];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    let currentPeriodProfit = 0;

    accounts.forEach((acc) => {
      const totDebit = acc.journalItems.reduce((s, i) => s + parseFloat(i.debit || 0), 0);
      const totCredit = acc.journalItems.reduce((s, i) => s + parseFloat(i.credit || 0), 0);

      if (acc.type === 'ASSET') {
        const balance = totDebit - totCredit;
        assets.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          balance: parseFloat(balance.toFixed(2)),
        });
        totalAssets += balance;
      } else if (acc.type === 'LIABILITY') {
        const balance = totCredit - totDebit;
        liabilities.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          balance: parseFloat(balance.toFixed(2)),
        });
        totalLiabilities += balance;
      } else if (acc.type === 'CAPITAL') {
        const balance = totCredit - totDebit;
        equity.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          balance: parseFloat(balance.toFixed(2)),
        });
        totalEquity += balance;
      } else if (acc.type === 'INCOME') {
        currentPeriodProfit += (totCredit - totDebit);
      } else if (acc.type === 'EXPENSE') {
        currentPeriodProfit -= (totDebit - totCredit);
      }
    });

    if (Math.abs(currentPeriodProfit) > 0.001) {
      equity.push({
        id: 0,
        code: '3999',
        name: 'Current Period Earnings / Net Profit',
        balance: parseFloat(currentPeriodProfit.toFixed(2)),
      });
      totalEquity += currentPeriodProfit;
    }

    totalAssets = parseFloat(totalAssets.toFixed(2));
    totalLiabilities = parseFloat(totalLiabilities.toFixed(2));
    totalEquity = parseFloat(totalEquity.toFixed(2));

    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

    return res.status(200).json({
      assets,
      totalAssets,
      liabilities,
      totalLiabilities,
      equity,
      totalEquity,
      isBalanced,
    });
  } catch (error) {
    console.error('getBalanceSheet error:', error);
    return res.status(500).json({ error: 'Failed to generate Balance Sheet report.' });
  }
}

// GET /api/reports/profit-loss
async function getProfitLoss(req, res) {
  try {
    const entryFilter = buildDateFilter(req.query.year, req.query.startDate, req.query.endDate);
    const accounts = await prisma.account.findMany({
      include: {
        journalItems: {
          where: { entry: entryFilter },
          select: { debit: true, credit: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    const income = [];
    const expenses = [];

    let totalIncome = 0;
    let totalExpenses = 0;

    accounts.forEach((acc) => {
      const totDebit = acc.journalItems.reduce((s, i) => s + parseFloat(i.debit || 0), 0);
      const totCredit = acc.journalItems.reduce((s, i) => s + parseFloat(i.credit || 0), 0);

      if (acc.type === 'INCOME') {
        const amount = totCredit - totDebit;
        income.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          amount: parseFloat(amount.toFixed(2)),
        });
        totalIncome += amount;
      } else if (acc.type === 'EXPENSE') {
        const amount = totDebit - totCredit;
        expenses.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          amount: parseFloat(amount.toFixed(2)),
        });
        totalExpenses += amount;
      }
    });

    totalIncome = parseFloat(totalIncome.toFixed(2));
    totalExpenses = parseFloat(totalExpenses.toFixed(2));
    const netProfit = parseFloat((totalIncome - totalExpenses).toFixed(2));

    return res.status(200).json({
      income,
      totalIncome,
      expenses,
      totalExpenses,
      netProfit,
    });
  } catch (error) {
    console.error('getProfitLoss error:', error);
    return res.status(500).json({ error: 'Failed to generate Profit & Loss report.' });
  }
}

// GET /api/reports/budget (or budget-report)
async function getBudgetReport(req, res) {
  try {
    const budgets = await prisma.budget.findMany({
      include: {
        analyticAccount: {
          include: {
            journalItems: {
              where: { entry: { status: 'POSTED' } },
              select: { debit: true, credit: true },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const report = budgets.map((b) => {
      const planned = parseFloat(b.plannedAmount || 0);
      const committed = parseFloat(b.committedAmount || 0);

      let achieved = 0;
      if (b.analyticAccount && b.analyticAccount.journalItems) {
        if (b.analyticAccount.type === 'EXPENSE') {
          achieved = b.analyticAccount.journalItems.reduce(
            (s, i) => s + (parseFloat(i.debit || 0) - parseFloat(i.credit || 0)),
            0
          );
        } else {
          achieved = b.analyticAccount.journalItems.reduce(
            (s, i) => s + (parseFloat(i.credit || 0) - parseFloat(i.debit || 0)),
            0
          );
        }
      }

      achieved = parseFloat(Math.max(0, achieved).toFixed(2));

      const denominator = committed > 0 ? committed : (planned > 0 ? planned : 0);
      const achievedPercent = denominator > 0 ? parseFloat(((achieved / denominator) * 100).toFixed(2)) : 0;
      const amountToAchieve = parseFloat(Math.max(0, denominator - achieved).toFixed(2));

      return {
        id: b.id,
        budgetName: b.name,
        analyticAccount: b.analyticAccount ? b.analyticAccount.name : '—',
        planned,
        committed,
        achieved,
        achievedPercent,
        amountToAchieve,
        status: b.status,
      };
    });

    return res.status(200).json(report);
  } catch (error) {
    console.error('getBudgetReport error:', error);
    return res.status(500).json({ error: 'Failed to generate Budget report.' });
  }
}

module.exports = {
  getBalanceSheet,
  getProfitLoss,
  getBudgetReport,
};

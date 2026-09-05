const prisma = require('../prisma');

// GET /api/budgets
async function getBudgets(req, res) {
  try {
    const budgets = await prisma.budget.findMany({
      include: {
        analyticAccount: {
          include: {
            journalItems: {
              select: { debit: true, credit: true },
            },
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    const formatted = budgets.map((b) => {
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
        name: b.name,
        periodStart: b.periodStart ? b.periodStart.toISOString().split('T')[0] : null,
        periodEnd: b.periodEnd ? b.periodEnd.toISOString().split('T')[0] : null,
        responsiblePerson: b.responsiblePerson,
        analyticAccountId: b.analyticAccountId,
        analyticAccount: b.analyticAccount ? b.analyticAccount.name : '—',
        plannedAmount: planned,
        committedAmount: committed,
        achievedAmount: achieved,
        achievedPercent,
        amountToAchieve,
        status: b.status,
        createdAt: b.createdAt,
      };
    });

    return res.status(200).json({ count: formatted.length, budgets: formatted });
  } catch (error) {
    console.error('getBudgets error:', error);
    return res.status(500).json({ error: 'Failed to retrieve budgets.' });
  }
}

// GET /api/budgets/:id
async function getBudgetById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        analyticAccount: true,
      },
    });

    if (!budget) return res.status(404).json({ error: 'Budget not found.' });

    return res.status(200).json({ budget });
  } catch (error) {
    console.error('getBudgetById error:', error);
    return res.status(500).json({ error: 'Failed to retrieve budget.' });
  }
}

// POST /api/budgets
async function createBudget(req, res) {
  try {
    const {
      name,
      periodStart,
      periodEnd,
      responsiblePerson,
      analyticAccountId,
      plannedAmount,
      committedAmount,
    } = req.body;

    if (!name || !periodStart || !periodEnd || !responsiblePerson) {
      return res.status(400).json({
        error: 'name, periodStart, periodEnd, and responsiblePerson are required.',
      });
    }

    let analyticId = parseInt(analyticAccountId, 10);
    if (isNaN(analyticId) || analyticId <= 0) {
      // Find first analytic account or fallback
      const defaultAnalytic = await prisma.analyticAccount.findFirst();
      if (!defaultAnalytic) {
        return res.status(400).json({ error: 'No Analytic Account found. Please create one first.' });
      }
      analyticId = defaultAnalytic.id;
    }

    const planned = parseFloat(plannedAmount || 0);
    const committed = parseFloat(committedAmount || 0);

    const budget = await prisma.budget.create({
      data: {
        name: name.trim(),
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        responsiblePerson: responsiblePerson.trim(),
        analyticAccountId: analyticId,
        plannedAmount: planned,
        committedAmount: committed,
        status: 'DRAFT',
      },
      include: {
        analyticAccount: true,
      },
    });

    return res.status(201).json({
      message: 'Budget created successfully in DRAFT status',
      budget,
    });
  } catch (error) {
    console.error('createBudget error:', error);
    return res.status(500).json({ error: 'Failed to create budget.' });
  }
}

// POST /api/budgets/:id/confirm
async function confirmBudget(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const budget = await prisma.budget.findUnique({ where: { id } });

    if (!budget) return res.status(404).json({ error: 'Budget not found.' });

    if (budget.status === 'CONFIRMED') {
      return res.status(400).json({ error: 'Budget is already confirmed.' });
    }

    const updated = await prisma.budget.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: { analyticAccount: true },
    });

    return res.status(200).json({
      message: 'Budget confirmed successfully',
      budget: updated,
    });
  } catch (error) {
    console.error('confirmBudget error:', error);
    return res.status(500).json({ error: 'Failed to confirm budget.' });
  }
}

// POST /api/budgets/:id/revise
async function reviseBudget(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const orig = await prisma.budget.findUnique({ where: { id } });

    if (!orig) return res.status(404).json({ error: 'Budget not found.' });

    if (orig.status !== 'CONFIRMED') {
      return res.status(400).json({ error: 'Only CONFIRMED budgets can be revised.' });
    }

    // 1. Mark original as REVISED
    const updatedOrig = await prisma.budget.update({
      where: { id },
      data: { status: 'REVISED' },
    });

    // 2. Create new revision budget in DRAFT
    const revisedBudget = await prisma.budget.create({
      data: {
        name: `${orig.name} Revised`,
        periodStart: orig.periodStart,
        periodEnd: orig.periodEnd,
        responsiblePerson: orig.responsiblePerson,
        analyticAccountId: orig.analyticAccountId,
        plannedAmount: orig.plannedAmount,
        committedAmount: orig.committedAmount,
        status: 'DRAFT',
      },
      include: {
        analyticAccount: true,
      },
    });

    return res.status(200).json({
      message: 'Original budget marked as REVISED and new revision created in DRAFT',
      originalBudget: updatedOrig,
      revisedBudget,
    });
  } catch (error) {
    console.error('reviseBudget error:', error);
    return res.status(500).json({ error: 'Failed to revise budget.' });
  }
}

module.exports = {
  getBudgets,
  getBudgetById,
  createBudget,
  confirmBudget,
  reviseBudget,
};

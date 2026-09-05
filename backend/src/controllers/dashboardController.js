const prisma = require('../prisma');

// GET /api/dashboard
async function getDashboardStats(req, res) {
  try {
    // 1. Sales Stats
    const salesOrders = await prisma.salesOrder.findMany({ select: { status: true } });
    const salesAll = salesOrders.length;
    const salesConfirmed = salesOrders.filter((s) => s.status === 'CONFIRMED' || s.status === 'INVOICED').length;
    const salesDraft = salesOrders.filter((s) => s.status === 'DRAFT').length;

    const invoices = await prisma.customerInvoice.findMany({
      select: { status: true, totalAmount: true, paidAmount: true },
    });
    const totalRevenue = invoices
      .filter((i) => i.status === 'PAID')
      .reduce((s, i) => s + parseFloat(i.paidAmount || i.totalAmount || 0), 0);
    const totalReceivables = invoices
      .filter((i) => i.status !== 'PAID')
      .reduce((s, i) => s + (parseFloat(i.totalAmount || 0) - parseFloat(i.paidAmount || 0)), 0);

    // 2. Purchase Stats
    const purchaseOrders = await prisma.purchaseOrder.findMany({ select: { status: true } });
    const purchAll = purchaseOrders.length;
    const purchConfirmed = purchaseOrders.filter((p) => p.status === 'CONFIRMED' || p.status === 'BILLED').length;
    const purchDraft = purchaseOrders.filter((p) => p.status === 'DRAFT').length;

    const bills = await prisma.vendorBill.findMany({
      select: { status: true, totalAmount: true, paidAmount: true },
    });
    const totalExpense = bills
      .filter((b) => b.status === 'PAID')
      .reduce((s, b) => s + parseFloat(b.paidAmount || b.totalAmount || 0), 0);
    const totalPayables = bills
      .filter((b) => b.status !== 'PAID')
      .reduce((s, b) => s + (parseFloat(b.totalAmount || 0) - parseFloat(b.paidAmount || 0)), 0);

    // 3. Budget Stats
    const budgets = await prisma.budget.findMany({
      include: {
        analyticAccount: {
          include: {
            journalItems: { select: { debit: true, credit: true } },
          },
        },
      },
    });

    const budgetCount = budgets.length;
    const committedCount = budgets.filter((b) => parseFloat(b.committedAmount || 0) > 0).length;
    const achievedCount = budgets.filter((b) => {
      if (!b.analyticAccount || !b.analyticAccount.journalItems) return false;
      const act = b.analyticAccount.journalItems.reduce((s, i) => s + parseFloat(i.debit || 0), 0);
      return act > 0;
    }).length;

    const netProfit = parseFloat((totalRevenue - totalExpense).toFixed(2));

    return res.status(200).json({
      sales: {
        all: salesAll,
        confirmed: salesConfirmed,
        draft: salesDraft,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      },
      purchase: {
        all: purchAll,
        confirmed: purchConfirmed,
        draft: purchDraft,
        totalExpense: parseFloat(totalExpense.toFixed(2)),
      },
      budget: {
        achieved: achievedCount,
        budget: budgetCount,
        committed: committedCount,
      },
      financials: {
        netProfit,
        totalReceivables: parseFloat(totalReceivables.toFixed(2)),
        totalPayables: parseFloat(totalPayables.toFixed(2)),
      },
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return res.status(500).json({ error: 'Failed to generate dashboard statistics.' });
  }
}

module.exports = {
  getDashboardStats,
};

const prisma = require('../prisma');

// GET /api/payments (List Payments / Receipts with optional type filter)
async function getPayments(req, res) {
  try {
    const { type, paymentType, search } = req.query;

    const where = {};

    // Filter by INBOUND (Receipts) or OUTBOUND (Vendor Payments)
    const targetType = type || paymentType;
    if (targetType) {
      const upper = targetType.toUpperCase();
      if (upper === 'RECEIPT' || upper === 'RECEIPTS' || upper === 'INBOUND') {
        where.paymentType = 'INBOUND';
      } else if (upper === 'PAYMENT' || upper === 'PAYMENTS' || upper === 'OUTBOUND') {
        where.paymentType = 'OUTBOUND';
      }
    }

    // Role-based security: USER can only see their own receipts/payments
    if (req.user && req.user.role === 'USER') {
      where.partnerId = req.user.contactId;
    }

    if (search) {
      where.OR = [
        { paymentNumber: { contains: search, mode: 'insensitive' } },
        { partner: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        partner: { select: { id: true, name: true, type: true, email: true } },
        invoice: { select: { id: true, invNumber: true, totalAmount: true } },
        bill: { select: { id: true, billNumber: true, totalAmount: true } },
        journal: { select: { id: true, name: true, type: true } },
      },
      orderBy: { id: 'desc' },
    });

    return res.status(200).json({
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error('getPayments error:', error);
    return res.status(500).json({ error: 'Failed to retrieve payments.' });
  }
}

// GET /api/payments/:id
async function getPaymentById(req, res) {
  try {
    const paymentId = parseInt(req.params.id, 10);
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        partner: true,
        invoice: true,
        bill: true,
        journal: true,
      },
    });

    if (!payment) return res.status(404).json({ error: 'Payment not found.' });

    if (req.user && req.user.role === 'USER' && payment.partnerId !== req.user.contactId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    return res.status(200).json({ payment });
  } catch (error) {
    console.error('getPaymentById error:', error);
    return res.status(500).json({ error: 'Failed to retrieve payment details.' });
  }
}

module.exports = {
  getPayments,
  getPaymentById,
};

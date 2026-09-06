const prisma = require('../prisma');

// Helper to generate next sequential JE number: JE0001, JE0002
async function getNextJENumber() {
  const lastJE = await prisma.journalEntry.findFirst({
    orderBy: { id: 'desc' },
    select: { entryNumber: true },
  });
  if (!lastJE || !lastJE.entryNumber) return 'JE0001';
  const match = lastJE.entryNumber.match(/\d+$/);
  if (!match) return 'JE0001';
  const nextNum = parseInt(match[0], 10) + 1;
  return `JE${String(nextNum).padStart(4, '0')}`;
}

// Helper to generate next sequential Payment number: PAY0001, PAY0002
async function getNextPayNumber() {
  const lastPay = await prisma.payment.findFirst({
    orderBy: { id: 'desc' },
    select: { paymentNumber: true },
  });
  if (!lastPay || !lastPay.paymentNumber) return 'PAY0001';
  const match = lastPay.paymentNumber.match(/\d+$/);
  if (!match) return 'PAY0001';
  const nextNum = parseInt(match[0], 10) + 1;
  return `PAY${String(nextNum).padStart(4, '0')}`;
}

// GET /api/bills
async function getBills(req, res) {
  try {
    const { status, vendorId } = req.query;
    const where = {};

    if (status) where.status = status.toUpperCase();
    if (req.user && req.user.role === 'USER') {
      if (!req.user.contactId) {
        return res.status(200).json({ bills: [] });
      }
      where.vendorId = req.user.contactId;
    } else if (vendorId) {
      where.vendorId = parseInt(vendorId, 10);
    }

    const bills = await prisma.vendorBill.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true, email: true, phone: true } },
        purchaseOrder: { select: { id: true, poNumber: true } },
        lines: { include: { product: true } },
        payments: true,
      },
      orderBy: { id: 'desc' },
    });

    return res.status(200).json({ bills });
  } catch (error) {
    console.error('getBills error:', error);
    return res.status(500).json({ error: 'Failed to fetch vendor bills.' });
  }
}

// GET /api/bills/:id
async function getBillById(req, res) {
  try {
    const { id } = req.params;
    const bill = await prisma.vendorBill.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        vendor: true,
        purchaseOrder: true,
        lines: { include: { product: true } },
        payments: { include: { journal: true } },
      },
    });

    if (!bill) {
      return res.status(404).json({ error: 'Vendor bill not found.' });
    }

    // Role-based scoping: portal users can only view their own bills
    if (req.user && (req.user.role === 'USER' || req.user.role === 'CUSTOMER')) {
      if (!req.user.contactId || bill.vendorId !== req.user.contactId) {
        return res.status(403).json({ error: 'Access denied to this vendor bill.' });
      }
    }

    return res.status(200).json({ bill });
  } catch (error) {
    console.error('getBillById error:', error);
    return res.status(500).json({ error: 'Failed to fetch vendor bill.' });
  }
}

// POST /api/bills (Direct Bill creation without PO)
async function createBill(req, res) {
  try {
    const { vendorId, lines, billDate, dueDate } = req.body;

    if (!vendorId) return res.status(400).json({ error: 'Vendor is required.' });

    const vendor = await prisma.contact.findUnique({
      where: { id: parseInt(vendorId, 10) },
    });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'At least one line is required.' });
    }

    let calculatedTotal = 0;
    const billLines = [];

    for (const line of lines) {
      const pId = parseInt(line.productId, 10);
      const qty = parseFloat(line.quantity || 1);
      const price = parseFloat(line.unitPrice || 0);

      const subtotal = qty * price;
      calculatedTotal += subtotal;

      billLines.push({
        productId: pId,
        quantity: qty,
        unitPrice: price,
        subtotal,
      });
    }

    const lastBill = await prisma.vendorBill.findFirst({
      orderBy: { id: 'desc' },
      select: { billNumber: true },
    });
    let nextNum = 1;
    if (lastBill && lastBill.billNumber) {
      const match = lastBill.billNumber.match(/\d+$/);
      if (match) nextNum = parseInt(match[0], 10) + 1;
    }
    const billNumber = `BILL${String(nextNum).padStart(4, '0')}`;

    const bDate = billDate ? new Date(billDate) : new Date();
    const dDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    const bill = await prisma.vendorBill.create({
      data: {
        billNumber,
        vendorId: parseInt(vendorId, 10),
        billDate: bDate,
        dueDate: dDate,
        status: 'DRAFT',
        totalAmount: calculatedTotal,
        paidAmount: 0,
        lines: { create: billLines },
      },
      include: {
        vendor: true,
        lines: { include: { product: true } },
      },
    });

    return res.status(201).json({
      message: 'Vendor bill created successfully',
      bill,
    });
  } catch (error) {
    console.error('createBill error:', error);
    return res.status(500).json({ error: 'Failed to create vendor bill.' });
  }
}

// POST /api/bills/:id/confirm (Confirms Bill & Auto-Generates Double-Entry Journal Entry)
async function confirmBill(req, res) {
  try {
    const { id } = req.params;
    const billId = parseInt(id, 10);

    const bill = await prisma.vendorBill.findUnique({
      where: { id: billId },
      include: { vendor: true },
    });

    if (!bill) return res.status(404).json({ error: 'Vendor bill not found.' });

    if (bill.status !== 'DRAFT' && bill.status !== 'SUBMITTED') {
      return res.status(400).json({ error: `Cannot confirm bill with status ${bill.status}. Only DRAFT or SUBMITTED bills can be confirmed.` });
    }

    // 1. Fetch Accounts for Purchase Journal Entry:
    // Debit: 5001 Purchase Expense
    // Credit: 2001 Creditors / Accounts Payable
    const purchaseExpenseAccount = await prisma.account.findUnique({ where: { code: '5001' } });
    const creditorAccount = await prisma.account.findUnique({ where: { code: '2001' } });
    const purchaseJournal = await prisma.journal.findFirst({ where: { type: 'PURCHASE' } });

    if (!purchaseExpenseAccount || !creditorAccount || !purchaseJournal) {
      return res.status(500).json({
        error: 'Accounting setup incomplete: Accounts 5001/2001 or Purchase Journal missing.',
      });
    }

    const billAmount = parseFloat(bill.totalAmount);
    const entryNumber = await getNextJENumber();

    // 2. Create the balanced double-entry Journal Entry
    const journalEntry = await prisma.journalEntry.create({
      data: {
        entryNumber,
        date: bill.billDate,
        reference: bill.billNumber,
        journalId: purchaseJournal.id,
        status: 'POSTED',
        items: {
          create: [
            {
              accountId: purchaseExpenseAccount.id,
              partnerId: bill.vendorId,
              debit: billAmount,
              credit: 0,
              label: `Purchase - ${bill.vendor.name}`,
            },
            {
              accountId: creditorAccount.id,
              partnerId: bill.vendorId,
              debit: 0,
              credit: billAmount,
              label: `Vendor Payable - ${bill.billNumber}`,
            },
          ],
        },
      },
      include: {
        items: { include: { account: true } },
      },
    });

    // 3. Update Bill status to CONFIRMED and link Journal Entry
    const updatedBill = await prisma.vendorBill.update({
      where: { id: billId },
      data: {
        status: 'CONFIRMED',
        journalEntryId: journalEntry.id,
      },
      include: {
        vendor: true,
        lines: { include: { product: true } },
      },
    });

    return res.status(200).json({
      message: 'Vendor bill confirmed and Journal Entry posted successfully',
      bill: updatedBill,
      journalEntry,
    });
  } catch (error) {
    console.error('confirmBill error:', error);
    return res.status(500).json({ error: 'Failed to confirm vendor bill.' });
  }
}

// POST /api/bills/:id/pay (Register Payment & Auto-Generate Payment Journal Entry)
async function payBill(req, res) {
  try {
    const { id } = req.params;
    const billId = parseInt(id, 10);
    const { amount, paymentMethod, journalId } = req.body;

    const bill = await prisma.vendorBill.findUnique({
      where: { id: billId },
      include: { vendor: true },
    });

    if (!bill) return res.status(404).json({ error: 'Vendor bill not found.' });

    if (bill.status === 'DRAFT') {
      return res.status(400).json({ error: 'Cannot pay a draft bill. Please confirm it first.' });
    }

    if (bill.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot pay a cancelled bill.' });
    }

    if (bill.status === 'PAID') {
      return res.status(400).json({ error: 'This bill is already fully paid.' });
    }

    const remainingDue = parseFloat(bill.totalAmount) - parseFloat(bill.paidAmount);

    if (remainingDue <= 0.005) {
      return res.status(400).json({ error: 'This bill is already fully paid.' });
    }

    const payAmount = amount ? parseFloat(amount) : remainingDue;

    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
    }

    // Strict overpayment prevention
    if (payAmount > remainingDue + 0.005) {
      return res.status(400).json({
        error: `Payment amount (₹${payAmount.toFixed(2)}) exceeds remaining due (₹${remainingDue.toFixed(2)}). Overpayment is not allowed.`,
      });
    }

    // Determine payment method and journal: BANK or CASH
    const method = (paymentMethod || 'BANK').toUpperCase();
    if (!['BANK', 'CASH'].includes(method)) {
      return res.status(400).json({ error: 'Payment method must be BANK or CASH.' });
    }

    let targetJournal;
    if (journalId) {
      targetJournal = await prisma.journal.findUnique({
        where: { id: parseInt(journalId, 10) },
        include: { defaultAccount: true },
      });
    } else {
      targetJournal = await prisma.journal.findFirst({
        where: { type: method === 'CASH' ? 'CASH' : 'BANK' },
        include: { defaultAccount: true },
      });
    }

    if (!targetJournal || !targetJournal.defaultAccount) {
      return res.status(500).json({ error: 'Payment journal or default account not found.' });
    }

    const creditorAccount = await prisma.account.findUnique({ where: { code: '2001' } });
    if (!creditorAccount) {
      return res.status(500).json({ error: 'Creditors account (2001) not found.' });
    }

    const paymentNumber = await getNextPayNumber();
    const entryNumber = await getNextJENumber();

    // 1. Create Payment Record
    const payment = await prisma.payment.create({
      data: {
        paymentNumber,
        paymentType: 'OUTBOUND',
        partnerId: bill.vendorId,
        billId: bill.id,
        amount: payAmount,
        paymentMethod: method === 'CASH' ? 'CASH' : 'BANK',
        journalId: targetJournal.id,
        status: 'POSTED',
      },
    });

    // 2. Create Payment Journal Entry:
    // Debit: 2001 Creditor A/C (clears payable!)
    // Credit: Target Bank / Cash A/C (reduces asset!)
    const paymentJournalEntry = await prisma.journalEntry.create({
      data: {
        entryNumber,
        date: new Date(),
        reference: `Payment ${paymentNumber} for ${bill.billNumber}`,
        journalId: targetJournal.id,
        status: 'POSTED',
        items: {
          create: [
            {
              accountId: creditorAccount.id,
              partnerId: bill.vendorId,
              debit: payAmount,
              credit: 0,
              label: `Payment to ${bill.vendor.name} - ${bill.billNumber}`,
            },
            {
              accountId: targetJournal.defaultAccount.id,
              partnerId: bill.vendorId,
              debit: 0,
              credit: payAmount,
              label: `${method} payment via ${targetJournal.name}`,
            },
          ],
        },
      },
    });

    // 3. Update Bill Paid Amount & Status
    const newPaidTotal = parseFloat(bill.paidAmount) + payAmount;
    const isFullyPaid = newPaidTotal >= (parseFloat(bill.totalAmount) - 0.005);
    const newStatus = isFullyPaid ? 'PAID' : 'PARTIALLY_PAID';

    const updatedBill = await prisma.vendorBill.update({
      where: { id: bill.id },
      data: {
        paidAmount: newPaidTotal,
        status: newStatus,
      },
      include: {
        vendor: true,
        payments: true,
      },
    });

    return res.status(200).json({
      message: 'Payment recorded and ledger updated successfully',
      bill: updatedBill,
      payment,
      journalEntry: paymentJournalEntry,
      amountDue: Math.max(0, parseFloat(updatedBill.totalAmount) - parseFloat(updatedBill.paidAmount)),
    });
  } catch (error) {
    console.error('payBill error:', error);
    return res.status(500).json({ error: 'Failed to record bill payment.' });
  }
}


module.exports = {
  getBills,
  getBillById,
  createBill,
  confirmBill,
  payBill,
};

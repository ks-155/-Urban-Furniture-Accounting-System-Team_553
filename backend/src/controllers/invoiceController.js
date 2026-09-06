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

// Helper to generate next sequential Invoice number: INV0001, INV0002
async function getNextINVNumber() {
  const lastInv = await prisma.customerInvoice.findFirst({
    orderBy: { id: 'desc' },
    select: { invNumber: true },
  });
  if (!lastInv || !lastInv.invNumber) return 'INV0001';
  const match = lastInv.invNumber.match(/\d+$/);
  if (!match) return 'INV0001';
  const nextNum = parseInt(match[0], 10) + 1;
  return `INV${String(nextNum).padStart(4, '0')}`;
}

// GET /api/invoices
async function getInvoices(req, res) {
  try {
    const { status, customerId } = req.query;
    const where = {};

    if (status) where.status = status.toUpperCase();

    if (req.user && req.user.role === 'USER') {
      if (!req.user.contactId) {
        return res.status(200).json({ invoices: [] });
      }
      where.customerId = req.user.contactId;
    } else if (customerId) {
      where.customerId = parseInt(customerId, 10);
    }

    const invoices = await prisma.customerInvoice.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        salesOrder: { select: { id: true, soNumber: true } },
        lines: { include: { product: true } },
        payments: true,
      },
      orderBy: { id: 'desc' },
    });

    return res.status(200).json({ invoices });
  } catch (error) {
    console.error('getInvoices error:', error);
    return res.status(500).json({ error: 'Failed to fetch customer invoices.' });
  }
}

// GET /api/invoices/:id
async function getInvoiceById(req, res) {
  try {
    const { id } = req.params;
    const invoice = await prisma.customerInvoice.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        customer: true,
        salesOrder: true,
        lines: { include: { product: true } },
        payments: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Customer invoice not found.' });
    }

    if (req.user && req.user.role === 'USER') {
      if (invoice.customerId !== req.user.contactId) {
        return res.status(403).json({ error: 'Access denied to this invoice.' });
      }
    }

    return res.status(200).json({ invoice });
  } catch (error) {
    console.error('getInvoiceById error:', error);
    return res.status(500).json({ error: 'Failed to fetch customer invoice.' });
  }
}

// POST /api/invoices (Direct Customer Invoice Creation)
async function createInvoice(req, res) {
  try {
    const { customerId, invoiceDate, dueDate, taxRate = 18, lines } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer is required.' });
    }

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'At least one invoice line is required.' });
    }

    const customer = await prisma.contact.findUnique({
      where: { id: parseInt(customerId, 10) },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer contact not found.' });
    }

    let subtotal = 0;
    const invLines = [];

    for (const line of lines) {
      const { productId, quantity, unitPrice } = line;
      if (!productId || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Each line must have a valid product and quantity > 0.' });
      }

      const product = await prisma.product.findUnique({
        where: { id: parseInt(productId, 10) },
      });

      if (!product) {
        return res.status(404).json({ error: `Product ID ${productId} not found.` });
      }

      const price = unitPrice !== undefined ? parseFloat(unitPrice) : parseFloat(product.salesPrice);
      const qty = parseFloat(quantity);
      const lineSubtotal = qty * price;
      subtotal += lineSubtotal;

      invLines.push({
        productId: product.id,
        quantity: qty,
        unitPrice: price,
        subtotal: lineSubtotal,
      });
    }

    const rate = parseFloat(taxRate) || 0;
    const taxAmount = Math.round((subtotal * rate) / 100 * 100) / 100;
    const totalAmount = subtotal + taxAmount;
    const invNumber = await getNextINVNumber();
    const invDate = invoiceDate ? new Date(invoiceDate) : new Date();
    const due = dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    const invoice = await prisma.customerInvoice.create({
      data: {
        invNumber,
        customerId: customer.id,
        invoiceDate: invDate,
        dueDate: due,
        status: 'DRAFT',
        taxRate: rate,
        taxAmount,
        totalAmount,
        paidAmount: 0,
        lines: { create: invLines },
      },
      include: {
        customer: true,
        lines: { include: { product: true } },
      },
    });

    return res.status(201).json({
      message: 'Customer invoice created successfully',
      invoice,
    });
  } catch (error) {
    console.error('createInvoice error:', error);
    return res.status(500).json({ error: 'Failed to create customer invoice.' });
  }
}

// POST /api/invoices/:id/confirm (Confirms Customer Invoice & Posts Double-Entry Journal Entry)
async function confirmInvoice(req, res) {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(id, 10);

    const invoice = await prisma.customerInvoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, lines: true },
    });

    if (!invoice) return res.status(404).json({ error: 'Customer invoice not found.' });

    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({ error: `Cannot confirm invoice with status ${invoice.status}. Only DRAFT invoices can be confirmed.` });
    }

    // 1. Fetch Accounts for Sales Journal Entry:
    // Debit: 1003 Debtors (Accounts Receivable)
    // Credit: 4001 Sales Income
    // Credit: 2002 Tax Payable (if taxAmount > 0)
    const debtorsAccount = await prisma.account.findUnique({ where: { code: '1003' } });
    const salesIncomeAccount = await prisma.account.findUnique({ where: { code: '4001' } });
    const taxPayableAccount = await prisma.account.findUnique({ where: { code: '2002' } });
    const salesJournal = await prisma.journal.findFirst({ where: { type: 'SALES' } });

    if (!debtorsAccount || !salesIncomeAccount || !salesJournal) {
      return res.status(500).json({
        error: 'Accounting setup incomplete: Accounts 1003/4001 or Sales Journal missing.',
      });
    }

    const total = parseFloat(invoice.totalAmount);
    const tax = parseFloat(invoice.taxAmount || 0);
    const subtotal = Math.round((total - tax) * 100) / 100;

    const items = [
      {
        accountId: debtorsAccount.id,
        partnerId: invoice.customerId,
        debit: total,
        credit: 0,
        label: `Debtors / Receivable - ${invoice.invNumber}`,
      },
    ];

    if (tax > 0 && taxPayableAccount) {
      items.push({
        accountId: salesIncomeAccount.id,
        partnerId: invoice.customerId,
        debit: 0,
        credit: subtotal,
        label: `Sales Revenue - ${invoice.invNumber}`,
      });
      items.push({
        accountId: taxPayableAccount.id,
        partnerId: invoice.customerId,
        debit: 0,
        credit: tax,
        label: `Tax on Sales (${invoice.taxRate}%) - ${invoice.invNumber}`,
      });
    } else {
      items.push({
        accountId: salesIncomeAccount.id,
        partnerId: invoice.customerId,
        debit: 0,
        credit: total,
        label: `Sales Revenue - ${invoice.invNumber}`,
      });
    }

    // Double-entry validation
    const totalDebit = items.reduce((s, it) => s + it.debit, 0);
    const totalCredit = items.reduce((s, it) => s + it.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({
        error: `Journal Entry unbalanced: Debit ${totalDebit} != Credit ${totalCredit}`,
      });
    }

    const entryNumber = await getNextJENumber();

    // 2. Create the balanced double-entry Journal Entry
    const journalEntry = await prisma.journalEntry.create({
      data: {
        entryNumber,
        date: invoice.invoiceDate,
        reference: invoice.invNumber,
        journalId: salesJournal.id,
        status: 'POSTED',
        items: {
          create: items,
        },
      },
      include: {
        items: { include: { account: true } },
      },
    });

    // 3. Update Invoice status to CONFIRMED
    const updatedInvoice = await prisma.customerInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'CONFIRMED',
        journalEntryId: journalEntry.id,
      },
      include: {
        customer: true,
        lines: { include: { product: true } },
        salesOrder: { select: { id: true, soNumber: true } },
      },
    });

    return res.status(200).json({
      message: 'Customer invoice confirmed and Journal Entry posted successfully',
      invoice: updatedInvoice,
      journalEntry,
    });
  } catch (error) {
    console.error('confirmInvoice error:', error);
    return res.status(500).json({ error: 'Failed to confirm customer invoice.' });
  }
}

// POST /api/invoices/:id/pay (Register Customer Payment & Post Payment Journal Entry)
async function payInvoice(req, res) {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(id, 10);
    const { amount, paymentMethod, journalId, note, date } = req.body;

    const invoice = await prisma.customerInvoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true },
    });

    if (!invoice) return res.status(404).json({ error: 'Customer invoice not found.' });

    // Portal USER security: customer can only pay their own invoice
    if (req.user && req.user.role === 'USER') {
      if (invoice.customerId !== req.user.contactId) {
        return res.status(403).json({ error: 'Access denied: You can only pay your own invoices.' });
      }
    }

    if (invoice.status === 'DRAFT') {
      return res.status(400).json({ error: 'Cannot pay a draft invoice. Please confirm it first.' });
    }

    if (invoice.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot pay a cancelled invoice.' });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({ error: 'This invoice is already fully paid.' });
    }

    const remainingDue = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount);

    if (remainingDue <= 0.005) {
      return res.status(400).json({ error: 'This invoice is already fully paid.' });
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

    if (!targetJournal) {
      return res.status(500).json({ error: `Journal for ${method} not found.` });
    }

    // Customer Receipt Journal Entry:
    // Debit: 1002 Bank Account (or 1001 Cash on Hand)
    // Credit: 1003 Debtors (Accounts Receivable)
    const debtorsAccount = await prisma.account.findUnique({ where: { code: '1003' } });
    const bankOrCashAccount = targetJournal.defaultAccount || await prisma.account.findUnique({
      where: { code: method === 'CASH' ? '1001' : '1002' },
    });

    if (!debtorsAccount || !bankOrCashAccount) {
      return res.status(500).json({ error: 'Required accounts (Debtors or Bank/Cash) not configured.' });
    }

    const entryNumber = await getNextJENumber();
    const paymentNumber = await getNextPayNumber();
    const paymentDate = date ? new Date(date) : new Date();

    // 1. Create Double-Entry Payment Journal Entry
    const paymentJE = await prisma.journalEntry.create({
      data: {
        entryNumber,
        date: paymentDate,
        reference: note ? `Receipt: ${invoice.invNumber} (${note})` : `Receipt: ${invoice.invNumber} (${invoice.customer.name})`,
        journalId: targetJournal.id,
        status: 'POSTED',
        items: {
          create: [
            {
              accountId: bankOrCashAccount.id,
              partnerId: invoice.customerId,
              debit: payAmount,
              credit: 0,
              label: `Customer Payment Received - ${invoice.invNumber}${note ? ` (${note})` : ''}`,
            },
            {
              accountId: debtorsAccount.id,
              partnerId: invoice.customerId,
              debit: 0,
              credit: payAmount,
              label: `Settle Receivable - ${invoice.invNumber}`,
            },
          ],
        },
      },
      include: {
        items: { include: { account: true } },
      },
    });

    // 2. Create Payment Record (INBOUND)
    const paymentRecord = await prisma.payment.create({
      data: {
        paymentNumber,
        paymentType: 'INBOUND',
        partnerId: invoice.customerId,
        invoiceId: invoice.id,
        amount: payAmount,
        paymentMethod: method === 'CASH' ? 'CASH' : 'BANK',
        journalId: targetJournal.id,
        date: paymentDate,
        status: 'POSTED',
      },
    });

    // 3. Update Invoice paidAmount and Status
    const newPaid = parseFloat(invoice.paidAmount) + payAmount;
    const isFullyPaid = newPaid >= parseFloat(invoice.totalAmount) - 0.005;
    // Determine new status: PAID if fully settled, PARTIALLY_PAID if partial
    const newStatus = isFullyPaid ? 'PAID' : 'PARTIALLY_PAID';

    const updatedInvoice = await prisma.customerInvoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaid,
        status: newStatus,
      },
      include: {
        customer: true,
        lines: { include: { product: true } },
        payments: true,
      },
    });

    return res.status(200).json({
      message: 'Payment recorded and ledger updated successfully',
      invoice: updatedInvoice,
      payment: paymentRecord,
      journalEntry: paymentJE,
      amountDue: Math.max(0, parseFloat(invoice.totalAmount) - newPaid),
    });
  } catch (error) {
    console.error('payInvoice error:', error);
    return res.status(500).json({ error: 'Failed to register invoice payment.' });
  }
}


module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  confirmInvoice,
  payInvoice,
};

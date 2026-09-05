const prisma = require('../prisma');

// Helper to generate next sequential SO number: SO0001, SO0002, etc.
async function getNextSONumber() {
  const lastSO = await prisma.salesOrder.findFirst({
    orderBy: { id: 'desc' },
    select: { soNumber: true },
  });

  if (!lastSO || !lastSO.soNumber) {
    return 'SO0001';
  }

  const match = lastSO.soNumber.match(/\d+$/);
  if (!match) return 'SO0001';

  const nextNum = parseInt(match[0], 10) + 1;
  return `SO${String(nextNum).padStart(4, '0')}`;
}

// Helper to generate next sequential Invoice number: INV0001, INV0002, etc.
async function getNextINVNumber() {
  const lastInv = await prisma.customerInvoice.findFirst({
    orderBy: { id: 'desc' },
    select: { invNumber: true },
  });

  if (!lastInv || !lastInv.invNumber) {
    return 'INV0001';
  }

  const match = lastInv.invNumber.match(/\d+$/);
  if (!match) return 'INV0001';

  const nextNum = parseInt(match[0], 10) + 1;
  return `INV${String(nextNum).padStart(4, '0')}`;
}

// GET /api/sales
async function getSalesOrders(req, res) {
  try {
    const { status, customerId } = req.query;
    const where = {};

    if (status) where.status = status.toUpperCase();

    // Role-based security: Portal USER can only view their own Sales Orders
    if (req.user && req.user.role === 'USER') {
      if (!req.user.contactId) {
        return res.status(200).json({ salesOrders: [] });
      }
      where.customerId = req.user.contactId;
    } else if (customerId) {
      where.customerId = parseInt(customerId, 10);
    }

    const sos = await prisma.salesOrder.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        lines: { include: { product: true } },
        invoices: { select: { id: true, invNumber: true, status: true, totalAmount: true, paidAmount: true } },
      },
      orderBy: { id: 'desc' },
    });

    return res.status(200).json({ salesOrders: sos });
  } catch (error) {
    console.error('getSalesOrders error:', error);
    return res.status(500).json({ error: 'Failed to fetch sales orders.' });
  }
}

// GET /api/sales/:id
async function getSalesOrderById(req, res) {
  try {
    const { id } = req.params;
    const so = await prisma.salesOrder.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        customer: true,
        lines: { include: { product: true } },
        invoices: true,
      },
    });

    if (!so) {
      return res.status(404).json({ error: 'Sales order not found.' });
    }

    // Role-based security
    if (req.user && req.user.role === 'USER') {
      if (so.customerId !== req.user.contactId) {
        return res.status(403).json({ error: 'Access denied to this sales order.' });
      }
    }

    return res.status(200).json({ salesOrder: so });
  } catch (error) {
    console.error('getSalesOrderById error:', error);
    return res.status(500).json({ error: 'Failed to fetch sales order.' });
  }
}

// POST /api/sales (Create Sales Order)
async function createSalesOrder(req, res) {
  try {
    const { customerId, date, taxRate = 18, lines } = req.body;

    let targetCustomerId = customerId ? parseInt(customerId, 10) : null;
    if (req.user && req.user.role === 'USER') {
      targetCustomerId = req.user.contactId || targetCustomerId;
    }

    if (!targetCustomerId) {
      return res.status(400).json({ error: 'Customer is required.' });
    }

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'At least one order line is required.' });
    }

    const customer = await prisma.contact.findUnique({
      where: { id: targetCustomerId },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer contact not found.' });
    }

    let subtotal = 0;
    const orderLines = [];

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

      orderLines.push({
        productId: product.id,
        quantity: qty,
        unitPrice: price,
        subtotal: lineSubtotal,
      });
    }

    const rate = parseFloat(taxRate) || 0;
    const taxAmount = Math.round((subtotal * rate) / 100 * 100) / 100;
    const totalAmount = subtotal + taxAmount;
    const soNumber = await getNextSONumber();
    const orderDate = date ? new Date(date) : new Date();

    const so = await prisma.salesOrder.create({
      data: {
        soNumber,
        customerId: customer.id,
        date: orderDate,
        status: 'DRAFT',
        taxRate: rate,
        taxAmount,
        totalAmount,
        lines: {
          create: orderLines,
        },
      },
      include: {
        customer: true,
        lines: { include: { product: true } },
      },
    });

    return res.status(201).json({
      message: 'Sales order created successfully',
      salesOrder: so,
    });
  } catch (error) {
    console.error('createSalesOrder error:', error);
    return res.status(500).json({ error: 'Failed to create sales order.' });
  }
}

// POST /api/sales/:id/confirm (Confirm Sales Order)
async function confirmSalesOrder(req, res) {
  try {
    const { id } = req.params;
    const soId = parseInt(id, 10);

    const so = await prisma.salesOrder.findUnique({
      where: { id: soId },
    });

    if (!so) {
      return res.status(404).json({ error: 'Sales order not found.' });
    }

    if (so.status !== 'DRAFT') {
      return res.status(400).json({ error: `Cannot confirm sales order with status ${so.status}.` });
    }

    const updated = await prisma.salesOrder.update({
      where: { id: soId },
      data: { status: 'CONFIRMED' },
      include: { customer: true, lines: { include: { product: true } } },
    });

    return res.status(200).json({
      message: 'Sales order confirmed successfully',
      salesOrder: updated,
    });
  } catch (error) {
    console.error('confirmSalesOrder error:', error);
    return res.status(500).json({ error: 'Failed to confirm sales order.' });
  }
}

// POST /api/sales/:id/create-invoice (Convert SO to Customer Invoice)
async function createInvoiceFromSO(req, res) {
  try {
    const { id } = req.params;
    const soId = parseInt(id, 10);

    const so = await prisma.salesOrder.findUnique({
      where: { id: soId },
      include: { lines: true, customer: true },
    });

    if (!so) {
      return res.status(404).json({ error: 'Sales order not found.' });
    }

    if (so.status === 'DRAFT') {
      return res.status(400).json({ error: 'Sales order must be confirmed before creating an invoice.' });
    }

    if (so.status === 'INVOICED') {
      return res.status(400).json({ error: 'This sales order has already been invoiced.' });
    }

    const invNumber = await getNextINVNumber();
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 15);

    const invLines = so.lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      subtotal: l.subtotal,
    }));

    const invoice = await prisma.customerInvoice.create({
      data: {
        invNumber,
        salesOrderId: so.id,
        customerId: so.customerId,
        invoiceDate: today,
        dueDate,
        status: 'DRAFT',
        taxRate: so.taxRate,
        taxAmount: so.taxAmount,
        totalAmount: so.totalAmount,
        paidAmount: 0,
        lines: {
          create: invLines,
        },
      },
      include: {
        customer: true,
        lines: { include: { product: true } },
        salesOrder: { select: { id: true, soNumber: true } },
      },
    });

    // Mark SO as INVOICED
    await prisma.salesOrder.update({
      where: { id: so.id },
      data: { status: 'INVOICED' },
    });

    return res.status(201).json({
      message: 'Customer invoice generated from Sales Order',
      invoice,
    });
  } catch (error) {
    console.error('createInvoiceFromSO error:', error);
    return res.status(500).json({ error: 'Failed to create customer invoice.' });
  }
}

module.exports = {
  getSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  confirmSalesOrder,
  createInvoiceFromSO,
};

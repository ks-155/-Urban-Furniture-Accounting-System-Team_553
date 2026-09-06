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
    if (req.user && (req.user.role === 'USER' || req.user.role === 'CUSTOMER')) {
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
    if (req.user && (req.user.role === 'USER' || req.user.role === 'CUSTOMER')) {
      if (!req.user.contactId || so.customerId !== req.user.contactId) {
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
    if (req.user && (req.user.role === 'USER' || req.user.role === 'CUSTOMER')) {
      if (!req.user.contactId) {
        return res.status(403).json({ error: 'User does not have an associated customer profile.' });
      }
      targetCustomerId = req.user.contactId;
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

    // Reject if customer is INACTIVE
    if (customer.status === 'INACTIVE') {
      return res.status(400).json({ error: `Customer '${customer.name}' is inactive and cannot be used for new orders.` });
    }

    // Reject if contact is not a customer or both
    if (customer.type !== 'CUSTOMER' && customer.type !== 'BOTH') {
      return res.status(400).json({ error: `Contact '${customer.name}' is not a Customer.` });
    }

    // Validate tax rate
    const rate = parseFloat(taxRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({ error: 'Tax rate must be between 0 and 100.' });
    }

    let subtotal = 0;
    const orderLines = [];

    for (const line of lines) {
      const { productId, quantity, unitPrice } = line;

      // Quantity validation
      const qty = parseFloat(quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Each line quantity must be greater than 0.' });
      }

      if (!productId) {
        return res.status(400).json({ error: 'Each line must have a valid product.' });
      }

      const product = await prisma.product.findUnique({
        where: { id: parseInt(productId, 10) },
      });

      if (!product) {
        return res.status(404).json({ error: `Product ID ${productId} not found.` });
      }

      // Reject inactive products
      if (product.status === 'INACTIVE') {
        return res.status(400).json({ error: `Product '${product.name}' is inactive and cannot be added to orders.` });
      }

      const price = unitPrice !== undefined ? parseFloat(unitPrice) : parseFloat(product.salesPrice);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ error: `Unit price for '${product.name}' cannot be negative.` });
      }

      // Stock check on order creation (pre-check)
      if (product.type === 'GOODS' && product.stock < qty) {
        return res.status(400).json({
          error: `Insufficient stock for '${product.name}': Available ${product.stock}, Requested ${qty}.`,
        });
      }

      const lineSubtotal = qty * price;
      subtotal += lineSubtotal;

      orderLines.push({
        productId: product.id,
        quantity: qty,
        unitPrice: price,
        subtotal: lineSubtotal,
      });
    }

    // Backend re-calculates totals (never trust frontend)
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

// POST /api/sales/:id/confirm (Confirm Sales Order + Deduct Stock)
async function confirmSalesOrder(req, res) {
  try {
    const { id } = req.params;
    const soId = parseInt(id, 10);

    const so = await prisma.salesOrder.findUnique({
      where: { id: soId },
      include: { customer: true, lines: { include: { product: true } } },
    });

    if (!so) {
      return res.status(404).json({ error: 'Sales order not found.' });
    }

    // Idempotency: already confirmed
    if (so.status !== 'DRAFT') {
      return res.status(400).json({ error: `Cannot confirm sales order with status ${so.status}. Only DRAFT orders can be confirmed.` });
    }

    // 1. Customer validation
    const customer = so.customer;
    if (!customer || (customer.type !== 'CUSTOMER' && customer.type !== 'BOTH')) {
      return res.status(400).json({ error: 'Cannot confirm: Customer is invalid.' });
    }
    if (customer.status === 'INACTIVE') {
      return res.status(400).json({ error: 'Cannot confirm: Customer is inactive.' });
    }

    // 2. Line validation + stock check
    for (const line of so.lines) {
      if (!line.product) {
        return res.status(400).json({ error: `Product ID ${line.productId} not found.` });
      }
      if (line.product.status === 'INACTIVE') {
        return res.status(400).json({ error: `Product '${line.product.name}' is inactive.` });
      }
      const qty = parseFloat(line.quantity);
      if (qty <= 0) {
        return res.status(400).json({ error: 'Cannot confirm: All line quantities must be > 0.' });
      }
      // Stock check: only for GOODS
      if (line.product.type === 'GOODS' && line.product.stock < qty) {
        return res.status(400).json({
          error: `Insufficient stock for '${line.product.name}': Available ${line.product.stock}, Requested ${qty}.`,
        });
      }
    }

    // 3. Budget / Analytic Account validation (optional)
    let availableBudget = null;
    let targetBudget = null;
    if (req.body?.budgetAmount !== undefined) {
      availableBudget = parseFloat(req.body.budgetAmount);
    } else if (req.body?.budgetId) {
      targetBudget = await prisma.budget.findUnique({ where: { id: parseInt(req.body.budgetId, 10) } });
      if (targetBudget) availableBudget = parseFloat(targetBudget.plannedAmount) - parseFloat(targetBudget.committedAmount || 0);
    } else if (req.body?.analyticAccountId) {
      targetBudget = await prisma.budget.findFirst({
        where: { analyticAccountId: parseInt(req.body.analyticAccountId, 10), status: 'CONFIRMED' },
      });
      if (targetBudget) availableBudget = parseFloat(targetBudget.plannedAmount) - parseFloat(targetBudget.committedAmount || 0);
    }

    const orderTotal = parseFloat(so.totalAmount);
    if (availableBudget !== null) {
      if (availableBudget < orderTotal || availableBudget <= 0) {
        return res.status(400).json({
          error: `Insufficient budget: Available budget (₹${availableBudget.toLocaleString('en-IN')}) is less than order total (₹${orderTotal.toLocaleString('en-IN')}).`,
        });
      }
    }

    // 4. Use a transaction to confirm SO + deduct stock atomically (prevents concurrent negative stock)
    const result = await prisma.$transaction(async (tx) => {
      // Re-check stock inside transaction for concurrency safety
      for (const line of so.lines) {
        if (line.product.type !== 'GOODS') continue;
        const freshProduct = await tx.product.findUnique({ where: { id: line.product.id } });
        const qty = parseFloat(line.quantity);
        if (freshProduct.stock < qty) {
          throw new Error(`Concurrent stock conflict: Insufficient stock for '${freshProduct.name}'.`);
        }
        // Deduct stock
        await tx.product.update({
          where: { id: line.product.id },
          data: { stock: { decrement: qty } },
        });
      }

      // Update budget committed amount
      if (targetBudget) {
        await tx.budget.update({
          where: { id: targetBudget.id },
          data: { committedAmount: parseFloat(targetBudget.committedAmount || 0) + orderTotal },
        });
      }

      // Confirm the SO
      return tx.salesOrder.update({
        where: { id: soId },
        data: { status: 'CONFIRMED' },
        include: { customer: true, lines: { include: { product: true } } },
      });
    });

    return res.status(200).json({
      message: 'Sales order confirmed successfully. Stock deducted.',
      salesOrder: result,
    });
  } catch (error) {
    console.error('confirmSalesOrder error:', error);
    if (error.message.includes('stock conflict') || error.message.includes('Insufficient stock')) {
      return res.status(409).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to confirm sales order.' });
  }
}

// POST /api/sales/:id/cancel (Cancel DRAFT or CONFIRMED SO)
async function cancelSalesOrder(req, res) {
  try {
    const { id } = req.params;
    const soId = parseInt(id, 10);

    const so = await prisma.salesOrder.findUnique({
      where: { id: soId },
      include: { lines: { include: { product: true } } },
    });

    if (!so) {
      return res.status(404).json({ error: 'Sales order not found.' });
    }

    if (so.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Sales order is already cancelled.' });
    }

    if (so.status === 'INVOICED' || so.status === 'PAID') {
      return res.status(400).json({ error: `Cannot cancel a sales order with status ${so.status}.` });
    }

    const result = await prisma.$transaction(async (tx) => {
      // If CONFIRMED, restore stock
      if (so.status === 'CONFIRMED') {
        for (const line of so.lines) {
          if (line.product && line.product.type === 'GOODS') {
            await tx.product.update({
              where: { id: line.product.id },
              data: { stock: { increment: parseFloat(line.quantity) } },
            });
          }
        }
      }
      return tx.salesOrder.update({
        where: { id: soId },
        data: { status: 'CANCELLED' },
        include: { customer: true, lines: { include: { product: true } } },
      });
    });

    return res.status(200).json({
      message: 'Sales order cancelled successfully.',
      salesOrder: result,
    });
  } catch (error) {
    console.error('cancelSalesOrder error:', error);
    return res.status(500).json({ error: 'Failed to cancel sales order.' });
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

    if (so.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot invoice a cancelled sales order.' });
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
  cancelSalesOrder,
  createInvoiceFromSO,
};

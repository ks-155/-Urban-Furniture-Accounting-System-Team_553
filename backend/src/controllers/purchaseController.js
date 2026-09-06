const prisma = require('../prisma');

// Helper to generate next sequential PO number: P00001, P00002, etc.
async function getNextPONumber() {
  const lastPO = await prisma.purchaseOrder.findFirst({
    orderBy: { id: 'desc' },
    select: { poNumber: true },
  });

  if (!lastPO || !lastPO.poNumber) {
    return 'P00001';
  }

  const match = lastPO.poNumber.match(/\d+$/);
  if (!match) return 'P00001';

  const nextNum = parseInt(match[0], 10) + 1;
  return `P${String(nextNum).padStart(5, '0')}`;
}

// GET /api/purchases
async function getPurchaseOrders(req, res) {
  try {
    const { status, vendorId } = req.query;
    const where = {};

    if (status) where.status = status.toUpperCase();

    // Role-based security: if logged in as portal USER (Vendor), only return their own POs!
    // Role-based security: Portal Vendor can only view their own Purchase Orders
    if (req.user && (req.user.role === 'USER' || req.user.role === 'CUSTOMER')) {
      if (!req.user.contactId) {
        return res.status(200).json({ purchaseOrders: [] });
      }
      where.vendorId = req.user.contactId;
    } else if (vendorId) {
      where.vendorId = parseInt(vendorId, 10);
    }

    const pos = await prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true, email: true, phone: true } },
        lines: { include: { product: true } },
        bills: { select: { id: true, billNumber: true, status: true, totalAmount: true, paidAmount: true } },
      },
      orderBy: { id: 'desc' },
    });

    return res.status(200).json({ purchaseOrders: pos });
  } catch (error) {
    console.error('getPurchaseOrders error:', error);
    return res.status(500).json({ error: 'Failed to fetch purchase orders.' });
  }
}

// GET /api/purchases/:id
async function getPurchaseOrderById(req, res) {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        vendor: true,
        lines: { include: { product: true } },
        bills: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found.' });
    }

    // Role-based protection
    if (req.user && (req.user.role === 'USER' || req.user.role === 'CUSTOMER')) {
      if (!req.user.contactId || po.vendorId !== req.user.contactId) {
        return res.status(403).json({ error: 'Access denied: You can only view your own Purchase Orders.' });
      }
    }

    return res.status(200).json({ purchaseOrder: po });
  } catch (error) {
    console.error('getPurchaseOrderById error:', error);
    return res.status(500).json({ error: 'Failed to fetch purchase order.' });
  }
}

// POST /api/purchases (Create Purchase Order by Accountant)
async function createPurchaseOrder(req, res) {
  try {
    const { vendorId, lines, date } = req.body;

    if (!vendorId) {
      return res.status(400).json({ error: 'Vendor is required.' });
    }

    const vendor = await prisma.contact.findUnique({
      where: { id: parseInt(vendorId, 10) },
    });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found.' });
    }

    // Reject inactive vendor
    if (vendor.status === 'INACTIVE') {
      return res.status(400).json({ error: `Vendor '${vendor.name}' is inactive and cannot be used for new orders.` });
    }

    // Reject if contact is not a vendor or both
    if (vendor.type !== 'VENDOR' && vendor.type !== 'BOTH') {
      return res.status(400).json({ error: `Contact '${vendor.name}' is not a Vendor.` });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'At least one product line is required.' });
    }

    let calculatedTotal = 0;
    const poLinesData = [];

    for (const line of lines) {
      const pId = parseInt(line.productId, 10);
      const qty = parseFloat(line.quantity || 1);
      const price = parseFloat(line.unitPrice || 0);

      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Quantity must be greater than zero.' });
      }

      if (isNaN(price) || price < 0) {
        return res.status(400).json({ error: 'Unit price cannot be negative.' });
      }

      // Check product exists and is active
      const product = await prisma.product.findUnique({ where: { id: pId } });
      if (!product) {
        return res.status(404).json({ error: `Product ID ${pId} not found.` });
      }
      if (product.status === 'INACTIVE') {
        return res.status(400).json({ error: `Product '${product.name}' is inactive and cannot be ordered.` });
      }

      const subtotal = qty * price;
      calculatedTotal += subtotal;

      poLinesData.push({
        productId: pId,
        quantity: qty,
        unitPrice: price,
        subtotal,
      });
    }

    const poNumber = await getNextPONumber();

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        vendorId: parseInt(vendorId, 10),
        date: date ? new Date(date) : new Date(),
        status: 'DRAFT',
        totalAmount: calculatedTotal,
        lines: {
          create: poLinesData,
        },
      },
      include: {
        vendor: true,
        lines: { include: { product: true } },
      },
    });

    return res.status(201).json({
      message: 'Purchase order created successfully',
      purchaseOrder: po,
    });
  } catch (error) {
    console.error('createPurchaseOrder error:', error);
    return res.status(500).json({ error: 'Failed to create purchase order.' });
  }
}


// POST /api/purchases/:id/confirm (Confirm PO by Accountant)
async function confirmPurchaseOrder(req, res) {
  try {
    const { id } = req.params;
    const poId = parseInt(id, 10);

    const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
    if (!po) return res.status(404).json({ error: 'Purchase order not found.' });

    if (po.status !== 'DRAFT') {
      return res.status(400).json({ error: `Cannot confirm purchase order with status ${po.status}. Only DRAFT orders can be confirmed.` });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: 'CONFIRMED' },
    });

    return res.status(200).json({
      message: 'Purchase order confirmed',
      purchaseOrder: updated,
    });
  } catch (error) {
    console.error('confirmPurchaseOrder error:', error);
    return res.status(500).json({ error: 'Failed to confirm purchase order.' });
  }
}

// POST /api/purchases/:id/create-bill (Internal: Accountant converts PO to Vendor Bill)
async function createBillFromPO(req, res) {
  try {
    const { id } = req.params;
    const poId = parseInt(id, 10);

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { lines: true, vendor: true },
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found.' });
    }

    if (po.status === 'BILLED') {
      return res.status(400).json({ error: 'This Purchase Order has already been billed.' });
    }

    if (po.status === 'DRAFT') {
      return res.status(400).json({ error: 'Cannot create a bill from a Draft PO. Please confirm the PO first.' });
    }

    // Sequence for Bill: BILL0001, BILL0002
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

    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 15);

    const billLines = po.lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      subtotal: l.subtotal,
    }));

    const bill = await prisma.vendorBill.create({
      data: {
        billNumber,
        purchaseOrderId: po.id,
        vendorId: po.vendorId,
        billDate: today,
        dueDate,
        status: 'DRAFT',
        totalAmount: po.totalAmount,
        paidAmount: 0,
        lines: {
          create: billLines,
        },
      },
      include: {
        vendor: true,
        lines: { include: { product: true } },
        purchaseOrder: { select: { id: true, poNumber: true } },
      },
    });

    // Mark PO as BILLED
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'BILLED' },
    });

    return res.status(201).json({
      message: 'Vendor bill generated from Purchase Order',
      bill,
    });
  } catch (error) {
    console.error('createBillFromPO error:', error);
    return res.status(500).json({ error: 'Failed to create vendor bill.' });
  }
}

// POST /api/purchases/:id/vendor-submit-bill (External Vendor Portal: Vendor submits bill against PO)
async function vendorSubmitBill(req, res) {
  try {
    const { id } = req.params;
    const poId = parseInt(id, 10);
    const { vendorInvoiceRef, billDate } = req.body;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { lines: true, vendor: true },
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found.' });
    }

    if (req.user && req.user.role === 'USER' && req.user.contactId && po.vendorId !== req.user.contactId) {
      return res.status(403).json({ error: 'Access denied: You can only bill your own Purchase Orders.' });
    }

    if (po.status === 'BILLED') {
      return res.status(400).json({ error: 'This Purchase Order has already been billed.' });
    }

    if (po.status === 'DRAFT') {
      return res.status(400).json({ error: 'Cannot submit a bill for an unconfirmed PO.' });
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

    const today = billDate ? new Date(billDate) : new Date();
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + 15);

    const billLines = po.lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      subtotal: l.subtotal,
    }));

    const bill = await prisma.vendorBill.create({
      data: {
        billNumber,
        reference: vendorInvoiceRef ? vendorInvoiceRef.trim() : null,
        purchaseOrderId: po.id,
        vendorId: po.vendorId,
        billDate: today,
        dueDate,
        status: 'SUBMITTED', // SUBMITTED by Vendor, awaiting Accountant approval!
        totalAmount: po.totalAmount,
        paidAmount: 0,
        lines: {
          create: billLines,
        },
      },
      include: {
        vendor: true,
        lines: { include: { product: true } },
        purchaseOrder: { select: { id: true, poNumber: true } },
      },
    });

    // Mark PO as BILLED
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'BILLED' },
    });

    return res.status(201).json({
      message: 'Vendor bill submitted successfully. Awaiting Urban Furniture accountant approval.',
      bill,
    });
  } catch (error) {
    console.error('vendorSubmitBill error:', error);
    return res.status(500).json({ error: 'Failed to submit vendor bill.' });
  }
}

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  confirmPurchaseOrder,
  createBillFromPO,
  vendorSubmitBill,
};

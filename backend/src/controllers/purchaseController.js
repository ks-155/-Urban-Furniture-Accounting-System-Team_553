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
    if (vendorId) where.vendorId = parseInt(vendorId, 10);

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

    return res.status(200).json({ purchaseOrder: po });
  } catch (error) {
    console.error('getPurchaseOrderById error:', error);
    return res.status(500).json({ error: 'Failed to fetch purchase order.' });
  }
}

// POST /api/purchases (Create Purchase Order)
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

// POST /api/purchases/:id/confirm (Confirm PO)
async function confirmPurchaseOrder(req, res) {
  try {
    const { id } = req.params;
    const poId = parseInt(id, 10);

    const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
    if (!po) return res.status(404).json({ error: 'Purchase order not found.' });

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

// POST /api/purchases/:id/create-bill (Convert PO to Vendor Bill)
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
    dueDate.setDate(today.getDate() + 15); // default 15-day due date

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

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  confirmPurchaseOrder,
  createBillFromPO,
};

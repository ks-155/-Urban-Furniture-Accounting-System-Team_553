const prisma = require('../prisma');

// GET /api/products
async function getProducts(req, res) {
  try {
    const { category, type, search, status } = req.query;
    const where = {};

    // By default show only ACTIVE products; admin list can request all
    if (status && status.toUpperCase() === 'ALL') {
      // no status filter
    } else if (status) {
      where.status = status.toUpperCase();
    } else {
      where.status = 'ACTIVE';
    }

    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    if (type) {
      where.type = type.toUpperCase();
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({ products });
  } catch (error) {
    console.error('getProducts error:', error);
    return res.status(500).json({ error: 'Failed to fetch products.' });
  }
}

// GET /api/products/:id
async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    return res.status(200).json({ product });
  } catch (error) {
    console.error('getProductById error:', error);
    return res.status(500).json({ error: 'Failed to fetch product details.' });
  }
}

// POST /api/products
async function createProduct(req, res) {
  try {
    const { name, sku, type, salesPrice, costPrice, category, stock } = req.body;

    // Name required
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product name is required.' });
    }

    const prodType = type ? type.toUpperCase() : 'GOODS';
    const validTypes = ['GOODS', 'SERVICE', 'COMBO'];
    if (!validTypes.includes(prodType)) {
      return res.status(400).json({ error: 'Product type must be GOODS, SERVICE, or COMBO.' });
    }

    const sPrice = parseFloat(salesPrice);
    const cPrice = parseFloat(costPrice);

    if (isNaN(sPrice) || sPrice < 0) {
      return res.status(400).json({ error: 'Sales price must be >= 0.' });
    }

    if (isNaN(cPrice) || cPrice < 0) {
      return res.status(400).json({ error: 'Cost (purchase) price must be >= 0.' });
    }

    // Stock validation
    const stockQty = stock !== undefined ? parseInt(stock, 10) : 0;
    if (isNaN(stockQty) || stockQty < 0) {
      return res.status(400).json({ error: 'Stock quantity cannot be negative.' });
    }

    // SKU uniqueness check (if provided)
    if (sku && sku.trim()) {
      const existingSku = await prisma.product.findUnique({ where: { sku: sku.trim() } });
      if (existingSku) {
        return res.status(400).json({ error: `SKU '${sku.trim()}' already exists.` });
      }
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        sku: sku && sku.trim() ? sku.trim() : null,
        type: prodType,
        salesPrice: sPrice,
        costPrice: cPrice,
        category: (category || 'Furniture').trim(),
        stock: stockQty,
        status: 'ACTIVE',
      },
    });

    return res.status(201).json({
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A product with this name or SKU already exists.' });
    }
    console.error('createProduct error:', error);
    return res.status(500).json({ error: 'Failed to create product.' });
  }
}

// PUT /api/products/:id
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, sku, type, salesPrice, costPrice, category, stock, status } = req.body;

    const existing = await prisma.product.findUnique({
      where: { id: parseInt(id, 10) },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const updateData = {};
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'Product name cannot be empty.' });
      updateData.name = name.trim();
    }
    if (sku !== undefined) {
      updateData.sku = sku && sku.trim() ? sku.trim() : null;
    }
    if (type !== undefined) {
      const t = type.toUpperCase();
      if (!['GOODS', 'SERVICE', 'COMBO'].includes(t)) {
        return res.status(400).json({ error: 'Product type must be GOODS, SERVICE, or COMBO.' });
      }
      updateData.type = t;
    }
    if (salesPrice !== undefined) {
      const sp = parseFloat(salesPrice);
      if (isNaN(sp) || sp < 0) return res.status(400).json({ error: 'Sales price must be >= 0.' });
      updateData.salesPrice = sp;
    }
    if (costPrice !== undefined) {
      const cp = parseFloat(costPrice);
      if (isNaN(cp) || cp < 0) return res.status(400).json({ error: 'Cost price must be >= 0.' });
      updateData.costPrice = cp;
    }
    if (category !== undefined) updateData.category = category.trim();
    if (stock !== undefined) {
      const s = parseInt(stock, 10);
      if (isNaN(s) || s < 0) return res.status(400).json({ error: 'Stock cannot be negative.' });
      updateData.stock = s;
    }
    if (status !== undefined) {
      const st = status.toUpperCase();
      if (!['ACTIVE', 'INACTIVE'].includes(st)) {
        return res.status(400).json({ error: 'Product status must be ACTIVE or INACTIVE.' });
      }
      updateData.status = st;
    }

    const updated = await prisma.product.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
    });

    return res.status(200).json({
      message: 'Product updated successfully',
      product: updated,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A product with this name or SKU already exists.' });
    }
    console.error('updateProduct error:', error);
    return res.status(500).json({ error: 'Failed to update product.' });
  }
}

// DELETE /api/products/:id (Soft-delete: sets INACTIVE if used in transactions, else hard-deletes)
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const productId = parseInt(id, 10);

    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Check if used in any transactions
    const [soLines, poLines, invLines, billLines] = await Promise.all([
      prisma.salesOrderLine.count({ where: { productId } }),
      prisma.purchaseOrderLine.count({ where: { productId } }),
      prisma.customerInvoiceLine.count({ where: { productId } }),
      prisma.vendorBillLine.count({ where: { productId } }),
    ]);

    const usedInTransactions = soLines + poLines + invLines + billLines > 0;

    if (usedInTransactions) {
      // Soft-delete: mark INACTIVE, preserve history
      const updated = await prisma.product.update({
        where: { id: productId },
        data: { status: 'INACTIVE' },
      });
      return res.status(200).json({
        message: 'Product archived (set INACTIVE) because it has existing transaction history.',
        product: updated,
        archived: true,
      });
    } else {
      // Hard-delete: never been used
      await prisma.product.delete({ where: { id: productId } });
      return res.status(200).json({
        message: 'Product deleted successfully.',
        deleted: true,
      });
    }
  } catch (error) {
    console.error('deleteProduct error:', error);
    return res.status(500).json({ error: 'Failed to delete product.' });
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};

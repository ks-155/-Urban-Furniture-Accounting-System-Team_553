const prisma = require('../prisma');

// GET /api/products
async function getProducts(req, res) {
  try {
    const { category, type, search } = req.query;
    const where = {};

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
    const { name, type, salesPrice, costPrice, category } = req.body;

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
      return res.status(400).json({ error: 'Sales price must be a positive number.' });
    }

    if (isNaN(cPrice) || cPrice < 0) {
      return res.status(400).json({ error: 'Cost price must be a positive number.' });
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        type: prodType,
        salesPrice: sPrice,
        costPrice: cPrice,
        category: (category || 'Furniture').trim(),
      },
    });

    return res.status(201).json({
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    console.error('createProduct error:', error);
    return res.status(500).json({ error: 'Failed to create product.' });
  }
}

// PUT /api/products/:id
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, type, salesPrice, costPrice, category } = req.body;

    const existing = await prisma.product.findUnique({
      where: { id: parseInt(id, 10) },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (type) updateData.type = type.toUpperCase();
    if (salesPrice !== undefined) updateData.salesPrice = parseFloat(salesPrice);
    if (costPrice !== undefined) updateData.costPrice = parseFloat(costPrice);
    if (category) updateData.category = category.trim();

    const updated = await prisma.product.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
    });

    return res.status(200).json({
      message: 'Product updated successfully',
      product: updated,
    });
  } catch (error) {
    console.error('updateProduct error:', error);
    return res.status(500).json({ error: 'Failed to update product.' });
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
};

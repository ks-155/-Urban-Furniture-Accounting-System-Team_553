const prisma = require('../prisma');

// GET /api/contacts (query: ?type=CUSTOMER | VENDOR | BOTH)
async function getContacts(req, res) {
  try {
    const { type, search } = req.query;
    const where = {};

    if (type) {
      where.type = type.toUpperCase();
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({ contacts });
  } catch (error) {
    console.error('getContacts error:', error);
    return res.status(500).json({ error: 'Failed to fetch contacts.' });
  }
}

// GET /api/contacts/:id
async function getContactById(req, res) {
  try {
    const { id } = req.params;
    const contact = await prisma.contact.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        pos: { take: 5, orderBy: { date: 'desc' } },
        sos: { take: 5, orderBy: { date: 'desc' } },
        bills: { take: 5, orderBy: { billDate: 'desc' } },
        invoices: { take: 5, orderBy: { invoiceDate: 'desc' } },
      },
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found.' });
    }

    return res.status(200).json({ contact });
  } catch (error) {
    console.error('getContactById error:', error);
    return res.status(500).json({ error: 'Failed to fetch contact details.' });
  }
}

// POST /api/contacts
async function createContact(req, res) {
  try {
    const { name, type, email, phone, mobile, city, state, pincode, image, imageUrl } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Contact name is required.' });
    }

    const contactType = type ? type.toUpperCase() : 'CUSTOMER';
    const validTypes = ['CUSTOMER', 'VENDOR', 'BOTH'];
    if (!validTypes.includes(contactType)) {
      return res.status(400).json({ error: 'Type must be CUSTOMER, VENDOR, or BOTH.' });
    }

    const contactEmail = email ? email.trim().toLowerCase() : '';
    if (contactEmail) {
      const existing = await prisma.contact.findUnique({
        where: { email: contactEmail },
      });
      if (existing) {
        return res.status(400).json({ error: 'A contact with this email already exists.' });
      }
    }

    const contact = await prisma.contact.create({
      data: {
        name: name.trim(),
        type: contactType,
        email: contactEmail || `contact_${Date.now()}@placeholder.com`,
        phone: (phone || mobile || '').trim(),
        city: (city || '').trim(),
        state: (state || '').trim(),
        pincode: (pincode || '').trim(),
        imageUrl: imageUrl || image || null,
      },
    });

    return res.status(201).json({
      message: 'Contact created successfully',
      contact,
    });
  } catch (error) {
    console.error('createContact error:', error);
    return res.status(500).json({ error: 'Failed to create contact.' });
  }
}

// PUT /api/contacts/:id
async function updateContact(req, res) {
  try {
    const { id } = req.params;
    const { name, type, email, phone, mobile, city, state, pincode, image, imageUrl } = req.body;

    const existing = await prisma.contact.findUnique({
      where: { id: parseInt(id, 10) },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Contact not found.' });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (type) updateData.type = type.toUpperCase();
    if (email) updateData.email = email.trim().toLowerCase();
    if (phone || mobile) updateData.phone = (phone || mobile).trim();
    if (city !== undefined) updateData.city = city.trim();
    if (state !== undefined) updateData.state = state.trim();
    if (pincode !== undefined) updateData.pincode = pincode.trim();
    if (image || imageUrl) updateData.imageUrl = image || imageUrl;

    const updated = await prisma.contact.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
    });

    return res.status(200).json({
      message: 'Contact updated successfully',
      contact: updated,
    });
  } catch (error) {
    console.error('updateContact error:', error);
    return res.status(500).json({ error: 'Failed to update contact.' });
  }
}

module.exports = {
  getContacts,
  getContactById,
  createContact,
  updateContact,
};

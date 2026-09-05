const bcrypt = require('bcryptjs');
const prisma = require('../prisma');
const { validateLoginId, validatePassword, validateEmail } = require('../services/validationService');

// POST /api/users (Admin user creation matching Excalidraw "Create User" screen)
async function createUser(req, res) {
  try {
    const { name, loginId, email, role, password, confirmPassword } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    const loginIdError = validateLoginId(loginId);
    if (loginIdError) {
      return res.status(400).json({ error: loginIdError });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({ error: emailError });
    }

    const validRoles = ['ADMIN', 'ACCOUNTANT', 'USER'];
    const assignedRole = role ? role.toUpperCase() : 'USER';
    if (!validRoles.includes(assignedRole)) {
      return res.status(400).json({ error: 'Invalid role selected. Allowed: ADMIN, ACCOUNTANT, USER.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    // Check duplicate loginId
    const existingLoginId = await prisma.user.findUnique({
      where: { loginId: loginId.trim() },
    });
    if (existingLoginId) {
      return res.status(400).json({ error: 'Login ID already exists.' });
    }

    // Check duplicate email
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        loginId: loginId.trim(),
        email: email.trim().toLowerCase(),
        role: assignedRole,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        loginId: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: 'User created successfully',
      user: newUser,
    });
  } catch (error) {
    console.error('CreateUser error:', error);
    return res.status(500).json({ error: 'Internal server error while creating user.' });
  }
}

// GET /api/users
async function listUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        loginId: true,
        email: true,
        role: true,
        contactId: true,
        createdAt: true,
      },
      orderBy: { id: 'asc' },
    });
    return res.status(200).json({ users });
  } catch (error) {
    console.error('ListUsers error:', error);
    return res.status(500).json({ error: 'Internal server error while fetching users.' });
  }
}

module.exports = {
  createUser,
  listUsers,
};

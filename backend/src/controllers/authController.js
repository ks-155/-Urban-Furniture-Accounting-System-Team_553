const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const { JWT_SECRET } = require('../middlewares/auth');
const { validateLoginId, validatePassword, validateEmail } = require('../services/validationService');

// POST /api/auth/login
async function login(req, res) {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Please provide both Login ID and Password.' });
    }

    const user = await prisma.user.findUnique({
      where: { loginId: loginId.trim() },
      include: { contact: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid Login Id or Password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid Login Id or Password' });
    }

    const tokenPayload = {
      id: user.id,
      loginId: user.loginId,
      role: user.role,
      contactId: user.contactId,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        loginId: user.loginId,
        email: user.email,
        role: user.role,
        contactId: user.contactId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
}

// POST /api/auth/signup (Creates a USER role)
async function signup(req, res) {
  try {
    const { name, loginId, email, password, confirmPassword } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full name is required.' });
    }

    const loginIdError = validateLoginId(loginId);
    if (loginIdError) {
      return res.status(400).json({ error: loginIdError });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({ error: emailError });
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
      return res.status(400).json({ error: 'Login ID is already taken. Please choose another.' });
    }

    // Check duplicate email
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email is already registered. Please use another.' });
    }

    // Auto-create or link Contact record for customer portal access
    let contact = await prisma.contact.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          name: name.trim(),
          type: 'CUSTOMER',
          email: email.trim().toLowerCase(),
          phone: '',
          city: '',
          state: '',
          pincode: '',
        },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        loginId: loginId.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: 'USER',
        contactId: contact.id,
      },
    });

    const tokenPayload = {
      id: newUser.id,
      loginId: newUser.loginId,
      role: newUser.role,
      contactId: newUser.contactId,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        loginId: newUser.loginId,
        email: newUser.email,
        role: newUser.role,
        contactId: newUser.contactId,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        loginId: true,
        email: true,
        role: true,
        contactId: true,
        contact: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = {
  login,
  signup,
  getMe,
};

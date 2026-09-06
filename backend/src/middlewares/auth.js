const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'urban_furniture_super_secret_jwt_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

function authorizeRoles(...allowedRoles) {
  // Normalize roles so that 'CUSTOMER' and 'USER' are treated equivalently
  const normalizedAllowed = allowedRoles.flatMap((r) =>
    r === 'CUSTOMER' || r === 'USER' ? ['CUSTOMER', 'USER'] : [r]
  );

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied. Authentication required.' });
    }
    const userRole = req.user.role;
    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ error: 'Access forbidden: insufficient permissions.' });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
  JWT_SECRET,
};

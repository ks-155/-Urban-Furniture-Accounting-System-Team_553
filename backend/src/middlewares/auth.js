const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'urban_furniture_super_secret_jwt_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    // Set req.user to match exactly { userId, systemRole }
    req.user = {
      userId: decoded.userId,
      systemRole: decoded.systemRole,
    };
    next();
  });
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied. Authentication required.' });
    }
    const userRole = req.user.systemRole;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: `Access forbidden: requires one of ${allowedRoles.join(', ')}.` });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  authorizeRoles,
};

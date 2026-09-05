function validateLoginId(loginId) {
  if (!loginId || typeof loginId !== 'string') {
    return 'Login Id is required.';
  }
  const trimmed = loginId.trim();
  if (trimmed.length < 6 || trimmed.length > 12) {
    return 'Login Id must be between 6 and 12 characters.';
  }
  return null;
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return 'Password is required.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasLower || !hasUpper || !hasSpecial) {
    return 'Password must contain at least one lowercase letter, one uppercase letter, and one special character.';
  }
  return null;
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return 'Email is required.';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address.';
  }
  return null;
}

module.exports = {
  validateLoginId,
  validatePassword,
  validateEmail,
};

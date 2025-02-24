const bcrypt = require('bcrypt');

// Hash a password
exports.hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

// Validate a password
exports.validatePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

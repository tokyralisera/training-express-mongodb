const bcrypt = require('bcrypt');
const {createHmac} = require('crypto');

// Hash a password
exports.hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

// Validate a password
exports.validatePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

exports.hmacProcess = (value,key) => {
  const result = createHmac('sha256', key).update(value).digest('hex');
  return result;
}
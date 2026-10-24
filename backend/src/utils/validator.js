const validator = require('validator');

// Validates registration payloads (req.body).
const validate = (data) => {
  if (!data || typeof data !== 'object') throw new Error('Some field missing');

  const mandatoryField = ['firstName', 'emailId', 'password'];
  if (!mandatoryField.every((k) => typeof data[k] === 'string' && data[k].trim())) {
    throw new Error('Some field missing');
  }

  const firstName = data.firstName.trim();
  if (firstName.length < 3 || firstName.length > 20) {
    throw new Error('First name must be 3-20 characters');
  }

  if (!validator.isEmail(data.emailId)) throw new Error('Invalid email');

  if (!validator.isStrongPassword(data.password)) {
    throw new Error('Weak password: use 8+ characters with upper and lower case letters, a number, and a symbol');
  }
};

module.exports = validate;

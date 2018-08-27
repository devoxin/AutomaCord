const jwt = require('jsonwebtoken');

function sign (content, key, options = {}) {
  return new Promise((resolve, reject) => {
    jwt.sign(content, key, options, (err, token) => {
      if (err) {
        return reject(null);
      }

      resolve(token);
    });
  });
}

function verify (token, key, options = {}) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, key, options, (err, decoded) => {
      if (err) {
        return reject(null);
      }

      resolve(decoded);
    });
  });
}

function isValid (token, key) {
  return new Promise((resolve, reject) => {
    verify(token, key)
      .then(() => resolve(true))
      .catch(() => resolve(false));
  });
}

module.exports = {
  isValid,
  sign,
  verify
};

const config = require('../config');
const jwt = require('./jwt');

function getUser (req, res, next) {
  const { automacord } = req.cookies;

  req.user = {
    isAuthenticated: () => jwt.isValid(automacord, config.web.jwtSeed),
    id: async () => {
      const { id } = await jwt.verify(automacord, config.web.jwtSeed)
        .catch(() => ({}));

      return id;
    }
  };

  next();
}

module.exports = getUser;

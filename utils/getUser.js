const config = require('../config');
const jwt = require('./jwt');
const snekfetch = require('snekfetch');

function getUser (req, res, next) {
  const { automacord } = req.cookies;

  req.user = {
    isAuthenticated: () => jwt.isValid(automacord, config.web.jwtSeed),
    get: async () => {
      const { token } = await jwt.verify(automacord, config.web.jwtSeed)
        .catch(() => null);

      if (!token) {
        return null;
      }

      return await snekfetch.get('https://discordapp.com/api/v7/users/@me')
        .set('User-Agent', 'AutomaCord (https://github.com/Devoxin/AutomaCord, v1)')
        .set('Authorization', `Bearer ${token}`)
        .then(data => data.body);
    }
  };

  next();
}

module.exports = getUser;

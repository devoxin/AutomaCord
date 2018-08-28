const config = require('../config');
const express = require('express');
const snekfetch = require('snekfetch');
const jwt = require('../utils/jwt');

const BASE_URL = 'https://discordapp.com/api/oauth2/authorize?client_id={clientid}&redirect_uri={redirect}&response_type=code&scope=identify';
const API_URL = 'https://discordapp.com/api/v7';

class Route {
  static getRedirectURI () {
    if (80 !== config.web.port && config.web.appendPortToRedirectURI) {
      return `${config.web.domain}:${config.web.port}/auth/handshake`;
    } else {
      return `${config.web.domain}/auth/handshake`;
    }
  }

  static configure (server, bot) {
    const router = express.Router();
    server.use('/auth', router);

    router.get('/login', (req, res) => {
      const compiled = BASE_URL
        .replace('{clientid}', config.discord.clientId)
        .replace('{redirect}', encodeURIComponent(this.getRedirectURI()));

      res.redirect(compiled);
    });

    router.get('/handshake', async (req, res) => {
      const { code } = req.query;

      if (!code) {
        return res.render('error', { 'error': 'Invalid code' });
      }

      const auth = await snekfetch.post(`${API_URL}/oauth2/token`)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('User-Agent', 'AutomaCord (https://github.com/Devoxin/AutomaCord, v1)')
        .query({
          client_id: config.discord.clientId,
          client_secret: config.discord.clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.getRedirectURI(),
          scope: 'identify'
        })
        .catch(() => null);

      if (!auth) {
        return res.render('error', { 'error': 'Something went wrong during the handshake with Discord' });
      }

      const currentUser = await snekfetch.get(`${API_URL}/users/@me`)
        .set('Authorization', `Bearer ${auth.body.access_token}`)
        .catch(() => null);

      if (!currentUser) {
        return res.render('error', { 'error': 'Something went wrong during the handshake with Discord' });
      }

      const webToken = await jwt.sign(
        {
          id: currentUser.body.id,
        },
        config.web.jwtSeed
      );

      if (!webToken) {
        return res.render('error', { 'error': 'Something went wrong during the handshake with Discord' });
      }

      res
        .cookie('automacord', webToken, { maxAge: 604800000 })
        .redirect('/');
    });
  }
}

module.exports = Route;

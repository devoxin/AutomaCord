const config = require('../config');
const db = require('../utils/db');
const express = require('express');

class Route {
  static configure (server, bot) {
    const router = express.Router();
    server.use('/', router);

    router.get('/', async (req, res) => {
      const bots = await db.table('bots');
      res.render('index', { bots });
    });
    
    router.get('/add', (req, res) => {
      res.render('add')
    });

    router.post('/add', async (req, res) => {
      if (!req.body || !(req.body instanceof Object)) {
        return res.status(400).json({ 'error': 'Malformed payload' });
      }

      const validatePayload = ['clientId', 'prefix', 'shortDesc', 'longDesc'].filter(field => !Object.keys(req.body).includes(field));

      if (validatePayload.length > 0) {
        return res.status(400).json({ 'error': `Malformed payload: missing fields ${validatePayload.join(', ')}` });
      }

      const { clientId, prefix, shortDesc, longDesc } = req.body;

      if (!/[0-9]{17,21}/.test(clientId)) {
        return res.status(400).json({ 'error': 'Malformed payload: clientId must only consist of numbers and be 17-21 characters in length '});
      }

      if (prefix.length < 1) {
        return res.status(400).json({ 'error': 'Malformed payload: prefix may not be shorter than 1 character' });
      }

      if (shortDesc.length > 150) {
        return res.status(400).json({ 'error': 'Malformed payload: shortDesc must not be longer than 150 characters' });
      }

      const user = await bot.getRESTUser(clientId)
        .catch(() => null);

      if (!user) {
        return res.status(500).json({ 'error': 'Unable to find information related to the clientId' });
      }

      if (!user.bot) {
        return res.status(400).json({ 'error': 'The specified clientId is not associated with a bot' });
      }

      res.render('added');

      await db.table('bots').insert({
        id: clientId,
        prefix,
        shortDesc,
        longDesc,
        username: user.username,
        avatar: user.avatar,
        discriminator: user.discriminator
      });

      bot.createMessage(config.bot.listLogChannel, `Client ID: ${clientId}\nPrefix: ${prefix}\nShort Desc: ${shortDesc}\nLong Desc: ${longDesc}`);
    });
  }
}

module.exports = Route;

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

    router.get('/add', async (req, res) => {
      if (!await req.user.isAuthenticated()) {
        return res.redirect('auth/login');
      }

      res.render('add');
    });

    router.post('/add', async (req, res) => {
      if (!req.body || !(req.body instanceof Object)) {
        return res.render('error', { error: 'Malformed payload' });
      }

      const validatePayload = ['clientId', 'prefix', 'shortDesc', 'longDesc'].filter(field => !Object.keys(req.body).includes(field));

      if (0 < validatePayload.length) {
        return res.render('error', { error: `Malformed payload: missing fields ${validatePayload.join(', ')}` });
      }

      const { clientId, prefix, shortDesc, longDesc } = req.body;

      if (!/[0-9]{17,21}/.test(clientId)) {
        return res.render('error', { error: 'Malformed payload: clientId must only consist of numbers and be 17-21 characters in length ' });
      }

      if (1 > prefix.length) {
        return res.render('error', { 'error': 'Malformed payload: prefix may not be shorter than 1 character' });
      }

      if (150 < shortDesc.length) {
        return res.render('error', { 'error': 'Malformed payload: shortDesc must not be longer than 150 characters' });
      }

      const user = await bot.getRESTUser(clientId)
        .catch(() => null);

      if (!user) {
        return res.render('error', { 'error': 'Unable to find information related to the clientId' });
      }

      if (await db.table('bots').get(clientId).coerceTo('bool')) {
        return res.render('error', { 'error': `${user.username} is already listed!` });
      }

      if (!user.bot) {
        return res.render('error', { 'error': 'The specified clientId is not associated with a bot' });
      }

      const owner = await req.user.get();

      await db.table('bots').insert({
        id: clientId,
        prefix,
        shortDesc,
        longDesc,
        username: user.username,
        avatar: user.avatar,
        discriminator: user.discriminator,
        owner: owner.id
      });

      res.render('added');

      bot.createMessage(config.bot.listLogChannel, `${owner.username} added ${user.username}`);
    });
  }
}

module.exports = Route;

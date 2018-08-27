const config = require('../config');
const db = require('../utils/db');
const r = require('rethinkdbdash');
const express = require('express');

class Route {
  static configure (server, bot) {
    const router = express.Router();
    server.use('/', router);

    router.get('/', async (req, res) => {
      const bots = await db.table('bots');
      bots.forEach(bot => bot.seed = Math.random());

      const randomized = bots.sort((a, b) => a.seed - b.seed);

      res.render('index', { bots: randomized });
    });

    router.get('/add', async (req, res) => {
      if (!await req.user.isAuthenticated()) {
        return res.redirect('auth/login');
      }

      res.render('add');
    });

    router.post('/add', async (req, res) => {
      if (!req.body || !(req.body instanceof Object)) {
        return res.render('error', { error: 'Malformed payload', shouldRetry: true });
      }

      const validatePayload = ['clientId', 'prefix', 'shortDesc', 'longDesc'].filter(field => !Object.keys(req.body).includes(field));

      if (0 < validatePayload.length) {
        return res.render('error', { error: `Malformed payload: missing fields ${validatePayload.join(', ')}`, shouldRetry: true });
      }

      const { clientId, prefix, shortDesc, longDesc } = req.body;

      if (!/[0-9]{17,21}/.test(clientId)) {
        return res.render('error', { error: 'Malformed payload: clientId must only consist of numbers and be 17-21 characters in length', shouldRetry: true });
      }

      if (1 > prefix.length) {
        return res.render('error', { 'error': 'Malformed payload: prefix may not be shorter than 1 character', shouldRetry: true });
      }

      if (150 < shortDesc.length) {
        return res.render('error', { 'error': 'Malformed payload: shortDesc must not be longer than 150 characters', shouldRetry: true });
      }

      const user = await bot.getRESTUser(clientId)
        .catch(() => null);

      if (!user) {
        return res.render('error', { 'error': 'Unable to find information related to the clientId', shouldRetry: true });
      }

      if (await db.table('bots').get(clientId).coerceTo('bool')) {
        return res.render('error', { 'error': `${user.username} is already listed!` });
      }

      if (!user.bot) {
        return res.render('error', { 'error': 'The specified clientId is not associated with a bot', shouldRetry: true });
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

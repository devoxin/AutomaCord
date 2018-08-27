const config = require('../config');
const express = require('express');

class Route {
  static configure (server, bot) {
    const router = express.Router();
    server.use('/auth', router);

    router.get('/', (req, res) => {
      res.render('index');
    });

    router.get('/add', (req, res) => {
      res.render('add');
    });

    router.post('/add', (req, res) => {
      if (!req.body || !(req.body instanceof Object)) {
        return res.status(400).json({ 'error': 'Malformed payload' });
      }

      const validatePayload = ['clientId', 'prefix', 'shortDesc', 'longDesc'].filter(field => !Object.keys(req.body).includes(field));

      if (0 < validatePayload.length) {
        return res.status(400).json({ 'error': `Malformed payload: missing fields ${validatePayload.join(', ')}` });
      }

      const { clientId, prefix, shortDesc, longDesc } = req.body;

      console.log(clientId, prefix, shortDesc, longDesc);

      bot.createMessage(config.bot.listLogChannel, `Some fuck just added a bot with client id ${clientId}`);
    });
  }
}

module.exports = Route;

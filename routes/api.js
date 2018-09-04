const db = require('../utils/db');
const express = require('express');

class Route {
  static async ensureBotExists (req, res, next) {
    if (!req.params.id) {
      return res.status(400).json({ message: 'Invalid Bot ID' });
    }

    const bot = await db.table('bots').get(req.params.id);

    if (!bot) {
      return res.status(404).json({ message: 'No bots found with that ID' });
    }

    req.bot = bot;
    next();
  }

  static configure (server, bot) {
    const router = express.Router();
    server.use('/api', router);

    router.get('/', (req, res) => {
      res.render('error', { 'error': 'Docs pending.' });
    });

    router.get('/bot/:id', this.ensureBotExists, (req, res) => {
      res.json(req.bot);
    });
  }
}

module.exports = Route;

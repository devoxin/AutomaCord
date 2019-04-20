const db = require('../utils/db');
const express = require('express');

class Route {
  static async ensureBotExists (req, res, next) {
    if (!req.params.id) {
      return res.status(400).json({ message: 'Invalid Bot ID' });
    }

    const bot = await db.getBot(req.params.id);

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
      res.render('error', { error: 'Docs pending.' });
    });

    router.get('/bots', async (req, res) => {
      const bots = await db.getAllBots();
      res.json(bots);
    });

    router.get('/bot/:id', this.ensureBotExists, (req, res) => {
      res.json(req.bot);
    });

    router.get('/search', async (req, res) => {
      const { query } = req.query;

      if (query.length === 0 || !/^[a-zA-Z0-9 ]+$/.test(query)) {
        return res.json([]);
      }

      const results = await db.searchBots(query);
      res.json(results);
    });
  }
}

module.exports = Route;

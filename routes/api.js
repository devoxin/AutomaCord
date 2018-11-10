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

  static getAvatar (bot, id) {
    const user = bot.users.get(id) || {};
    return user.avatar || '';
  }

  static configure (server, bot) {
    const router = express.Router();
    server.use('/api', router);

    router.get('/', (req, res) => {
      res.render('error', { 'error': 'Docs pending.' });
    });

    router.get('/bots', async (req, res) => {
      const bots = await db.table('bots');
      res.json(bots);
    });

    router.get('/bot/:id', this.ensureBotExists, (req, res) => {
      res.json(req.bot);
    });

    router.get('/search', async (req, res) => {
      const { query } = req.query;

      if (0 === query.length || !/^[a-zA-Z0-9 ]+$/.test(query)) {
        return res.json([]);
      }

      const results = await db.table('bots')
        .filter(b => b('username').downcase().match(query).and(b('approved').eq(true)));

      results.forEach(b => b.avatar = this.getAvatar(bot, b.id));
      res.json(results);
    });
  }
}

module.exports = Route;

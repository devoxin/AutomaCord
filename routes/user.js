const config = require('../config');
const db = require('../utils/db');
const express = require('express');

class Route {
  static async ensureUserExists (bot, req, res, next) {
    const member = bot.listGuild.members.get(req.params.id);

    if (!member) {
      return res.render('error', { 'error': 'No users found with that ID. Note that you can only view profiles of users in the AutomaCord server' });
    }

    const profile = await db.table('users').get(req.params.id).default({});
    const bots = await db.table('bots').filter({ 'owner': req.params.id });
    const isWebAdmin = member && member.roles.some(id => id === config.management.websiteAdminRole);

    req.userProfile = { ...member, ...profile, isWebAdmin, bots };
    next();
  }

  static configure (server, bot) {
    const router = express.Router();
    server.use('/user', router);

    router.get('/:id', this.ensureUserExists.bind(null, bot), (req, res) => {
      res.render('user', req.userProfile);
    });
  }
}

module.exports = Route;

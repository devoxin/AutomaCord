const config = require('../config');
const db = require('../utils/db');
const express = require('express');
const marked = require('marked');
const filterXss = require('xss');

class Route {
  static async requireSignIn (req, res, next) {
    if (!await req.user.isAuthenticated()) {
      return res.redirect('auth/login');
    }

    next();
  }

  static async ensureBotExists (req, res, next) {
    if (!req.params.id) {
      return res.render('error', { 'error': 'The ID you provided is invalid' });
    }

    const bot = await db.table('bots').get(req.params.id);

    if (!bot) {
      return res.render('error', { 'error': 'Bot not found! Did you mistype the ID?' });
    }

    req.bot = bot;
    next();
  }

  static configure (server, bot) {
    const router = express.Router();
    server.use('/bot', router);

    router.get('/', (req, res) => {
      res.redirect('/');
    });

    router.get('/:id', this.ensureBotExists, async (req, res) => {
      const { bot: botInfo } = req;

      const currentId = await req.user.id();
      const currentUser = bot.listGuild.members.get(currentId);

      const botOwner = await bot.fetchUser(botInfo.owner)
        || { username: 'Unknown User', discriminator: '0000', id: botInfo.owner };

      botInfo.longDesc = filterXss(
        marked(botInfo.longDesc),
        {
          whiteList: {
            'style': []
          }
        }
      );
      botInfo.invite = botInfo.invite || `https://discordapp.com/oauth2/authorize?client_id=${botInfo.id}&scope=bot`;
      botInfo.owner = botOwner;
      botInfo.isWebAdmin = currentUser && currentUser.roles.some(id => id === config.management.websiteAdminRole);
      botInfo.canManageBot = currentId && botOwner.id === currentId || botInfo.isWebAdmin;

      res.render('bot', botInfo);
    });

    router.get('/:id/reject', this.ensureBotExists, this.requireSignIn, async (req, res) => {
      const currentUser = bot.listGuild.members.get(await req.user.id());

      if (!currentUser || !currentUser.roles.some(id => id === config.management.websiteAdminRole)) {
        return res.render('error', { 'error': 'You do not have permission to do that' });
      }

      res.render('reject', { username: req.bot.username });
    });

    router.post('/:id/reject', this.ensureBotExists, this.requireSignIn, async (req, res) => {
      if (!req.body.reason) {
        return res.render('error', { 'error': 'You need to provide a reason for rejection' });
      }

      const currentUser = bot.listGuild.members.get(await req.user.id());

      if (!currentUser || !currentUser.roles.some(id => id === config.management.websiteAdminRole)) {
        return res.render('error', { 'error': 'You do not have permission to do that' });
      }

      res.redirect('/queue');

      await db.table('bots').get(req.bot.id).delete();
      const botMember = bot.listGuild.members.get(req.bot.id);

      if (botMember) {
        await botMember.kick(`Rejected by ${currentUser.username} for ${req.body.reason}`);
      }

      bot.createMessage(config.management.listLogChannel, `${currentUser.username} rejected ${req.bot.username} (<@${req.bot.id}>) for **${req.body.reason}**`);
    });

    router.get('/:id/approve', this.ensureBotExists, this.requireSignIn, async (req, res) => {
      const currentUser = bot.listGuild.members.get(await req.user.id());

      if (!currentUser || !currentUser.roles.some(id => id === config.management.websiteAdminRole)) {
        return res.render('error', { 'error': 'You do not have permission to do that' });
      }

      res.redirect('/queue');

      await db.table('bots').get(req.bot.id).update({
        approved: true
      });

      const botOwner = bot.listGuild.members.get(req.bot.owner);

      if (botOwner) {
        await botOwner.addRole(config.management.botDeveloperRole, `${currentUser.username} approved ${req.bot.username}`);
      }

      bot.createMessage(config.management.listLogChannel, `${currentUser.username} approved ${req.bot.username} (<@${req.bot.id}>)`);
    });
  }
}

module.exports = Route;

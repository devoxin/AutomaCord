const config = require('../config');
const db = require('../utils/db');
const validate = require('../utils/payloadValidator');
const express = require('express');

class Route {
  static configure (server, bot) {
    const router = express.Router();
    server.use('/', router);

    router.get('/', async (req, res) => {
      const bots = await db.table('bots').filter({ 'approved': true });
      bots.forEach(bot => bot.seed = Math.random());

      const randomized = bots.sort((a, b) => a.seed - b.seed);

      res.render('index', { bots: randomized });
    });

    router.get('/queue', async (req, res) => {
      const bots = await db.table('bots').filter({ 'approved': false }).orderBy('added');
      res.render('queue', { bots });
    });

    router.get('/add', async (req, res) => {
      if (!await req.user.isAuthenticated()) {
        return res.redirect('auth/login');
      }

      res.render('add');
    });

    router.post('/add', async (req, res) => {
      const validation = validate(req.body, true, res);

      if (!validation) {
        return;
      }

      const { clientId, prefix, shortDesc, longDesc, inviteUrl } = req.body;
      const user = await bot.fetchUser(clientId);

      if (!user) {
        return res.render('error', { 'error': 'Unable to find information related to the clientId', shouldRetry: true });
      }

      if (await db.table('bots').get(clientId).coerceTo('bool')) {
        return res.render('error', { 'error': `${user.username} is already listed!` });
      }

      if (!user.bot) {
        return res.render('error', { 'error': 'The specified clientId is not associated with a bot', shouldRetry: true });
      }

      const owner = bot.listGuild.members.get(await req.user.id());

      if (!owner) {
        return res.render('error', { 'error': 'You need to be in the server to add bots' });
      }

      await db.table('bots').insert({
        id: clientId,
        invite: inviteUrl,
        prefix,
        shortDesc,
        longDesc,
        username: user.username,
        avatar: user.avatar,
        discriminator: user.discriminator,
        owner: owner.id,
        approved: false,
        added: Date.now()
      });

      res.render('added');
      bot.createMessage(config.management.listLogChannel, `${owner.username} added ${user.username} (<@${user.id}>)`);
    });

    // TODO: Move to bot route
    router.get('/delete', async (req, res) => {
      if (!await req.user.isAuthenticated()) {
        return res.redirect('auth/login');
      }

      if (!req.query.id) {
        return res.redirect('/');
      }

      const currentId = await req.user.id();
      const currentUser = bot.listGuild.members.get(currentId);
      const botInfo = await db.table('bots').get(req.query.id);

      if (!botInfo) {
        return res.render('error', { 'error': 'No bot exists with with that ID' });
      }

      if (currentId !== botInfo.owner) {
        if (!currentUser || !currentUser.roles.some(id => id === config.management.websiteAdminRole)) {
          return res.render('error', { 'error': 'You do not have permission to do that' });
        }
      }

      const botMember = bot.listGuild.members.get(req.query.id);

      if (botMember) {
        await botMember.kick(`Removed by ${currentUser ? currentUser.name : currentId}`);
      }

      await db.table('bots').get(req.query.id).delete();
      res.redirect('/');

      bot.createMessage(config.management.listLogChannel, `${currentUser ? currentUser.username : `<@${currentId}>`} deleted ${botInfo.username} (<@${botInfo.id}>)`);
    });
  }
}

module.exports = Route;

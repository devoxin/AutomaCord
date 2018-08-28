const config = require('../config');
const db = require('../utils/db');
const express = require('express');

class Route {
  static validateFields (payload, res) {
    if (!payload || !(payload instanceof Object)) {
      res.render('error', { 'error': 'Invalid payload', shouldRetry: true });
      return false;
    }

    const validatePayload = ['clientId', 'prefix', 'shortDesc', 'longDesc'].filter(field => !Object.keys(payload).includes(field));

    if (0 < validatePayload.length) {
      res.render('error', { 'error': `Missing fields ${validatePayload.join(', ')}`, shouldRetry: true });
      return false;
    }

    const { clientId, prefix, shortDesc } = payload;

    if (!/[0-9]{17,21}/.test(clientId)) {
      res.render('error', { 'error': 'Client ID must only consist of numbers and be 17-21 characters in length', shouldRetry: true });
      return false;
    }

    if (1 > prefix.length) {
      res.render('error', { 'error': 'Prefix may not be shorter than 1 character', shouldRetry: true });
      return false;
    }

    if (150 < shortDesc.length) {
      res.render('error', { 'error': 'Short description must not be longer than 150 characters', shouldRetry: true });
      return false;
    }

    return true;
  }

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
      const validation = this.validateFields(req.body);

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
        approved: false
      });

      res.render('added');
      bot.createMessage(config.management.listLogChannel, `${owner.username} added ${user.username} (<@${user.id}>)`);
    });

    router.get('/edit', async (req, res) => {
      if (!req.query.id) {
        return res.redirect('/');
      }

      const bot = await db.table('bots').get(req.query.id);

      if (!bot) {
        return res.render('error', { 'error': 'No bots found with that ID' });
      }

      res.render('add', { 'editing': true, ...bot });
    });

    router.post('/edit', async (req, res) => {
      if (!await req.user.isAuthenticated()) {
        return res.redirect('auth/login');
      }

      const validation = this.validateFields(req.body);

      if (!validation) {
        return;
      }

      const { clientId, prefix, shortDesc, longDesc, inviteUrl } = req.body;
      const editedBot = await db.table('bots').get(clientId);

      if (!editedBot) {
        return res.render('error', { 'error': 'You cannot edit a bot that does not exist' });
      }

      const owner = await req.user.id();

      if (owner !== editedBot.owner) {
        return res.render('error', { 'error': 'You are not the owner of that bot' });
      }

      const ownerUser = await bot.fetchUser(owner);

      await db.table('bots').get(clientId).update({
        invite: inviteUrl,
        prefix,
        shortDesc,
        longDesc
      });

      res.redirect(`/bot/${clientId}`);
      bot.createMessage(config.management.listLogChannel, `${ownerUser.username} edited ${editedBot.username} (<@${editedBot.id}>)`);
    });

    router.get('/bot/:id', async (req, res) => {
      const { id } = req.params;

      if (!id) {
        return res.render('error', { 'error': 'The ID you provided is invalid' });
      }

      const botInfo = await db.table('bots').get(req.params.id);

      if (!botInfo) {
        return res.render('error', { 'error': 'Bot not found! Did you mistype the ID?' });
      }

      const currentId = await req.user.id();
      const currentUser = bot.listGuild.members.get(currentId);

      const botOwner = await bot.fetchUser(botInfo.owner)
        || { username: 'Unknown User', discriminator: '0000', id: botInfo.owner };

      botInfo.invite = botInfo.invite || `https://discordapp.com/oauth2/authorize?client_id=${botInfo.id}&scope=bot`;
      botInfo.owner = botOwner;
      botInfo.isWebAdmin = currentUser && currentUser.roles.some(id => id === config.management.websiteAdminRole);
      botInfo.canManageBot = currentId && botOwner.id === currentId || botInfo.isWebAdmin;

      res.render('bot', botInfo);
    });

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

    router.get('/approve', async (req, res) => {
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

      if (!currentUser || !currentUser.roles.some(id => id === config.management.websiteAdminRole)) {
        return res.render('error', { 'error': 'You do not have permission to do that' });
      }

      await db.table('bots').get(req.query.id).update({
        approved: true
      });

      const botOwner = bot.listGuild.members.get(botInfo.owner);

      if (botOwner) {
        await botOwner.addRole(config.management.botDeveloperRole, `${currentUser.username} approved ${botInfo.username}`);
      }

      res.redirect('/');
      bot.createMessage(config.management.listLogChannel, `${currentUser.username} approved ${botInfo.username} (<@${botInfo.id}>)`);
    });

    router.get('/reject', async (req, res) => {
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

      if (!currentUser || !currentUser.roles.some(id => id === config.management.websiteAdminRole)) {
        return res.render('error', { 'error': 'You do not have permission to do that' });
      }

      await db.table('bots').get(req.query.id).delete();
      const botMember = bot.listGuild.members.get(req.query.id);

      if (botMember) {
        await botMember.kick(`Rejected by ${currentUser.username}`);
      }

      res.redirect('/');
      bot.createMessage(config.management.listLogChannel, `${currentUser.username} rejected ${botInfo.username} (<@${botInfo.id}>)`);
    });
  }
}

module.exports = Route;

const config = require('../config');
const db = require('../utils/db');
const validate = require('../utils/payloadValidator');
const express = require('express');

const rejectAllFields = ['invite', 'prefix', 'longDesc', 'discriminator', 'owner', 'additionalOwners', 'approved', 'added'];

class Route {
  static async requireSignIn (req, res, next) {
    if (!await req.user.isAuthenticated()) {
      return res.redirect('/auth/login');
    }

    next();
  }

  static async getAvatar (bot, id) {
    const user = await bot.fetchUser(id) || {};
    return user.avatar || '';
  }

  static configure (server, bot) {
    const router = express.Router();
    server.use('/', router);

    router.get('/', async (req, res) => {
      const data = await db.table('bots').filter({ 'approved': true });

      for (const boat of data) {
        boat.seed = Math.random();
        boat.avatar = await this.getAvatar(bot, boat.id);
      }

      const bots = data.sort((a, b) => a.seed - b.seed).slice(0, 15);

      res.render('index', { bots });
    });

    router.get('/queue', async (req, res) => {
      const bots = await db.table('bots').filter({ 'approved': false }).orderBy('added');

      for (const boat of bots) {
        boat.avatar = await this.getAvatar(bot, boat.id);
      }

      res.render('queue', { bots });
    });

    router.get('/add', this.requireSignIn, async (req, res) => {
      res.render('add');
    });

    router.post('/add', this.requireSignIn, async (req, res) => {
      const validation = validate(req.body, true, res);

      if (!validation) {
        return;
      }

      const { clientId, prefix, shortDesc, longDesc, inviteUrl, owners } = req.body;
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
        additionalOwners: owners.split(' ').filter(e => !!e),
        approved: false,
        added: Date.now()
      });

      res.render('added');
      bot.createMessage(config.management.listLogChannel, `${owner.username} added ${user.username} (<@${user.id}>)`);
    });

    router.get('/profile', this.requireSignIn, async (req, res) => {
      const id = await req.user.id();
      res.redirect(`/user/${id}`);
    });

    router.get('/all', async (req, res) => {
      const bots = await db.table('bots').without(rejectAllFields);

      for (const boat of bots) {
        const u = bot.users.get(boat.id);
        const newAvatar = u ? (u.avatar || u.defaultAvatar) : boat.avatar; // eslint-disable-line
        boat.hasAvatar = u ? u.avatar !== null : true;
        boat.avatar = newAvatar;
      }

      res.render('all', { bots });
    });
  }
}

module.exports = Route;

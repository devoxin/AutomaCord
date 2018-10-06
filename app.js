const { Client } = require('eris');
const WebServer = require('./server');
const config = require('./config');
const db = require('./utils/db');

class Automa extends Client {
  constructor (token, clientOptions) {
    const options = Object.assign({
      getAllUsers: true,
      restMode: true
    }, clientOptions);

    super(token, options);

    this.webServer = new WebServer(this);
  }

  fetchUser (userId) {
    if (!userId || !this.shards.get(0).ready) {
      return null;
    }

    return this.users.get(userId) || this.getRESTUser(userId).catch(() => null);
  }

  get listGuild () {
    return this.guilds.get(config.management.listGuild);
  }

  start () {
    this.connect();

    this.once('ready', () => {
      this.webServer.start();
    });

    this.on('userUpdate', this.avatarUpdateHandler.bind(this));
  }

  async avatarUpdateHandler (newUser, oldUser) {
    if (!newUser.bot) {
      return;
    }

    if (newUser.avatar !== oldUser.avatar) {
      const data = await db.table('bots').get(newUser.id);

      if (!data) {
        return; // wtf
      }

      await db.table('bots').get(newUser.id).update({ avatar: newUser.avatar });
    }
  }
}

const bot = new Automa(config.bot.token);

bot.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.content.startsWith(config.bot.prefix)) {
    return;
  }

  const [command, ...args] = msg.content.slice(config.bot.prefix.length).split(' ');

  if ('ping' === command) {
    msg.channel.createMessage('ponk :ping_pong:');
  }

  if ('queue' === command) {
    const bots = await db.table('bots').filter({ 'approved': false }).orderBy('added').limit(10);
    msg.channel.createMessage({
      embed: {
        title: `First ${bots.length} bots in the queue`,
        description: bots.map(b => `[${b.username}](https://discordapp.com/oauth2/authorize?client_id=${b.id}&scope=bot)`).join('\n') || 'None'
      }
    });
  }

  if ('eval' === command) {
    if ('180093157554388993' !== msg.author.id) {
      return;
    }

    try {
      const res = eval(args.join(' '));
      msg.channel.createMessage(require('util').inspect(res, { depth: 0 }) || 'No result');
    } catch (e) {
      msg.channel.createMessage(e.message);
    }
  }
});

bot.start();

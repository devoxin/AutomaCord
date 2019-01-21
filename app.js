const { Client } = require('eris');
const WebServer = require('./server');
const config = require('./config');
const db = require('./utils/db');

class Automa extends Client {
  constructor (token, clientOptions) {
    const options = {
      ...clientOptions,
      getAllUsers: true,
      restMode: true
    };

    super(token, options);

    this.webServer = new WebServer(this);
  }

  async fetchUser (userId) {
    if (!userId || !this.shards.get(0).ready) {
      return null;
    }

    let user;

    if (!this.users.has(userId)) {
      const restUser = await this.getRESTUser(userId).catch(() => null);

      if (restUser) {
        user = this.users.add(restUser);
      }
    } else {
      user = this.users.get(userId);
    }

    return user;
  }

  get listGuild () {
    return this.guilds.get(config.management.listGuild);
  }

  start () {
    this.connect();

    this.once('ready', () => {
      this.webServer.start();
    });
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

  if ('owner' === command) {
    if (0 === msg.mentions.length) {
      return msg.channel.createMessage('You need to mention a bot.');
    }

    const botId = msg.mentions[0].id;
    const botOwnerId = await db.table('bots').get(botId)('owner').default(false);

    if (!botOwnerId) {
      return msg.channel.createMessage('No bots found with that ID');
    }

    const user = bot.users.get(botOwnerId);

    if (!user) {
      return msg.channel.createMessage('Unknown user.');
    }

    msg.channel.createMessage(`${user.username}#${user.discriminator} (${user.id})`);
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

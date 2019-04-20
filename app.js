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

    db.configure(this);
  }

  async fetchUser (userId, fetch = true) {
    if (!userId || !this.shards.get(0).ready) {
      return null;
    }

    let user;

    if (!this.users.has(userId) && fetch) {
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

  /**
   * Checks the cache for the given user ID, and returns the effective avatar URL, otherwise default.
   * @param {String} userId The ID of the user to get the avatar for.
   * @param {String?} discriminator The discriminator, if applicable.
   * @param {Number} size The desired size of the avatar.
   * @returns {String} The avatar URl for the user.
   */
  getAvatarFor (userId, discriminator = null, size = 512) {
    if (this.users.has(userId)) {
      return this.users.get(userId).dynamicAvatarURL('png', size);
    }

    if (discriminator) {
      return `https://cdn.discordapp.com/embed/avatars/${discriminator % 5}.png`;
    }

    return 'https://cdn.discordapp.com/embed/avatars/1.png';
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

  if (command === 'ping') {
    msg.channel.createMessage('ponk :ping_pong:');
  }

  if (command === 'queue') {
    const bots = await db.table('bots').filter({ approved: false }).orderBy('added').limit(10);
    msg.channel.createMessage({
      embed: {
        title: `First ${bots.length} bots in the queue`,
        description: bots.map(b => `[${b.username}](https://discordapp.com/oauth2/authorize?client_id=${b.id}&scope=bot)`).join('\n') || 'None'
      }
    });
  }

  if (command === 'owner') {
    if (msg.mentions.length === 0) {
      return msg.channel.createMessage('You need to mention a bot.');
    }

    const botId = msg.mentions[0].id;
    const botOwnerId = await db.table('bots').get(botId)('owner').default(false);

    if (!botOwnerId) {
      return msg.channel.createMessage('No bots found with that ID');
    }

    const user = bot.users.get(botOwnerId);

    if (!user) {
      return msg.channel.createMessage(`${botOwnerId} (User not cached/in server.)`);
    }

    msg.channel.createMessage(`${user.username}#${user.discriminator} (${user.id})`);
  }

  if (command === 'eval') {
    if (msg.author.id !== '180093157554388993') {
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

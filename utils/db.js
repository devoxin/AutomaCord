const config = require('../config');
const r = require('rethinkdbdash')({
  db: config.rethink.db
});

class Database {
  constructor () {
    this.bot = null;
  }

  /**
   * Configures the bot instance used for this database instance.
   * @param {require('eris').Client} bot The bot instance to associate with this database instance.
   */
  async configure (bot) {
    this.bot = bot;

    for (const table of ['users', 'bots', 'votes', 'rejected']) {
      if (!await r.tableList().contains(table)) {
        await r.tableCreate(table);
      }
    }
  }

  /**
   * @access private
   */
  patchAvatar (bots) {
    if (Array.isArray(bots)) {
      for (const b of bots) {
        b.avatar = this.bot.getAvatarFor(b.id, b.discriminator);
      }
    } else {
      bots.avatar = this.bot.getAvatarFor(bots.id, bots.discriminator);
    }

    return bots;
  }

  /**
   * @returns {Array<Bot>} A list of bots stored in the database.
   */
  getAllBots () {
    return r.table('bots').run()
      .then(bots => this.patchAvatar(bots));
  }

  getQueuedBots () {
    return r.table('bots').filter({ approved: false }).orderBy('added').run()
      .then(bots => this.patchAvatar(bots));
  }

  getApprovedBots () {
    return r.table('bots').filter({ approved: true }).run()
      .then(bots => this.patchAvatar(bots));
  }

  /**
   * Gets a bot from the database.
   * @param {String} id The id of the bot to get.
   * @returns {Bot?} The bot associated with the given ID, if any.
   */
  getBot (id) {
    return r.table('bots').get(id).default(null).run()
      .then(bot => this.patchAvatar(bot));
  }

  async getBotsOwnedBy (ownerId, includeRejected = false) {
    const bots = await r.table('bots').filter({ owner: ownerId })
      .then(bots => this.patchAvatar(bots));

    if (includeRejected) {
      const rejected = await r.table('rejected').filter({ owner: ownerId })
        .then(bots => this.patchAvatar(bots));

      return { bots, rejected };
    }

    return bots;
  }

  /**
   * Searches the rejected and bot tables for the given bot ID.
   * @param {String} id The id of the bot to find.
   * @returns {Bot?} The bot associated with the given ID, if any.
   */
  async findBot (id) {
    let bot = await this.getBot(id);

    if (!bot) {
      bot = await r.table('rejected').get(id).default(null).run()
        .then(b => {
          if (b) {
            this.patchAvatar(b);
            b.rejected = true;
          }

          return b;
        });
    }

    return bot;
  }

  searchBots (query) {
    return r.table('bots').filter(b => b('username').downcase().match(query).and(b('approved').eq(true))).run()
      .then(bots => this.patchAvatar(bots));
  }

  deleteBot (id) {
    return r.table('bots').get(id).delete().run();
  }

  get table () {
    return r.table.bind(r);
  }

}


/**
 * @typedef {Object} Bot The bot object.
 * @prop {Number} added The time, in milliseconds, that the bot was added to Automacord.
 * @prop {Boolean} approved Whether the bot is approved or not.
 * @prop {String} avatar The avatar of the bot.
 * @prop {String} discriminator The bot's discriminator.
 * @prop {String} id The bot's ID.
 * @prop {String} invite The full invite URL of the bot.
 * @prop {String} longDesc The content of the bot's long description.
 * @prop {String} owner The User ID of the bot owner.
 * @prop {String} prefix The bot's prefix.
 * @prop {String} shortDesc The content of the bot's short description.
 * @prop {String} username The bot's username.
 */

module.exports = new Database();


const { Client } = require('eris');
const WebServer = require('./server');
const config = require('./config');

class Automa extends Client {
  constructor (token, clientOptions) {
    const options = Object.assign({
      restMode: true
    }, clientOptions);

    super(token, options);

    this.webServer = new WebServer(this);
  }

  start () {
    this.webServer.start();
    this.connect();
  }
}

const bot = new Automa(config.bot.token);

bot.on('messageCreate', (msg) => {
  if (msg.author.bot || !msg.content.startsWith(config.bot.prefix)) {
    return;
  }

  const [command, ...args] = msg.content.slice(config.bot.prefix.length).split(' ');

  if ('ping' === command) {
    msg.channel.createMessage('ponk :ping_pong:');
  }
});

bot.start();

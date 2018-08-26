const { Client } = require('eris');
const config = require('./config');

class Automa extends Client {
  constructor(token, clientOptions) {
    super(token, clientOptions);

    this.webServer = require('./server');
  }

  start () {
    this.webServer.start();
    client.connect();
  }
}

const bot = new Automa(config.bot.token);

bot.on('messageCreate', (msg) => {
  if (msg.author.bot || !msg.content.startsWith(config.bot.prefix)) {
    return;
  }

  const [command, ...args] = msg.content.slice(config.bot.prefix).split(' ');

  if (command === 'ping') {
    msg.channel.createMessage('ponk :ping_pong:');
  }
});

bot.start();

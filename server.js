const config = require('./config');
const fs = require('fs');
const express = require('express');
const handlebars = require('express-handlebars');
const bodyParser = require('body-parser');


class WebServer {
  constructor (bot) {
    this.bot = bot;
    this.webServer = express();

    this.webServer.engine('.hbs', handlebars({
      extname: '.hbs',
    }));
    this.webServer.set('view engine', '.hbs');
    this.webServer.use(express.static('views'));
  }

  loadRoutes () {
    const routes = fs.readdirSync('./routes');

    for (const route of routes) {
      const r = require(`./routes/${route}`);
      this.webServer.use(r.path, r.router);

      console.debug('Loaded route ' + r.path);
    }
  }

  start () {
    this.loadRoutes();
    this.webServer.listen(config.web.port);
  }
}

module.exports = WebServer;

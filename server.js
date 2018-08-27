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
    this.webServer.use(bodyParser.urlencoded({ extended: true }));
    this.webServer.use(bodyParser.json());
  }

  loadRoutes () {
    const routes = fs.readdirSync('./routes');

    for (const route of routes) {
      const r = require(`./routes/${route}`);
      r.configure(this.webServer, this.bot);
      console.debug('Loaded route ' + route);
    }
  }

  start () {
    this.loadRoutes();
    this.webServer.listen(config.web.port);
  }
}

module.exports = WebServer;

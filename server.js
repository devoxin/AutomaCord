const config = require('./config');
const fs = require('fs');
const express = require('express');
const { Utils, SafeString } = require('handlebars');
const handlebars = require('express-handlebars');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const getUser = require('./utils/getUser');


class WebServer {
  constructor (bot) {
    this.bot = bot;
    this.webServer = express();

    this.webServer.engine('.hbs', handlebars({
      extname: '.hbs',
      helpers: {
        preserveNewlines: (content) => new SafeString(Utils.escapeExpression(content).replace(/\r\n|\n|\r/gm, '<br>'))
      }
    }));
    this.webServer.set('view engine', '.hbs');
    this.webServer.use(express.static('views'));
    this.webServer.use(bodyParser.urlencoded({ extended: true }));
    this.webServer.use(bodyParser.json());
    this.webServer.use(cookieParser());
    this.webServer.use(getUser);
  }

  loadRoutes () {
    const routes = fs.readdirSync('./routes');

    for (const route of routes) {
      const r = require(`./routes/${route}`);
      r.configure(this.webServer, this.bot);
      console.debug(`Loaded route ${route}`);
    }
  }

  start () {
    this.loadRoutes();
    this.webServer.listen(config.web.port);
  }
}

module.exports = WebServer;

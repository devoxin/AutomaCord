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
      partialsDir: `${__dirname}/views/partials/`,
      helpers: {
        preserveNewlines: (content) => new SafeString(Utils.escapeExpression(content).replace(/\r\n|\n|\r/gm, '<br>')),
        opt: (obj1, obj2) => obj1 || obj2,
        split: (str, chr) => str.split(chr),
        join: (arr, chr) => (arr || []).join(chr)
      }
    }));
    this.webServer.set('view engine', '.hbs');
    this.webServer.use(express.static('views', {
      maxage: '1d'
    }));
    this.webServer.use(bodyParser.urlencoded({ extended: true }));
    this.webServer.use(bodyParser.json());
    this.webServer.use(cookieParser());
    this.webServer.use(getUser);
    this.webServer.use(async (req, res, next) => {
      const currentId = await req.user.id();
      const currentUser = bot.listGuild.members.get(currentId);

      res.locals.signedIn = !!currentUser;

      if (!currentUser) {
        res.locals.cUser = 'Unknown User#0000';
      } else {
        res.locals.cUser = `${currentUser.username}#${currentUser.discriminator}`;
      }

      next();
    });
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
    this.webServer.listen(config.web.port, '127.0.0.1');
  }
}

module.exports = WebServer;

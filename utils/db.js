const config = require('../config');
const r = require('rethinkdbdash')({
  db: config.rethink.db
});

(async function setup () {
  ['users', 'bots', 'votes', 'rejected'].map(async (table) => {
    if (!await r.tableList().contains(table)) {
      await r.tableCreate(table);
    }
  });
})();

module.exports = r;

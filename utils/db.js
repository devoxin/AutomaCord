const config = require('../config');
const r = require('rethinkdbdash');

(async function setup () {
  const { db } = config.rethink;
  const session = r();
  
  if (!session.dbList().contains(db)) {
    await session.dbCreate(db);
  }

  ['users', 'bots'].map(async (table) => {
    if (!await session.db(db).tableList().contains(table)) {
      await session.db(db).tableCreate(table);
    }
  });

  session.getPoolMaster().drain();
})();


module.exports = r({ db: config.rethink.db });

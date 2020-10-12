import knex from "knex";
import booshelf from "bookshelf";

const connection = knex({
  client: 'mysql',
  connection: {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'websocket_api',
    charset: 'utf8'
  }
});

const database = booshelf(connection);

export default database;

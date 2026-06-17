const path = require('path');
const { Sequelize } = require('sequelize');
require('dotenv').config();

const logging = process.env.NODE_ENV === 'development' ? console.log : false;
const databaseUrl = process.env.DATABASE_URL;

let sequelize;

if (databaseUrl && databaseUrl.startsWith('file:')) {
  const storagePath = databaseUrl.replace(/^file:/, '');

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.resolve(process.cwd(), storagePath),
    logging,
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'voz_urbana',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  );
}

module.exports = sequelize;

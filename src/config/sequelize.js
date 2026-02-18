/**
 * Sequelize initialization and connection (PostgreSQL).
 */
import { Sequelize } from 'sequelize';
import pg from 'pg';
import env from './env.js';

const dialectOptions = {
  ssl: {
    require: true,
    rejectUnauthorized: env.SSL_REJECT_UNAUTHORIZED !== false,
  },
};

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: 'postgres',
  dialectModule: pg,
  dialectOptions,
  logging: env.NODE_ENV === 'development' ? (msg) => console.debug(msg) : false,
  define: {
    underscored: false,
    freezeTableName: true,
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
});

export async function testConnection() {
  try {
    await sequelize.authenticate();
    return true;
  } catch (err) {
    throw err;
  }
}

export default sequelize;

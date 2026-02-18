import './config/env.js';
import app from './app.js';
import { sequelize, testConnection } from './config/sequelize.js';
import { registerServerStart } from './controllers/health.controller.js';
import { logger } from './config/logger.js';
import env from './config/env.js';

async function start() {
  try {
    await testConnection();
    await import('./models/index.js');
  } catch (err) {
    logger.error({ err }, 'Database connection failed');
    process.exit(1);
  }

  registerServerStart();

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server listening');
  });

  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutdown signal received');
    server.close(() => {
      logger.info('HTTP server closed');
    });
    try {
      await sequelize.close();
      logger.info('Database connection closed');
    } catch (err) {
      logger.error({ err }, 'Error closing database');
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start');
  process.exit(1);
});

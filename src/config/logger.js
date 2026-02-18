/**
 * Pino logger with redaction for secrets and sensitive headers.
 */
import pino from 'pino';
import env from './env.js';

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
  '*.authorization',
  '*.cookie',
  'SUPABASE_SERVICE_ROLE_KEY',
  'password',
  'secret',
  'token',
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: null,
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;

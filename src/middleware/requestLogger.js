/**
 * pino-http request logging.
 */
import pinoHttp from 'pino-http';
import { logger } from '../config/logger.js';

export function requestLoggerMiddleware() {
  return pinoHttp({
    logger,
    genReqId: (req) => req.id || req.headers['x-request-id'],
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    customErrorMessage: (req, res, err) => err?.message || 'Request error',
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        userId: req.user?.clerkUserId,
        tenant: req.tenant,
      }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  });
}

export default requestLoggerMiddleware;

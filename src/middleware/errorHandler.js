/**
 * Central error handler: application/problem+json.
 */
import env from '../config/env.js';
import { logger } from '../config/logger.js';
import { ApiError, ErrorCodes } from '../utils/errors.js';

export function errorHandler(err, req, res, next) {
  const requestId = req?.id || 'unknown';
  const status = err instanceof ApiError ? err.status : 500;
  const code = err instanceof ApiError ? err.code : ErrorCodes.INTERNAL;
  const title = err instanceof ApiError ? err.message : 'Internal server error';
  const detail = err instanceof ApiError ? err.detail : undefined;

  if (status >= 500) {
    logger.error({ err, requestId, url: req?.url }, err.message);
  } else {
    logger.warn({ requestId, code, title }, 'Client error');
  }

  const payload = {
    type: 'about:blank',
    title,
    status,
    detail: detail ?? (env.NODE_ENV === 'production' ? undefined : err?.message),
    instance: req?.originalUrl,
    requestId,
    code,
  };

  if (env.NODE_ENV !== 'production' && err?.stack) {
    payload.stack = err.stack;
  }

  res.status(status).set('Content-Type', 'application/problem+json').json(payload);
}

export default errorHandler;

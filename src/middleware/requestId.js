/**
 * x-request-id generation and propagation.
 */
import { randomUUID } from 'crypto';

const HEADER = 'x-request-id';

export function requestIdMiddleware(req, res, next) {
  if (!req || !res || typeof next !== 'function') {
    return typeof next === 'function' ? next() : undefined;
  }
  const incoming = typeof req.get === 'function' ? req.get(HEADER) : undefined;
  req.id = incoming && typeof incoming === 'string' ? incoming.trim() : randomUUID();
  if (typeof res.setHeader === 'function') {
    res.setHeader(HEADER, req.id);
  }
  next();
}

export default requestIdMiddleware;

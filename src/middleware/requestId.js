/**
 * x-request-id generation and propagation.
 */
import { randomUUID } from 'crypto';

const HEADER = 'x-request-id';

export function requestIdMiddleware(req, res, next) {
  const incoming = req.get(HEADER);
  req.id = incoming && typeof incoming === 'string' ? incoming.trim() : randomUUID();
  res.setHeader(HEADER, req.id);
  next();
}

export default requestIdMiddleware;

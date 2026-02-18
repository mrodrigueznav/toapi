/**
 * Helmet, CORS allowlist, and trust-proxy helpers.
 */
import helmet from 'helmet';
import cors from 'cors';
import env from './env.js';

export function helmetMiddleware() {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });
}

export function corsMiddleware() {
  const raw = (env.CORS_ORIGINS || '').trim();
  if (raw === '*') {
    return cors({
      origin: true,
      credentials: false,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-empresa-id', 'x-sucursal-id', 'x-idempotency-key'],
    });
  }
  const origins = env.CORS_ORIGINS_LIST;
  if (origins.length === 0) {
    return cors({ origin: false, credentials: false });
  }
  return cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origins.includes(origin)) return cb(null, true);
      cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-empresa-id', 'x-sucursal-id', 'x-idempotency-key'],
  });
}

export function getTrustProxy() {
  return env.TRUST_PROXY === true;
}

export default { helmetMiddleware, corsMiddleware, getTrustProxy };

/**
 * Global and endpoint-specific rate limiters.
 */
import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

const windowMs = env.RATE_LIMIT_WINDOW_MS;
const max = env.RATE_LIMIT_MAX;
const xmlMax = env.XML_RATE_LIMIT_MAX;
const adminMax = env.ADMIN_RATE_LIMIT_MAX;

export const globalLimiter = rateLimit({
  windowMs,
  max,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.id || req.ip || 'unknown',
});

export const xmlPreviewLimiter = rateLimit({
  windowMs,
  max: xmlMax,
  message: { error: 'Too many preview requests' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user ? req.user.id : req.ip) || 'unknown',
});

export const adminLimiter = rateLimit({
  windowMs,
  max: adminMax,
  message: { error: 'Too many admin requests' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user ? req.user.id : req.ip) || 'unknown',
});

export default { globalLimiter, xmlPreviewLimiter, adminLimiter };

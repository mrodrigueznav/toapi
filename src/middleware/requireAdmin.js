/**
 * requireAdmin: enforce isAdmin and active user (use after requireAuth).
 */
import { ApiError, ErrorCodes } from '../utils/errors.js';

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return next(new ApiError(401, ErrorCodes.AUTH_REQUIRED, 'Authentication required'));
  }
  if (!req.user.isAdmin) {
    return next(new ApiError(403, ErrorCodes.FORBIDDEN, 'Admin access required'));
  }
  next();
}

export default requireAdmin;

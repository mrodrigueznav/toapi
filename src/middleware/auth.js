/**
 * requireAuth: validate Clerk JWT and attach DB user.
 */
import { verifyClerkToken } from '../config/clerk.js';
import { ApiError, ErrorCodes } from '../utils/errors.js';
import { getUserByClerkUserId } from '../repositories/user.repo.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, ErrorCodes.AUTH_REQUIRED, 'Authorization required');
    }
    const token = authHeader.slice(7).trim();
    const payload = await verifyClerkToken(token);
    const user = await getUserByClerkUserId(payload.sub);
    if (!user) {
      throw new ApiError(403, ErrorCodes.AUTH_INVALID, 'User not provisioned');
    }
    if (!user.isActive) {
      throw new ApiError(403, ErrorCodes.USER_INACTIVE, 'User is deactivated');
    }
    req.auth = { clerkUserId: payload.sub, email: payload.email };
    req.user = user;
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    if (err.code === 'ERR_JWT_EXPIRED' || err.message?.includes('jwt')) {
      return next(new ApiError(401, ErrorCodes.AUTH_INVALID, 'Invalid or expired token'));
    }
    next(err);
  }
}

export default requireAuth;

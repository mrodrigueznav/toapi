/**
 * requireAuth: validate Clerk JWT and attach DB user.
 * When NODE_ENV is developmentx, auth is skipped and a mock admin user is attached.
 */
import env from '../config/env.js';
import { verifyClerkToken } from '../config/clerk.js';
import { ApiError, ErrorCodes } from '../utils/errors.js';
import { getUserByClerkUserId } from '../repositories/user.repo.js';

const DEVX_MOCK_USER = {
  id: 'devx-mock-user-id',
  clerkUserId: 'devx-mock-clerk',
  email: 'devx@local',
  isAdmin: true,
  isActive: true,
};

export async function requireAuth(req, res, next) {
  if (env.NODE_ENV === 'developmentx') {
    req.auth = { clerkUserId: DEVX_MOCK_USER.clerkUserId, email: DEVX_MOCK_USER.email };
    req.user = DEVX_MOCK_USER;
    return next();
  }
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

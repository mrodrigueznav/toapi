/**
 * 404 for unknown routes.
 */
import { ApiError, ErrorCodes } from '../utils/errors.js';

export function notFound(req, res, next) {
  next(new ApiError(404, ErrorCodes.NOT_FOUND, 'Not found'));
}

export default notFound;

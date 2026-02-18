/**
 * Zod validation middleware: body, query, params, headers.
 */
import { ApiError, ErrorCodes } from '../utils/errors.js';

export function validate(schemas = {}) {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Validation failed', result.error.flatten());
        }
        req.body = result.data;
      }
      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid query', result.error.flatten());
        }
        req.query = result.data;
      }
      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid params', result.error.flatten());
        }
        req.params = result.data;
      }
      if (schemas.headers) {
        const result = schemas.headers.safeParse(req.headers);
        if (!result.success) {
          throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid headers', result.error.flatten());
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export default validate;

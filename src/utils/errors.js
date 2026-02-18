/**
 * ApiError and error codes for problem+json responses.
 */
export const ErrorCodes = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  USER_INACTIVE: 'USER_INACTIVE',
  FORBIDDEN: 'FORBIDDEN',
  TENANT_INVALID: 'TENANT_INVALID',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  STORAGE_UPLOAD_FAILED: 'STORAGE_UPLOAD_FAILED',
  DB_ERROR: 'DB_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL: 'INTERNAL',
};

export class ApiError extends Error {
  constructor(status, code, message, detail = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export default ApiError;

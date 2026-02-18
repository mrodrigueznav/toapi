/**
 * Idempotency key parsing from headers.
 */
export const IDEMPOTENCY_HEADER = 'x-idempotency-key';

export function getIdempotencyKey(req) {
  const raw = req.get(IDEMPOTENCY_HEADER);
  if (!raw || typeof raw !== 'string') return null;
  return raw.trim() || null;
}

export default { getIdempotencyKey, IDEMPOTENCY_HEADER };

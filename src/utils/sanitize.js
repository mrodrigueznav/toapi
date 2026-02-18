/**
 * Sanitization helpers (trim, normalize strings).
 */
export function trimString(value) {
  if (value == null) return null;
  if (typeof value !== 'string') return value;
  return value.trim();
}

export function normalizeEmail(value) {
  const s = trimString(value);
  if (!s) return null;
  return s.toLowerCase();
}

export default { trimString, normalizeEmail };

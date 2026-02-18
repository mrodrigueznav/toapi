/**
 * Clerk JWT verification using jose + JWKS.
 * Sign-in only; no in-app sign-up.
 */
import * as jose from 'jose';
import env from './env.js';

let cachedJwks = null;
let cachedJwksExpiry = 0;
const JWKS_CACHE_MS = 60000;

async function getJwks() {
  if (cachedJwks && Date.now() < cachedJwksExpiry) {
    return cachedJwks;
  }
  const res = await fetch(env.CLERK_JWKS_URL);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  cachedJwks = jose.createRemoteJWKSet(new URL(env.CLERK_JWKS_URL), { cache: true });
  cachedJwksExpiry = Date.now() + JWKS_CACHE_MS;
  return cachedJwks;
}

/**
 * Verify Bearer JWT and return payload.
 * @param {string} token - Raw token (without "Bearer " prefix)
 * @returns {Promise<{ sub: string, email?: string }>}
 */
export async function verifyClerkToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Missing or invalid token');
  }
  const jwks = await getJwks();
  const options = {
    algorithms: ['RS256'],
  };
  if (env.CLERK_ISSUER) options.issuer = env.CLERK_ISSUER;
  if (env.CLERK_AUDIENCE) options.audience = env.CLERK_AUDIENCE;

  const { payload } = await jose.jwtVerify(token, jwks, options);
  const sub = payload.sub;
  const email = payload.email ?? payload.preferred_username ?? payload.email_address;
  return { sub, email: typeof email === 'string' ? email : undefined };
}

export default { verifyClerkToken };

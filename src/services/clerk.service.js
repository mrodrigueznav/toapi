/**
 * Clerk Backend API: create users (used by admin).
 * Requires CLERK_SECRET_KEY. See https://clerk.com/docs/reference/backend-api
 */
import env from '../config/env.js';

const CLERK_API_BASE = 'https://api.clerk.com/v1';

function getAuthHeader() {
  const key = env.CLERK_SECRET_KEY;
  if (!key || !key.startsWith('sk_')) {
    throw new Error('CLERK_SECRET_KEY is required for creating users');
  }
  return { Authorization: `Bearer ${key}` };
}

/**
 * Create a user in Clerk (username-based sign-in).
 * @param {{ username: string, password?: string, firstName?: string, lastName?: string, email?: string }} opts
 * @returns {Promise<{ id: string, username: string, email?: string }>} Clerk user id and username
 */
export async function createClerkUser(opts) {
  const { username, password, firstName, lastName, email } = opts;
  if (!username || typeof username !== 'string' || !username.trim()) {
    throw new Error('username is required');
  }
  const body = {
    username: username.trim(),
    first_name: firstName?.trim() || undefined,
    last_name: lastName?.trim() || undefined,
  };
  if (email != null && String(email).trim()) {
    body.email_address = [String(email).trim().toLowerCase()];
  }
  if (password != null && String(password).length >= 8) {
    body.password = String(password);
  }
  const res = await fetch(`${CLERK_API_BASE}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    let message = `Clerk API error ${res.status}`;
    try {
      const j = JSON.parse(errBody);
      if (j.errors?.[0]?.message) message = j.errors[0].message;
      else if (j.message) message = j.message;
    } catch {
      if (errBody) message += `: ${errBody.slice(0, 200)}`;
    }
    throw new Error(message);
  }
  const data = await res.json();
  const primaryEmail = data.email_addresses?.length
    ? data.email_addresses.find((e) => e.id === data.primary_email_address_id)?.email_address ?? data.email_addresses[0]?.email_address
    : undefined;
  return { id: data.id, username: data.username ?? username.trim(), email: primaryEmail };
}

export default { createClerkUser };

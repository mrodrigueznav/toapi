/**
 * Environment loading, validation, and defaults. Fail-fast on missing required vars.
 * En Azure: App Service > Configuration > Application settings.
 */
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Requerido y no vacío; en Azure las vars no definidas o vacías fallan con mensaje claro
function requiredString(msg) {
  return z.preprocess(
    (v) => (v === '' || v == null ? undefined : String(v).trim()),
    z.string({ required_error: msg }).min(1, msg)
  );
}
function requiredUrl(msg) {
  return z.preprocess(
    (v) => (v === '' || v == null ? undefined : String(v).trim()),
    z
      .string({ required_error: msg })
      .min(1, msg)
      .refine((s) => {
        try {
          new URL(s);
          return true;
        } catch {
          return false;
        }
      }, { message: msg })
  );
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'developmentx', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1)).default('3000'),
  DATABASE_URL: requiredString('DATABASE_URL is required'),
  SUPABASE_URL: requiredUrl('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: requiredString('SUPABASE_SERVICE_ROLE_KEY is required'),
  STORAGE_BUCKET: z.string().default('tohuanti'),
  // Clerk
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_JWKS_URL: requiredUrl('CLERK_JWKS_URL is required'),
  CLERK_ISSUER: z.string().optional(),
  CLERK_AUDIENCE: z.string().optional(),
  // HTTP / security
  CORS_ORIGINS: z.string().default(''),
  TRUST_PROXY: z.string().optional().transform(v => v === 'true' || v === '1'),
  BODY_LIMIT: z.string().default('2mb'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().positive()).default('60000'),
  RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number().int().min(1)).default('100'),
  XML_RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number().int().min(1)).default('20'),
  ADMIN_RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number().int().min(1)).default('50'),
  SIGNED_URL_EXPIRES_IN: z.string().default('3600'),
  SSL_REJECT_UNAUTHORIZED: z.string().optional().transform(v => v !== 'false'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  // Seed / bootstrap
  CLERK_ADMIN_USER_ID: z.string().optional(),
  CLERK_ADMIN_EMAIL: z.string().email().optional(),
});

function parseBodyLimit(value) {
  if (typeof value !== 'string') return 2 * 1024 * 1024;
  const match = value.match(/^(\d+)(mb|kb)?$/i);
  if (!match) return 2 * 1024 * 1024;
  const num = parseInt(match[1], 10);
  const unit = (match[2] || 'mb').toLowerCase();
  if (unit === 'kb') return num * 1024;
  return num * 1024 * 1024;
}

let env;
try {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    console.error('Environment validation failed:', flat.fieldErrors);
    const missing = Object.keys(flat.fieldErrors || {}).filter((k) => (flat.fieldErrors[k] || []).length > 0);
    if (missing.length > 0) {
      console.error('Missing or invalid:', missing.join(', '));
      if (process.env.WEBSITE_SITE_NAME) {
        console.error('Azure: set these in App Service > Configuration > Application settings (npm run azure:env:set -- <webapp-name>)');
      }
    }
    process.exit(1);
  }
  env = parsed.data;
  env.BODY_LIMIT_BYTES = parseBodyLimit(env.BODY_LIMIT);
  env.CORS_ORIGINS_LIST = env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean) : [];
} catch (err) {
  console.error('Failed to load env:', err);
  process.exit(1);
}

export default env;

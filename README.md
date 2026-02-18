# tohuanti-api

Production-grade, enterprise-ready backend API for Tohuanti: multi-tenant captura management with two-phase confirmation, Clerk auth, Supabase Storage, and PostgreSQL.

## Stack

- **Runtime:** Node.js 22+
- **Framework:** Express.js (ESM)
- **ORM:** Sequelize (PostgreSQL)
- **Database:** Supabase Postgres (standard connection string; no Supabase JS for DB)
- **Storage:** Supabase Storage (`@supabase/supabase-js`, service-role, server-side only)
- **Auth:** Clerk (sign-in only; users provisioned by admins)
- **Security:** helmet, CORS allowlist, rate limiting, request IDs, structured logs, redaction, problem+json errors

## Project structure

```
/src
  app.js, server.js
  /config       env, logger, sequelize, supabase, clerk, security
  /middleware   requestId, requestLogger, auth, requireAdmin, tenantContext, rateLimit, validate, notFound, errorHandler
  /models       Empresa, Sucursal, User, UserEmpresa, UserSucursal, Captura, AuditLog
  /repositories empresa, sucursal, user, captura, audit
  /services     access, xmlParser, storage, captura, admin, audit
  /controllers  health, me, catalog, captura, admin
  /routes       health, me, catalog, capturas, admin
  /utils        asyncHandler, errors, dates, idempotency, sanitize
/migrations     Custom ESM migration runner + migration files
/scripts        migrate.js, seed.js
/tests          Basic supertest test for /health
```

## Environment variables

### Required

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development`, `production`, or `test` |
| `PORT` | Server port (default 3000) |
| `DATABASE_URL` | PostgreSQL connection string (Supabase: Settings → Database → Connection string, use Transaction pooler or Direct) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only; never expose to client) |
| `STORAGE_BUCKET` | Storage bucket name (default `tohuanti`) |
| `CLERK_JWKS_URL` | Clerk JWKS URL (e.g. `https://<frontend-api>.clerk.accounts.dev/.well-known/jwks.json`) |

### Optional

| Variable | Description |
|----------|-------------|
| `CLERK_ISSUER` | Clerk JWT issuer (for strict verification) |
| `CLERK_AUDIENCE` | Clerk JWT audience |
| `CORS_ORIGINS` | Comma-separated allowed origins (e.g. `https://app.example.com`) |
| `TRUST_PROXY` | Set to `true` or `1` behind reverse proxy |
| `BODY_LIMIT` | JSON body limit (default `2mb`; does not apply to multipart) |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (default 60000) |
| `RATE_LIMIT_MAX` | Global max requests per window (default 100) |
| `XML_RATE_LIMIT_MAX` | Preview XML endpoint max (default 20) |
| `ADMIN_RATE_LIMIT_MAX` | Admin routes max (default 50) |
| `SIGNED_URL_EXPIRES_IN` | Signed URL expiry seconds (default 3600) |
| `SSL_REJECT_UNAUTHORIZED` | Set to `false` only for local Postgres without SSL |
| `LOG_LEVEL` | Pino level: trace, debug, info, warn, error, fatal |
| `CLERK_ADMIN_USER_ID` | Clerk user ID for initial admin (used by seed) |
| `CLERK_ADMIN_EMAIL` | Email for initial admin (used by seed) |

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Create a `.env` file with required variables (see above). For Supabase Postgres use the connection string from Project Settings → Database. For Clerk, use the JWKS URL from your Clerk application (sign-in only; no sign-up in app).

3. **Run migrations**

   ```bash
   npm run migrate
   ```

   Uses the custom ESM migration runner in `scripts/migrate.js`; applies all pending migrations from `migrations/` in filename order.

4. **Seed (optional)**

   ```bash
   npm run seed
   ```

   Creates an initial admin user (using `CLERK_ADMIN_USER_ID` and `CLERK_ADMIN_EMAIL`), sample empresas/sucursales, and assigns the admin to them. If `CLERK_ADMIN_USER_ID` is not set, a placeholder admin is created for local dev.

5. **Start**

   ```bash
   npm run dev    # nodemon
   npm start      # production
   ```

## API base and endpoints

Base path: **`/api/v1`**

- **GET /health** – Health check (`status`, `time`, `requestId`, `version`)
- **GET /metrics** – Lightweight metrics (uptime, memory, request count)
- **GET /me** – Current user (auth required): `clerkUserId`, `email`, `isAdmin`, `empresas`, `sucursalesByEmpresa`
- **GET /catalog/empresas** – List empresas (auth; admin: all, user: assigned)
- **GET /catalog/empresas/:empresaId/sucursales** – List sucursales for empresa (auth; tenant access rules)
- **POST /capturas/preview-xml** – Phase 1: parse XML, return extracted data (auth + tenant headers; no persistence)
- **POST /capturas/commit** – Phase 2: upload 5 files, create captura (auth + tenant; optional `x-idempotency-key`)
- **GET /capturas/recent** – List capturas with filters (auth; admin: all, user: accessible only)
- **GET /capturas/:id** – Get one captura (auth; tenant access)
- **Admin routes** (auth + admin): empresas, sucursales, users, assignments, audit log

All tenant-scoped requests require headers: **`x-empresa-id`**, **`x-sucursal-id`** (UUIDs).

Errors use **`application/problem+json`** with `type`, `title`, `status`, `detail`, `instance`, `requestId`, `code`.

## Example requests

### Health

```bash
curl -i http://localhost:3000/api/v1/health
```

### Preview XML (JSON)

```bash
curl -X POST http://localhost:3000/api/v1/capturas/preview-xml \
  -H "Authorization: Bearer <CLERK_JWT>" \
  -H "x-empresa-id: <UUID>" \
  -H "x-sucursal-id: <UUID>" \
  -H "Content-Type: application/json" \
  -d '{"tipoSUA":"IMSS","xmlText":"<root>...</root>"}'
```

### Preview XML (multipart)

```bash
curl -X POST http://localhost:3000/api/v1/capturas/preview-xml \
  -H "Authorization: Bearer <CLERK_JWT>" \
  -H "x-empresa-id: <UUID>" \
  -H "x-sucursal-id: <UUID>" \
  -F "tipoSUA=IMSS" \
  -F "xmlFile=@/path/to/file.xml"
```

### Commit (multipart, 5 files)

```bash
curl -X POST http://localhost:3000/api/v1/capturas/commit \
  -H "Authorization: Bearer <CLERK_JWT>" \
  -H "x-empresa-id: <UUID>" \
  -H "x-sucursal-id: <UUID>" \
  -H "x-idempotency-key: optional-key-123" \
  -F "tipoSUA=IMSS" \
  -F "data={\"periodo\":\"2025-01\",\"rfc\":\"..."}" \
  -F "paymentImage=@payment.png" \
  -F "suaFile=@sua.txt" \
  -F "wordDoc=@doc.docx" \
  -F "pdfDoc=@doc.pdf" \
  -F "xmlFile=@file.xml"
```

### Admin: create empresa

```bash
curl -X POST http://localhost:3000/api/v1/admin/empresas \
  -H "Authorization: Bearer <ADMIN_CLERK_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Mi Empresa"}'
```

## Architecture overview

- **Layers:** routes → controllers → services → repositories/models. Clear boundaries; no business logic in routes.
- **Two-phase captura:** Preview returns parsed data only (no DB, no storage). Commit uploads all 5 files to Supabase Storage, then creates the Captura record; on upload failure, already-uploaded files are removed and no record is created.
- **Tenant access:** Admin sees all. Non-admin must have UserEmpresa; if no UserSucursal for that empresa, they see all sucursales of that empresa; otherwise only assigned sucursales.
- **Idempotency:** Optional header `x-idempotency-key` on commit; same actor + tenant + key returns the existing captura.
- **File handling:** No application-level file size limit. Multer streams to `/tmp`, then files are uploaded to Supabase and temp files deleted. **Infrastructure limits:** reverse proxies (nginx, Netlify, Azure App Service, etc.) may impose a max request body size; configure them (e.g. `client_max_body_size` in nginx) if you need to allow very large uploads.

## Tests

```bash
npm test
```

Runs the health check test (minimal app that matches the `/api/v1/health` response contract; does not require DB or Clerk).

## Graceful shutdown

On `SIGTERM`/`SIGINT`, the server stops accepting new connections and closes the database pool before exiting.

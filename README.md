# tohuanti-api

API backend lista para producción para Tohuanti: gestión multi-tenant de capturas con confirmación en dos fases, autenticación con Clerk, almacenamiento en Supabase y PostgreSQL.

## Stack

- **Runtime:** Node.js 22+
- **Framework:** Express.js (ESM)
- **ORM:** Sequelize (PostgreSQL)
- **Base de datos:** Supabase Postgres (cadena de conexión estándar; no se usa Supabase JS para la DB)
- **Almacenamiento:** Supabase Storage (`@supabase/supabase-js`, service-role, solo servidor)
- **Auth:** Clerk (solo inicio de sesión; los usuarios los crean los admins)
- **Seguridad:** helmet, lista blanca CORS, rate limiting, request IDs, logs estructurados, redacción de datos sensibles, errores en problem+json

## Estructura del proyecto

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
/migrations     Runner ESM de migraciones + archivos de migración
/scripts        migrate.js, seed.js
/tests          Test básico con supertest para /health
```

## Variables de entorno

### Requeridas

| Variable | Descripción |
|----------|-------------|
| `NODE_ENV` | `development`, `production` o `test` |
| `PORT` | Puerto del servidor (por defecto 3000) |
| `DATABASE_URL` | Cadena de conexión PostgreSQL (Supabase: Ajustes → Database → Connection string; Transaction pooler o Direct) |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (service role) de Supabase; solo servidor, no exponer al cliente |
| `STORAGE_BUCKET` | Nombre del bucket de Storage (por defecto `tohuanti`) |
| `CLERK_JWKS_URL` | URL JWKS de Clerk (ej. `https://<frontend-api>.clerk.accounts.dev/.well-known/jwks.json`) |

### Opcionales

| Variable | Descripción |
|----------|-------------|
| `CLERK_PUBLISHABLE_KEY` | Clave pública de Clerk |
| `CLERK_SECRET_KEY` | Clave secreta de Clerk |
| `CLERK_ISSUER` | Issuer del JWT de Clerk (verificación estricta) |
| `CLERK_AUDIENCE` | Audience del JWT de Clerk |
| `CORS_ORIGINS` | Orígenes permitidos separados por comas (ej. `https://app.ejemplo.com`) |
| `TRUST_PROXY` | Poner `true` o `1` si hay proxy inverso delante |
| `BODY_LIMIT` | Límite del body JSON (por defecto `2mb`; no aplica a multipart) |
| `RATE_LIMIT_WINDOW_MS` | Ventana del rate limit en ms (por defecto 60000) |
| `RATE_LIMIT_MAX` | Máximo global de peticiones por ventana (por defecto 100) |
| `XML_RATE_LIMIT_MAX` | Máximo para el endpoint de preview XML (por defecto 20) |
| `ADMIN_RATE_LIMIT_MAX` | Máximo para rutas de admin (por defecto 50) |
| `SIGNED_URL_EXPIRES_IN` | Segundos de validez de las URLs firmadas (por defecto 3600) |
| `SSL_REJECT_UNAUTHORIZED` | Poner `false` solo si usas Postgres local sin SSL válido |
| `LOG_LEVEL` | Nivel de Pino: trace, debug, info, warn, error, fatal |
| `CLERK_ADMIN_USER_ID` | ID de usuario Clerk del admin inicial (usado por seed) |
| `CLERK_ADMIN_EMAIL` | Email del admin inicial (usado por seed) |

## Configuración

1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **Configurar entorno**

   Crea un archivo `.env` con las variables requeridas (ver arriba). Para Supabase Postgres usa la cadena de conexión de Ajustes del proyecto → Database. Para Clerk, usa la URL JWKS de tu aplicación Clerk (solo inicio de sesión; sin registro en la app).

3. **Ejecutar migraciones**

   ```bash
   npm run migrate
   ```

   Usa el runner ESM en `scripts/migrate.js`; aplica las migraciones pendientes de `migrations/` en orden por nombre de archivo.

4. **Seed (opcional)**

   ```bash
   npm run seed
   ```

   Crea un usuario admin inicial (con `CLERK_ADMIN_USER_ID` y `CLERK_ADMIN_EMAIL`), empresas/sucursales de ejemplo y asigna el admin a ellas. Si no se define `CLERK_ADMIN_USER_ID`, se crea un admin de prueba para desarrollo local.

5. **Arrancar**

   ```bash
   npm run dev    # nodemon
   npm start      # producción
   ```

## Base y endpoints de la API

Ruta base: **`/api/v1`**

- **GET /health** – Comprobación de estado (`status`, `time`, `requestId`, `version`)
- **GET /metrics** – Métricas ligeras (uptime, memoria, número de peticiones)
- **GET /me** – Usuario actual (requiere auth): `clerkUserId`, `email`, `isAdmin`, `empresas`, `sucursalesByEmpresa`
- **GET /catalog/empresas** – Listar empresas (auth; admin: todas, usuario: asignadas)
- **GET /catalog/empresas/:empresaId/sucursales** – Listar sucursales de una empresa (auth; reglas de tenant)
- **POST /capturas/preview-xml** – Fase 1: parsear XML y devolver datos extraídos (auth + cabeceras de tenant; sin persistir)
- **POST /capturas/commit** – Fase 2: subir 5 archivos y crear captura (auth + tenant; opcional `x-idempotency-key`)
- **GET /capturas/recent** – Listar capturas con filtros (auth; admin: todas, usuario: solo accesibles)
- **GET /capturas/:id** – Obtener una captura (auth; acceso por tenant)
- **Rutas de admin** (auth + admin): empresas, sucursales, usuarios, asignaciones, log de auditoría

Las peticiones con tenant requieren las cabeceras **`x-empresa-id`** y **`x-sucursal-id`** (UUIDs).

Los errores se devuelven en **`application/problem+json`** con `type`, `title`, `status`, `detail`, `instance`, `requestId`, `code`.

## Ejemplos de peticiones

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
  -F "xmlFile=@/ruta/al/archivo.xml"
```

### Commit (multipart, 5 archivos)

```bash
curl -X POST http://localhost:3000/api/v1/capturas/commit \
  -H "Authorization: Bearer <CLERK_JWT>" \
  -H "x-empresa-id: <UUID>" \
  -H "x-sucursal-id: <UUID>" \
  -H "x-idempotency-key: clave-opcional-123" \
  -F "tipoSUA=IMSS" \
  -F "data={\"periodo\":\"2025-01\",\"rfc\":\"...\"}" \
  -F "paymentImage=@pago.png" \
  -F "suaFile=@sua.txt" \
  -F "wordDoc=@doc.docx" \
  -F "pdfDoc=@doc.pdf" \
  -F "xmlFile=@archivo.xml"
```

### Admin: crear empresa

```bash
curl -X POST http://localhost:3000/api/v1/admin/empresas \
  -H "Authorization: Bearer <ADMIN_CLERK_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Mi Empresa"}'
```

## Resumen de arquitectura

- **Capas:** routes → controllers → services → repositories/models. Límites claros; sin lógica de negocio en rutas.
- **Captura en dos fases:** Preview solo devuelve datos parseados (sin DB ni storage). Commit sube los 5 archivos a Supabase Storage, crea el registro Captura y, si falla alguna subida, borra los ya subidos y no crea registro.
- **Acceso por tenant:** El admin ve todo. Un usuario no admin debe tener UserEmpresa; si no tiene UserSucursal para esa empresa, ve todas las sucursales de esa empresa; si tiene, solo las asignadas.
- **Idempotencia:** Cabecera opcional `x-idempotency-key` en commit; mismo actor + tenant + clave devuelve la captura ya existente.
- **Archivos:** No hay límite de tamaño a nivel de aplicación. Multer escribe en `/tmp`, luego se suben a Supabase y se borran los temporales. **Límites de infraestructura:** proxies inversos (nginx, Netlify, Azure App Service, etc.) pueden imponer un tamaño máximo de request; configúralos (ej. `client_max_body_size` en nginx) si necesitas subidas muy grandes.

## Tests

```bash
npm test
```

Ejecuta el test de health (app mínima que cumple el contrato de `/api/v1/health`; no requiere DB ni Clerk).

## Cierre ordenado

Con `SIGTERM`/`SIGINT`, el servidor deja de aceptar conexiones y cierra el pool de la base de datos antes de salir.

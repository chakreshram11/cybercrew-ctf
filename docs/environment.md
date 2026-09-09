# Environment Variables Specification (Section 94)

## 1. Overview
All environment variables are loaded from `.env` in the root directory. Never commit `.env` to Git. Use `.env.example` as the canonical template.

---

## 2. Variables Catalog

### Core Platform
- `NODE_ENV`: Application environment (`development` | `production` | `test`).
- `PORT`: Backend HTTP port (default: `4000`).
- `FRONTEND_URL`: Public web address of the frontend (e.g. `https://ctf.cybercrew.online`).
- `CORS_ORIGIN`: Allowed origins for cross-origin requests.

### Supabase Platform (Backend Only - Highly Sensitive)
- `SUPABASE_URL`: Target Supabase project API URL (`https://<project>.supabase.co`).
- `SUPABASE_ANON_KEY`: Public anonymous key.
- `SUPABASE_SERVICE_ROLE_KEY`: Administrative service role key (Bypasses RLS, used strictly on NestJS backend).
- `SUPABASE_JWT_SECRET`: Secret used to verify client JWT session tokens.
- `DATABASE_URL`: PostgreSQL connection string (Transaction pooler on port 6543).
- `DIRECT_URL`: Direct PostgreSQL connection string (Session mode on port 5432 for migrations).

### Cryptographic Security (Backend Only)
- `FLAG_SECRET_SALT`: High-entropy secret salt (min. 32 characters) used to key HMAC-SHA256 blind flag hashing.
- `THROTTLE_TTL`: Rate limit window in seconds (default: `60`).
- `THROTTLE_LIMIT`: Max requests per window (default: `60`).
- `SUBMISSION_THROTTLE_TTL`: Window for flag submissions (default: `60`).
- `SUBMISSION_THROTTLE_LIMIT`: Max flag attempts per minute (default: `10`).

### Frontend Public (Vite)
- `VITE_SUPABASE_URL`: Public Supabase URL.
- `VITE_SUPABASE_ANON_KEY`: Public anonymous key.
- `VITE_API_URL`: Backend REST API base path (e.g. `/api/v1`).
- `VITE_APP_NAME`: Platform branding display title.

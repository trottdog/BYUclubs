# BYUclubs

Local development guide for the BYUclubs monorepo.

## Stack

- Frontend: Vite + React
- Backend: Express
- Database: Postgres / Supabase
- Package manager: `pnpm`

## Prerequisites

- Node.js 20+
- `pnpm`
- A Postgres database or Supabase project

## 1. Install dependencies

From the repo root:

```bash
pnpm install
```

## 2. Configure environment variables

The backend requires a database connection string.

Set these environment variables in your shell before running the app:

```bash
export DATABASE_URL="your-postgres-connection-string"
export SESSION_SECRET="replace-this-with-a-random-secret"
```

Notes:

- If you are using Supabase, use the exact connection string from the Supabase dashboard.
- For Vercel/serverless-style behavior, the Supabase transaction pooler URL is the best choice.

## 3. Load the schema into the database

This project includes a schema + seed file at:

[`byuconnect_schema_and_seed.sql`](/Users/natemacbook/Desktop/IS%20401%20Final/Campus-Connect-Hub/byuconnect_schema_and_seed.sql)

Apply it with:

```bash
psql "$DATABASE_URL" -f byuconnect_schema_and_seed.sql
```

You can also use Drizzle if needed, but the SQL file is the easiest way to get the expected schema and seed data locally.

## 4. Run the backend

Open a terminal at the repo root and run:

```bash
PORT=3000 pnpm --filter @workspace/api-server run dev
```

The API will be available at:

```text
http://localhost:3000
```

## 5. Run the frontend

Open a second terminal at the repo root and run:

```bash
PORT=5173 pnpm --filter @workspace/byu-connect run dev
```

The frontend will be available at:

```text
http://localhost:5173
```

The Vite dev server is configured to proxy `/api` requests to `http://127.0.0.1:3000`, so the frontend and backend work together locally.

## 6. Test the app

Useful endpoints to verify the backend is working:

- `http://localhost:3000/api/healthz`
- `http://localhost:3000/api/healthz/db`
- `http://localhost:3000/api/events`
- `http://localhost:3000/api/clubs`

Then open:

- `http://localhost:5173`

## Helpful commands

Build the whole workspace:

```bash
pnpm build
```

Typecheck:

```bash
pnpm typecheck
```

Push Drizzle schema changes:

```bash
pnpm --filter @workspace/db run push
```

## Workspace layout

- [`artifacts/byu-connect`](/Users/natemacbook/Desktop/IS%20401%20Final/Campus-Connect-Hub/artifacts/byu-connect): frontend app
- [`artifacts/api-server`](/Users/natemacbook/Desktop/IS%20401%20Final/Campus-Connect-Hub/artifacts/api-server): backend app
- [`lib/db`](/Users/natemacbook/Desktop/IS%20401%20Final/Campus-Connect-Hub/lib/db): shared database schema and DB client
- [`lib/api-zod`](/Users/natemacbook/Desktop/IS%20401%20Final/Campus-Connect-Hub/lib/api-zod): shared API schemas
- [`lib/api-client-react`](/Users/natemacbook/Desktop/IS%20401%20Final/Campus-Connect-Hub/lib/api-client-react): generated React API client

## Common issues

If the frontend loads but API calls fail:

- make sure the backend is running on port `3000`
- make sure `DATABASE_URL` is set in the terminal where the backend starts
- make sure the SQL schema has been applied

If authentication fails:

- make sure `SESSION_SECRET` is set before starting the backend

### Vercel (`build:vercel`)

Root `api/*.js` handlers import `artifacts/api-server/dist/app.mjs`. That file is gitignored and must be produced **during the Vercel build**. The `pnpm run build:vercel` script builds the API server first, then the Vite app.

In the Vercel project **Settings → Environment Variables**, set at least:

- `DATABASE_URL` — Postgres connection string (Supabase pooler URL is recommended)
- `SESSION_SECRET` — long random string (must stay stable per deployment so signed session cookies validate)

Redeploy after changing env vars. If **registration returns 500**, open the failing request in the Network tab and read the JSON `detail` field; common causes are missing `DATABASE_URL`, wrong DB schema, or the API bundle not being built (fixed by the `build:vercel` step above).

## Admin accounts

The seed includes one unique admin user per club:

- `john_doe@byu.edu` / `byu123` -> BYU CS Society
- `isa_admin@byu.edu` / `isa123` -> International Students Association
- `service_admin@byu.edu` / `service123` -> BYU Service Club
- `finance_admin@byu.edu` / `finance123` -> Finance & Investment Club
- `photo_admin@byu.edu` / `photo123` -> BYU Photography Society
- `debate_admin@byu.edu` / `debate123` -> Debate & Oratory Club
- `ballroom_admin@byu.edu` / `ballroom123` -> BYU Ballroom Dance Club
- `premed_admin@byu.edu` / `premed123` -> Pre-Med Association
- `entrepreneur_admin@byu.edu` / `entre123` -> Entrepreneur Club
- `hiking_admin@byu.edu` / `hiking123` -> BYU Hiking & Outdoors
- `culinary_admin@byu.edu` / `culinary123` -> Culinary Arts Society
- `lbs_admin@byu.edu` / `lbs123` -> LDS Business Society
- `byu_admin@byu.edu` / `byuadmin123` -> Super Admin (assign/remove club admins)

Super admin access is controlled by `SUPER_ADMIN_EMAILS` (comma-separated). Defaults in code are:

- `byu_admin@byu.edu`
- `gunnjake@byu.edu`

Club-level admin fallback access is controlled by `ADMIN_EMAILS` (comma-separated) for environments where the `role` column has not been deployed yet.

## Features added

- Discover page search moved from sidebar and now supports unified search across events, clubs, and buildings.
- Discover filters include time presets, category, and food toggle.
- In Map view, filters are shown in a compact dropdown panel so the map stays visible.
- Sidebar includes a Campus Snapshot card with total events and total clubs.
- Club admins can edit their club details and create events from the club context.
- Event admins can edit all event fields and view attendee lists.
- Club admins cannot join/leave clubs they manage.
- Super Admin tab allows assigning/removing club admins per club.

For production DB role-based admin support, send the owner this SQL migration:

```sql
ALTER TABLE club_memberships
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
CHECK (role IN ('member', 'club_admin', 'owner'));

UPDATE club_memberships
SET role = 'club_admin'
WHERE user_id = (
  SELECT id FROM users WHERE email = 'john_doe@byu.edu'
)
AND club_id = 1;
```

If database requests fail:

- verify `DATABASE_URL`
- for Supabase, prefer the transaction pooler connection string

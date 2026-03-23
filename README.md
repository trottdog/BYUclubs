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

If database requests fail:

- verify `DATABASE_URL`
- for Supabase, prefer the transaction pooler connection string

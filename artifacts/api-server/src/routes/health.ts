// @ts-nocheck
import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const router = Router();

router.get("/healthz", (_req: any, res: any) => {
  res.json({ status: "ok" });
});

router.get("/healthz/db", async (_req: any, res: any) => {
  try {
    await db.execute(sql`select 1`);

    const tableChecks = await db.execute(sql`
      select
        to_regclass('public.users') as users,
        to_regclass('public.categories') as categories,
        to_regclass('public.buildings') as buildings,
        to_regclass('public.clubs') as clubs,
        to_regclass('public.events') as events
    `);

    const row = tableChecks.rows?.[0] ?? {};

    res.json({
      status: "ok",
      database: "connected",
      tables: {
        users: Boolean(row.users),
        categories: Boolean(row.categories),
        buildings: Boolean(row.buildings),
        clubs: Boolean(row.clubs),
        events: Boolean(row.events),
      },
    });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      database: "failed",
      error: err?.message ?? String(err),
      code: err?.code ?? null,
    });
  }
});

export default router;

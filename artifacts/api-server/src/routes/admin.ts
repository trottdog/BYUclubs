// @ts-nocheck
import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  clubsTable,
  clubMembershipsTable,
  usersTable,
  buildingsTable,
  categoriesTable,
  eventsTable,
} from "@workspace/db";
import { CreateEventBody } from "@workspace/api-zod";
import { getAuthUserId } from "../lib/auth-cookie.js";

const router = Router();
const DEFAULT_SUPER_ADMIN_EMAILS = ["byu_admin@byu.edu", "gunnjake@byu.edu"];

function getSuperAdminEmailSet(): Set<string> {
  const configured = process.env.SUPER_ADMIN_EMAILS?.trim();
  const source = configured?.length ? configured.split(",") : DEFAULT_SUPER_ADMIN_EMAILS;
  return new Set(source.map((email) => email.trim().toLowerCase()).filter(Boolean));
}

async function getUserEmail(userId: number): Promise<string | null> {
  const [user] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return user?.email?.toLowerCase() ?? null;
}

async function requireSuperAdmin(req: any, res: any): Promise<number | null> {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return null;
  }
  const email = await getUserEmail(userId);
  if (!email || !getSuperAdminEmailSet().has(email)) {
    res.status(403).json({ error: "Super admin access required." });
    return null;
  }
  return userId;
}

async function handleAdminCanManage(_req: any, res: any): Promise<void> {
  const userId = getAuthUserId(_req);
  if (!userId) {
    res.json({ isSuperAdmin: false });
    return;
  }
  const email = await getUserEmail(userId);
  res.json({ isSuperAdmin: !!email && getSuperAdminEmailSet().has(email) });
}

router.get("/admin/can-manage", handleAdminCanManage);
/** Single-path alias for Vercel (avoids multi-segment /api/admin/... routing issues). */
router.get("/super-admin-can-manage", handleAdminCanManage);

async function handleAdminClubsAdmins(_req: any, res: any): Promise<void> {
  const userId = await requireSuperAdmin(_req, res);
  if (!userId) return;

  const clubs = await db
    .select({ id: clubsTable.id, name: clubsTable.name })
    .from(clubsTable)
    .orderBy(clubsTable.name);

  try {
    const adminsRows = await db.execute(sql`
      select
        cm.club_id as "clubId",
        u.id as "userId",
        u.email as "email",
        u.first_name as "firstName",
        u.last_name as "lastName",
        cm.role as "role"
      from club_memberships cm
      inner join users u on u.id = cm.user_id
      where cm.role in ('club_admin', 'owner', 'admin')
      order by cm.club_id, u.email
    `);

    const adminsByClub = new Map<number, any[]>();
    for (const row of adminsRows.rows ?? []) {
      const clubId = Number(row.clubId);
      if (!adminsByClub.has(clubId)) adminsByClub.set(clubId, []);
      adminsByClub.get(clubId)?.push({
        userId: Number(row.userId),
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        role: row.role,
      });
    }

    res.json({
      clubs: clubs.map((club) => ({
        id: club.id,
        name: club.name,
        admins: adminsByClub.get(club.id) ?? [],
      })),
    });
  } catch (err: any) {
    if (err?.code === "42703") {
      res.status(500).json({
        error: "club_memberships.role is missing. Apply the schema update before using super admin management.",
      });
      return;
    }
    throw err;
  }
}

router.get("/admin/clubs/admins", handleAdminClubsAdmins);
router.get("/super-admin-clubs-admins", handleAdminClubsAdmins);

async function handleAssignClubAdmin(req: any, res: any, clubIdParam: number | null): Promise<void> {
  const userId = await requireSuperAdmin(req, res);
  if (!userId) return;

  const id =
    clubIdParam ??
    Number(
      typeof req.body?.clubId === "number" ? req.body.clubId : parseInt(String(req.body?.clubId ?? ""), 10),
    );
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid club ID." });
    return;
  }

  const email = String(req.body?.email ?? "").trim().toLowerCase();
  if (!email) {
    res.status(400).json({ error: "Email is required." });
    return;
  }

  const [club] = await db
    .select({ id: clubsTable.id })
    .from(clubsTable)
    .where(eq(clubsTable.id, id))
    .limit(1);
  if (!club) {
    res.status(404).json({ error: "Club not found." });
    return;
  }

  const [targetUser] = await db
    .select({ id: usersTable.id, email: usersTable.email, firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (!targetUser) {
    res.status(404).json({ error: "User not found for that email." });
    return;
  }

  try {
    await db.execute(sql`
      insert into club_memberships (user_id, club_id, role)
      values (${targetUser.id}, ${id}, 'club_admin')
      on conflict (user_id, club_id)
      do update set role = 'club_admin'
    `);
  } catch (err: any) {
    if (err?.code === "42703") {
      res.status(500).json({
        error: "club_memberships.role is missing. Apply the schema update before assigning admins.",
      });
      return;
    }
    throw err;
  }

  res.json({
    message: "Admin assigned.",
    admin: {
      userId: targetUser.id,
      email: targetUser.email,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      role: "club_admin",
    },
  });
}

router.post("/admin/clubs/:id/admins", async (req, res): Promise<void> => {
  const rawId = req.params.id;
  const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
  await handleAssignClubAdmin(req, res, id);
});

/** POST body: { clubId, email } — single-path alias for Vercel. */
router.post("/super-admin-assign-club-admin", async (req, res): Promise<void> => {
  await handleAssignClubAdmin(req, res, null);
});

async function handleRemoveClubAdmin(
  req: any,
  res: any,
  clubId: number | null,
  targetUserId: number | null,
): Promise<void> {
  const requesterId = await requireSuperAdmin(req, res);
  if (!requesterId) return;

  const rawClub =
    clubId ??
    Number(
      typeof req.query?.clubId === "string"
        ? parseInt(req.query.clubId, 10)
        : parseInt(String(req.query?.clubId ?? ""), 10),
    );
  const rawUser =
    targetUserId ??
    Number(
      typeof req.query?.userId === "string"
        ? parseInt(req.query.userId, 10)
        : parseInt(String(req.query?.userId ?? ""), 10),
    );

  if (!Number.isInteger(rawClub) || !Number.isInteger(rawUser) || rawClub <= 0 || rawUser <= 0) {
    res.status(400).json({ error: "Invalid club or user ID." });
    return;
  }

  await db
    .delete(clubMembershipsTable)
    .where(and(eq(clubMembershipsTable.clubId, rawClub), eq(clubMembershipsTable.userId, rawUser)));

  res.json({ message: "Admin removed." });
}

router.delete("/admin/clubs/:id/admins/:userId", async (req, res): Promise<void> => {
  const rawC = req.params.id;
  const rawU = req.params.userId;
  const clubId = Number(Array.isArray(rawC) ? rawC[0] : rawC);
  const userId = Number(Array.isArray(rawU) ? rawU[0] : rawU);
  await handleRemoveClubAdmin(req, res, clubId, userId);
});

/** DELETE query: clubId, userId — single-path alias for Vercel. */
router.delete("/super-admin-remove-club-admin", async (req, res): Promise<void> => {
  await handleRemoveClubAdmin(req, res, null, null);
});

/**
 * Super-admin only: insert an event with a direct SQL statement (not Drizzle insert builder).
 */
router.post("/super-admin-create-event", async (req, res): Promise<void> => {
  const userId = await requireSuperAdmin(req, res);
  if (userId == null) return;

  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    title,
    description,
    startTime,
    endTime,
    buildingId,
    roomNumber,
    categoryId,
    clubId,
    capacity,
    hasFood,
    tags,
  } = parsed.data;

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.getTime() >= end.getTime()) {
    res.status(400).json({ error: "Invalid start or end time." });
    return;
  }

  const [[building], [category], [club]] = await Promise.all([
    db.select({ id: buildingsTable.id }).from(buildingsTable).where(eq(buildingsTable.id, buildingId)).limit(1),
    db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.id, categoryId)).limit(1),
    db.select({ id: clubsTable.id }).from(clubsTable).where(eq(clubsTable.id, clubId)).limit(1),
  ]);

  if (!building || !category || !club) {
    res.status(400).json({ error: "Invalid buildingId, categoryId, or clubId." });
    return;
  }

  const tagsSql =
    tags.length > 0
      ? sql`ARRAY[${sql.join(
          tags.map((t) => sql`${t}`),
          sql`, `,
        )}]::text[]`
      : sql`ARRAY[]::text[]`;

  try {
    const inserted = await db.execute(sql`
      insert into events (
        title, description, start_time, end_time, building_id, room_number,
        category_id, club_id, capacity, has_food, tags, created_by_user_id
      ) values (
        ${title},
        ${description},
        ${start.toISOString()}::timestamptz,
        ${end.toISOString()}::timestamptz,
        ${buildingId},
        ${roomNumber},
        ${categoryId},
        ${clubId},
        ${capacity},
        ${hasFood},
        ${tagsSql},
        ${userId}
      )
      returning id
    `);
    const id = Number((inserted.rows?.[0] as { id: unknown })?.id);
    res.status(201).json({ id, message: "Event inserted." });
  } catch (err: any) {
    if (err?.code === "42703") {
      const inserted = await db.execute(sql`
        insert into events (
          title, description, start_time, end_time, building_id, room_number,
          category_id, club_id, capacity, has_food, tags
        ) values (
          ${title},
          ${description},
          ${start.toISOString()}::timestamptz,
          ${end.toISOString()}::timestamptz,
          ${buildingId},
          ${roomNumber},
          ${categoryId},
          ${clubId},
          ${capacity},
          ${hasFood},
          ${tagsSql}
        )
        returning id
      `);
      const id = Number((inserted.rows?.[0] as { id: unknown })?.id);
      res.status(201).json({ id, message: "Event inserted (schema without created_by_user_id)." });
      return;
    }
    throw err;
  }
});

/**
 * Super-admin only: update an event with a direct SQL UPDATE (parameterized).
 */
router.patch("/super-admin-update-event", async (req, res): Promise<void> => {
  const userId = await requireSuperAdmin(req, res);
  if (userId == null) return;

  const raw = req.body ?? {};
  const eventId = parseInt(String(raw.id ?? ""), 10);
  if (!Number.isInteger(eventId) || eventId < 1) {
    res.status(400).json({ error: "Valid event id is required." });
    return;
  }

  const coverRaw = raw.coverImageUrl;
  const coverImageUrl =
    coverRaw === undefined || coverRaw === null ? null : String(coverRaw).trim() || null;

  const parsed = CreateEventBody.safeParse({
    title: raw.title,
    description: raw.description,
    startTime: raw.startTime,
    endTime: raw.endTime,
    buildingId: raw.buildingId,
    roomNumber: raw.roomNumber,
    categoryId: raw.categoryId,
    clubId: raw.clubId,
    capacity: raw.capacity,
    hasFood: raw.hasFood,
    tags: raw.tags,
  });

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    title,
    description,
    startTime,
    endTime,
    buildingId,
    roomNumber,
    categoryId,
    clubId,
    capacity,
    hasFood,
    tags,
  } = parsed.data;

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.getTime() >= end.getTime()) {
    res.status(400).json({ error: "Invalid start or end time." });
    return;
  }

  const [existing] = await db
    .select({ id: eventsTable.id })
    .from(eventsTable)
    .where(eq(eventsTable.id, eventId))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Event not found." });
    return;
  }

  const [[building], [category], [club]] = await Promise.all([
    db.select({ id: buildingsTable.id }).from(buildingsTable).where(eq(buildingsTable.id, buildingId)).limit(1),
    db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.id, categoryId)).limit(1),
    db.select({ id: clubsTable.id }).from(clubsTable).where(eq(clubsTable.id, clubId)).limit(1),
  ]);

  if (!building || !category || !club) {
    res.status(400).json({ error: "Invalid buildingId, categoryId, or clubId." });
    return;
  }

  const tagsSql =
    tags.length > 0
      ? sql`ARRAY[${sql.join(
          tags.map((t) => sql`${t}`),
          sql`, `,
        )}]::text[]`
      : sql`ARRAY[]::text[]`;

  const runWithCover = async () => {
    await db.execute(sql`
      update events set
        title = ${title},
        description = ${description},
        start_time = ${start.toISOString()}::timestamptz,
        end_time = ${end.toISOString()}::timestamptz,
        building_id = ${buildingId},
        room_number = ${roomNumber},
        category_id = ${categoryId},
        club_id = ${clubId},
        capacity = ${capacity},
        has_food = ${hasFood},
        tags = ${tagsSql},
        cover_image_url = ${coverImageUrl}
      where id = ${eventId}
    `);
  };

  const runWithoutCover = async () => {
    await db.execute(sql`
      update events set
        title = ${title},
        description = ${description},
        start_time = ${start.toISOString()}::timestamptz,
        end_time = ${end.toISOString()}::timestamptz,
        building_id = ${buildingId},
        room_number = ${roomNumber},
        category_id = ${categoryId},
        club_id = ${clubId},
        capacity = ${capacity},
        has_food = ${hasFood},
        tags = ${tagsSql}
      where id = ${eventId}
    `);
  };

  try {
    await runWithCover();
  } catch (err: any) {
    if (err?.code === "42703") {
      await runWithoutCover();
    } else {
      throw err;
    }
  }

  res.json({ id: eventId, message: "Event updated." });
});

export default router;

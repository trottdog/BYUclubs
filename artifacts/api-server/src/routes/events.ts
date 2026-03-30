// @ts-nocheck
import { Router } from "express";
import { eq, and, sql, ilike, or } from "drizzle-orm";
import { db, eventsTable, buildingsTable, categoriesTable, clubsTable, eventSavesTable, reservationsTable, clubMembershipsTable, usersTable } from "@workspace/db";
import {
  GetEventsQueryParams,
  GetEventsResponse,
  GetEventParams,
  GetEventResponse,
  CreateEventBody,
  SaveEventParams,
  SaveEventResponse,
  ReserveEventParams,
  ReserveEventResponse,
} from "@workspace/api-zod";
import { getAuthUserId } from "../lib/auth-cookie.js";

const router = Router();
const INDEPENDENT_CLUB_NAME = "Independent Students";
const DEFAULT_ADMIN_EMAILS = [
  "byu_admin@byu.edu",
  "gunnjake@byu.edu",
];

function getAdminEmailSet(): Set<string> {
  const configured = process.env.ADMIN_EMAILS?.trim();
  const source = configured?.length ? configured.split(",") : DEFAULT_ADMIN_EMAILS;
  return new Set(source.map((email) => email.trim().toLowerCase()).filter(Boolean));
}

const DEFAULT_SUPER_ADMIN_EMAILS = ["byu_admin@byu.edu", "gunnjake@byu.edu"];

function getSuperAdminEmailSet(): Set<string> {
  const configured = process.env.SUPER_ADMIN_EMAILS?.trim();
  const source = configured?.length ? configured.split(",") : DEFAULT_SUPER_ADMIN_EMAILS;
  return new Set(source.map((email) => email.trim().toLowerCase()).filter(Boolean));
}

async function isSuperAdminUser(userId: number): Promise<boolean> {
  const email = await getUserEmail(userId);
  return email != null && getSuperAdminEmailSet().has(email);
}

async function getUserEmail(userId: number): Promise<string | null> {
  const [user] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return user?.email?.toLowerCase() ?? null;
}

async function canManageClub(userId: number, clubId: number): Promise<boolean> {
  const email = await getUserEmail(userId);
  if (!email) return false;
  if (getAdminEmailSet().has(email)) return true;

  try {
    const roleCheck = await db.execute(sql`
      select role
      from club_memberships
      where user_id = ${userId} and club_id = ${clubId}
      limit 1
    `);
    const role = String(roleCheck.rows?.[0]?.role ?? "").toLowerCase();
    if (role === "owner" || role === "admin" || role === "club_admin") return true;
  } catch (err: any) {
    if (err?.code !== "42703") throw err;
  }

  // Backward compatibility for schemas without role column.
  const [membership] = await db
    .select({ clubId: clubMembershipsTable.clubId })
    .from(clubMembershipsTable)
    .where(and(eq(clubMembershipsTable.userId, userId), eq(clubMembershipsTable.clubId, clubId)))
    .limit(1);
  return Boolean(membership);
}

async function getIndependentClubId(): Promise<number | null> {
  const [club] = await db
    .select({ id: clubsTable.id })
    .from(clubsTable)
    .where(eq(clubsTable.name, INDEPENDENT_CLUB_NAME))
    .limit(1);
  return club?.id ?? null;
}

async function getEventManageContext(eventId: number): Promise<{
  id: number;
  clubId: number;
  createdByUserId: number | null;
} | null> {
  try {
    const result = await db.execute(sql`
      select id, club_id, created_by_user_id
      from events
      where id = ${eventId}
      limit 1
    `);
    const row = result.rows?.[0];
    if (!row) return null;
    return {
      id: Number(row.id),
      clubId: Number(row.club_id),
      createdByUserId: row.created_by_user_id == null ? null : Number(row.created_by_user_id),
    };
  } catch (err: any) {
    if (err?.code !== "42703") throw err;

    const result = await db.execute(sql`
      select id, club_id
      from events
      where id = ${eventId}
      limit 1
    `);
    const row = result.rows?.[0];
    if (!row) return null;
    return {
      id: Number(row.id),
      clubId: Number(row.club_id),
      createdByUserId: null,
    };
  }
}

async function buildEventList(userId: number | null, conditions: any[] = []) {
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const events = await db
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      description: eventsTable.description,
      startTime: eventsTable.startTime,
      endTime: eventsTable.endTime,
      buildingId: eventsTable.buildingId,
      buildingName: buildingsTable.name,
      roomNumber: eventsTable.roomNumber,
      categoryId: eventsTable.categoryId,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      clubId: eventsTable.clubId,
      clubName: clubsTable.name,
      capacity: eventsTable.capacity,
      hasFood: eventsTable.hasFood,
      coverImageUrl: eventsTable.coverImageUrl,
      tags: eventsTable.tags,
      latitude: buildingsTable.latitude,
      longitude: buildingsTable.longitude,
    })
    .from(eventsTable)
    .innerJoin(buildingsTable, eq(eventsTable.buildingId, buildingsTable.id))
    .innerJoin(categoriesTable, eq(eventsTable.categoryId, categoriesTable.id))
    .innerJoin(clubsTable, eq(eventsTable.clubId, clubsTable.id))
    .where(whereClause)
    .orderBy(eventsTable.startTime);

  const eventIds = events.map((e) => e.id);

  let savedIds = new Set<number>();
  let reservedIds = new Set<number>();
  let reservedCountMap = new Map<number, number>();

  if (eventIds.length > 0) {
    const reservationCounts = await db
      .select({ eventId: reservationsTable.eventId, count: sql<number>`count(*)::int` })
      .from(reservationsTable)
      .where(sql`${reservationsTable.eventId} = ANY(${sql.raw(`ARRAY[${eventIds.join(",")}]`)})`)
      .groupBy(reservationsTable.eventId);

    for (const rc of reservationCounts) {
      reservedCountMap.set(rc.eventId, rc.count);
    }

    if (userId) {
      const saves = await db
        .select({ eventId: eventSavesTable.eventId })
        .from(eventSavesTable)
        .where(
          and(
            eq(eventSavesTable.userId, userId),
            sql`${eventSavesTable.eventId} = ANY(${sql.raw(`ARRAY[${eventIds.join(",")}]`)})`,
          ),
        );
      savedIds = new Set(saves.map((s) => s.eventId));

      const reservations = await db
        .select({ eventId: reservationsTable.eventId })
        .from(reservationsTable)
        .where(
          and(
            eq(reservationsTable.userId, userId),
            sql`${reservationsTable.eventId} = ANY(${sql.raw(`ARRAY[${eventIds.join(",")}]`)})`,
          ),
        );
      reservedIds = new Set(reservations.map((r) => r.eventId));
    }
  }

  return events.map((e) => ({
    ...e,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    reservedCount: reservedCountMap.get(e.id) ?? 0,
    isSaved: savedIds.has(e.id),
    isReserved: reservedIds.has(e.id),
    coverImageUrl: e.coverImageUrl ?? null,
    tags: e.tags ?? [],
  }));
}

router.get("/events", async (req, res): Promise<void> => {
  const parsed = GetEventsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { categoryId, buildingId, clubId, search } = parsed.data;
  const userId = getAuthUserId(req);

  const conditions = [];
  if (categoryId) conditions.push(eq(eventsTable.categoryId, categoryId));
  if (buildingId) conditions.push(eq(eventsTable.buildingId, buildingId));
  if (clubId) conditions.push(eq(eventsTable.clubId, clubId));
  if (search) {
    conditions.push(
      or(
        ilike(eventsTable.title, `%${search}%`),
        ilike(eventsTable.description, `%${search}%`),
      )!,
    );
  }

  const events = await buildEventList(userId, conditions);
  res.json(GetEventsResponse.parse(events));
});

router.post("/events", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, description, startTime, endTime, buildingId, roomNumber, categoryId, clubId, capacity, hasFood, tags } = parsed.data;

  const [[building], [category], [club]] = await Promise.all([
    db.select({ id: buildingsTable.id }).from(buildingsTable).where(eq(buildingsTable.id, buildingId)).limit(1),
    db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.id, categoryId)).limit(1),
    db.select({ id: clubsTable.id }).from(clubsTable).where(eq(clubsTable.id, clubId)).limit(1),
  ]);

  if (!building) {
    res.status(400).json({ error: "Invalid buildingId." });
    return;
  }

  if (!category) {
    res.status(400).json({ error: "Invalid categoryId." });
    return;
  }

  if (!club) {
    res.status(400).json({ error: "Invalid clubId." });
    return;
  }

  const independentClubId = await getIndependentClubId();
  const isIndependentEvent = independentClubId !== null && clubId === independentClubId;
  const canManage = await canManageClub(userId, clubId);
  if (!canManage && !isIndependentEvent) {
    res.status(403).json({ error: "You do not have permission to create events for this club." });
    return;
  }

  const [event] = await db
    .insert(eventsTable)
    .values({
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      buildingId,
      roomNumber,
      categoryId,
      clubId,
      capacity,
      hasFood,
      tags: tags ?? [],
      createdByUserId: userId,
    })
    .returning()
    .catch(async (err: any) => {
      if (err?.code !== "42703") throw err;
      return db
        .insert(eventsTable)
        .values({
          title,
          description,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          buildingId,
          roomNumber,
          categoryId,
          clubId,
          capacity,
          hasFood,
          tags: tags ?? [],
        })
        .returning();
    });

  const events = await buildEventList(userId, [eq(eventsTable.id, event.id)]);
  res.status(201).json(events[0]);
});

async function handleEventCanManage(req: any, res: any, id: number): Promise<void> {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.json({ canManage: false });
    return;
  }

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid event ID." });
    return;
  }

  const event = await getEventManageContext(id);
  if (!event) {
    res.status(404).json({ error: "Event not found." });
    return;
  }

  const allowed =
    event.createdByUserId === userId ||
    (await canManageClub(userId, event.clubId)) ||
    (await isSuperAdminUser(userId));
  res.json({ canManage: allowed });
}

router.get("/events/:id/can-manage", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await handleEventCanManage(req, res, id);
});

/** Query id — single-path alias for Vercel. */
router.get("/event-can-manage", async (req, res): Promise<void> => {
  const q = req.query?.id;
  const id = parseInt(typeof q === "string" ? q : Array.isArray(q) ? q[0] : String(q ?? ""), 10);
  await handleEventCanManage(req, res, id);
});

async function handleEventAttendees(req: any, res: any, id: number): Promise<void> {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid event ID." });
    return;
  }

  const event = await getEventManageContext(id);
  if (!event) {
    res.status(404).json({ error: "Event not found." });
    return;
  }

  const allowed =
    event.createdByUserId === userId ||
    (await canManageClub(userId, event.clubId)) ||
    (await isSuperAdminUser(userId));
  if (!allowed) {
    res.status(403).json({ error: "You do not have permission to view attendees for this event." });
    return;
  }

  const attendees = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      reservedAt: reservationsTable.reservedAt,
    })
    .from(reservationsTable)
    .innerJoin(usersTable, eq(reservationsTable.userId, usersTable.id))
    .where(eq(reservationsTable.eventId, id))
    .orderBy(reservationsTable.reservedAt);

  res.json({
    attendees: attendees.map((a) => ({
      ...a,
      reservedAt: a.reservedAt.toISOString(),
    })),
  });
}

router.get("/events/:id/attendees", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await handleEventAttendees(req, res, id);
});

/** Query id — single-path alias for Vercel. */
router.get("/event-attendees", async (req, res): Promise<void> => {
  const q = req.query?.id;
  const id = parseInt(typeof q === "string" ? q : Array.isArray(q) ? q[0] : String(q ?? ""), 10);
  await handleEventAttendees(req, res, id);
});

router.get("/events/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid event ID." });
    return;
  }

  const userId = getAuthUserId(req);

  const events = await buildEventList(userId, [eq(eventsTable.id, id)]);
  if (!events.length) {
    res.status(404).json({ error: "Event not found." });
    return;
  }

  const event = events[0];

  const [club] = await db
    .select({ avatarInitials: clubsTable.avatarInitials, description: clubsTable.description })
    .from(clubsTable)
    .where(eq(clubsTable.id, event.clubId));

  const detail = {
    ...event,
    clubAvatar: club?.avatarInitials ?? "",
    clubDescription: club?.description ?? "",
  };

  res.json(GetEventResponse.parse(detail));
});

router.patch("/events/:id", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid event ID." });
    return;
  }

  const existingEvent = await getEventManageContext(id);
  if (!existingEvent) {
    res.status(404).json({ error: "Event not found." });
    return;
  }

  const allowed =
    existingEvent.createdByUserId === userId ||
    (await canManageClub(userId, existingEvent.clubId)) ||
    (await isSuperAdminUser(userId));
  if (!allowed) {
    res.status(403).json({ error: "You do not have permission to edit this event." });
    return;
  }

  const input = req.body ?? {};
  const updates: Record<string, unknown> = {};

  if (typeof input.title === "string") {
    const title = input.title.trim();
    if (!title) {
      res.status(400).json({ error: "Title cannot be empty." });
      return;
    }
    updates.title = title;
  }
  if (typeof input.description === "string") {
    const description = input.description.trim();
    if (!description) {
      res.status(400).json({ error: "Description cannot be empty." });
      return;
    }
    updates.description = description;
  }
  if (typeof input.roomNumber === "string") {
    const roomNumber = input.roomNumber.trim();
    if (!roomNumber) {
      res.status(400).json({ error: "Room number cannot be empty." });
      return;
    }
    updates.roomNumber = roomNumber;
  }
  if (typeof input.startTime === "string") {
    const startTime = new Date(input.startTime);
    if (Number.isNaN(startTime.getTime())) {
      res.status(400).json({ error: "Invalid startTime." });
      return;
    }
    updates.startTime = startTime;
  }
  if (typeof input.endTime === "string") {
    const endTime = new Date(input.endTime);
    if (Number.isNaN(endTime.getTime())) {
      res.status(400).json({ error: "Invalid endTime." });
      return;
    }
    updates.endTime = endTime;
  }
  if (typeof input.capacity === "number") {
    if (!Number.isInteger(input.capacity) || input.capacity < 1) {
      res.status(400).json({ error: "Capacity must be a positive integer." });
      return;
    }
    updates.capacity = input.capacity;
  }
  if (typeof input.hasFood === "boolean") {
    updates.hasFood = input.hasFood;
  }
  if (Array.isArray(input.tags) && input.tags.every((t: any) => typeof t === "string")) {
    updates.tags = input.tags.map((t: string) => t.trim()).filter(Boolean);
  }
  if (typeof input.coverImageUrl === "string") {
    const coverImageUrl = input.coverImageUrl.trim();
    updates.coverImageUrl = coverImageUrl.length ? coverImageUrl : null;
  } else if (input.coverImageUrl === null) {
    updates.coverImageUrl = null;
  }
  if (typeof input.buildingId === "number") {
    const [building] = await db
      .select({ id: buildingsTable.id })
      .from(buildingsTable)
      .where(eq(buildingsTable.id, input.buildingId))
      .limit(1);
    if (!building) {
      res.status(400).json({ error: "Invalid buildingId." });
      return;
    }
    updates.buildingId = input.buildingId;
  }
  if (typeof input.categoryId === "number") {
    const [category] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, input.categoryId))
      .limit(1);
    if (!category) {
      res.status(400).json({ error: "Invalid categoryId." });
      return;
    }
    updates.categoryId = input.categoryId;
  }
  if (typeof input.clubId === "number") {
    const [club] = await db
      .select({ id: clubsTable.id })
      .from(clubsTable)
      .where(eq(clubsTable.id, input.clubId))
      .limit(1);
    if (!club) {
      res.status(400).json({ error: "Invalid clubId." });
      return;
    }
    const canManageTargetClub =
      (await canManageClub(userId, input.clubId)) || (await isSuperAdminUser(userId));
    if (!canManageTargetClub) {
      res.status(403).json({ error: "You do not have permission to move this event to that club." });
      return;
    }
    updates.clubId = input.clubId;
  }

  if (updates.startTime && updates.endTime) {
    if ((updates.startTime as Date).getTime() >= (updates.endTime as Date).getTime()) {
      res.status(400).json({ error: "End time must be after start time." });
      return;
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields provided to update." });
    return;
  }

  await db.update(eventsTable).set(updates).where(eq(eventsTable.id, id));
  const events = await buildEventList(userId, [eq(eventsTable.id, id)]);
  if (!events.length) {
    res.status(404).json({ error: "Event not found." });
    return;
  }
  res.json(events[0]);
});

router.delete("/events/:id", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid event ID." });
    return;
  }

  const event = await getEventManageContext(id);
  if (!event) {
    res.status(404).json({ error: "Event not found." });
    return;
  }

  const allowed =
    event.createdByUserId === userId ||
    (await canManageClub(userId, event.clubId)) ||
    (await isSuperAdminUser(userId));
  if (!allowed) {
    res.status(403).json({ error: "You do not have permission to delete this event." });
    return;
  }

  await db.delete(eventSavesTable).where(eq(eventSavesTable.eventId, id));
  await db.delete(reservationsTable).where(eq(reservationsTable.eventId, id));
  await db.delete(eventsTable).where(eq(eventsTable.id, id));

  res.json({ deleted: true });
});

router.post("/events/:id/save", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid event ID." });
    return;
  }

  const [event] = await db.select({ id: eventsTable.id }).from(eventsTable).where(eq(eventsTable.id, id));
  if (!event) {
    res.status(404).json({ error: "Event not found." });
    return;
  }

  const [existing] = await db
    .select()
    .from(eventSavesTable)
    .where(and(eq(eventSavesTable.userId, userId), eq(eventSavesTable.eventId, id)));

  if (existing) {
    await db
      .delete(eventSavesTable)
      .where(and(eq(eventSavesTable.userId, userId), eq(eventSavesTable.eventId, id)));
    res.json(SaveEventResponse.parse({ saved: false }));
  } else {
    await db.insert(eventSavesTable).values({ userId, eventId: id });
    res.json(SaveEventResponse.parse({ saved: true }));
  }
});

router.post("/events/:id/reserve", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid event ID." });
    return;
  }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
  if (!event) {
    res.status(404).json({ error: "Event not found." });
    return;
  }

  const [existing] = await db
    .select()
    .from(reservationsTable)
    .where(and(eq(reservationsTable.userId, userId), eq(reservationsTable.eventId, id)));

  if (existing) {
    await db
      .delete(reservationsTable)
      .where(and(eq(reservationsTable.userId, userId), eq(reservationsTable.eventId, id)));

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reservationsTable)
      .where(eq(reservationsTable.eventId, id));

    res.json(ReserveEventResponse.parse({ reserved: false, reservedCount: count }));
  } else {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reservationsTable)
      .where(eq(reservationsTable.eventId, id));

    if (count >= event.capacity) {
      res.status(400).json({ error: "This event is at full capacity." });
      return;
    }

    await db.insert(reservationsTable).values({ userId, eventId: id });

    const [{ newCount }] = await db
      .select({ newCount: sql<number>`count(*)::int` })
      .from(reservationsTable)
      .where(eq(reservationsTable.eventId, id));

    res.json(ReserveEventResponse.parse({ reserved: true, reservedCount: newCount }));
  }
});

export default router;

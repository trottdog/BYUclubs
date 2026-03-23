import { Router } from "express";
import { eq, and, sql, ilike } from "drizzle-orm";
import { db, clubsTable, categoriesTable, clubMembershipsTable, eventsTable, buildingsTable, announcementsTable, eventSavesTable, reservationsTable } from "@workspace/db";
import {
  GetClubsQueryParams,
  GetClubsResponse,
  GetClubParams,
  GetClubResponse,
  JoinClubParams,
  JoinClubResponse,
} from "@workspace/api-zod";
import { getAuthUserId } from "../lib/auth-cookie.js";

const router = Router();

async function buildClubList(userId: number | null, conditions: any[] = []) {
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const clubs = await db
    .select({
      id: clubsTable.id,
      name: clubsTable.name,
      description: clubsTable.description,
      categoryId: clubsTable.categoryId,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      avatarInitials: clubsTable.avatarInitials,
      avatarColor: clubsTable.avatarColor,
      coverImageUrl: clubsTable.coverImageUrl,
      contactEmail: clubsTable.contactEmail,
    })
    .from(clubsTable)
    .innerJoin(categoriesTable, eq(clubsTable.categoryId, categoriesTable.id))
    .where(whereClause)
    .orderBy(clubsTable.name);

  const clubIds = clubs.map((c) => c.id);

  let memberIds = new Set<number>();
  let memberCountMap = new Map<number, number>();

  if (clubIds.length > 0) {
    const counts = await db
      .select({ clubId: clubMembershipsTable.clubId, count: sql<number>`count(*)::int` })
      .from(clubMembershipsTable)
      .where(sql`${clubMembershipsTable.clubId} = ANY(${sql.raw(`ARRAY[${clubIds.join(",")}]`)})`)
      .groupBy(clubMembershipsTable.clubId);

    for (const c of counts) {
      memberCountMap.set(c.clubId, c.count);
    }

    if (userId) {
      const memberships = await db
        .select({ clubId: clubMembershipsTable.clubId })
        .from(clubMembershipsTable)
        .where(
          and(
            eq(clubMembershipsTable.userId, userId),
            sql`${clubMembershipsTable.clubId} = ANY(${sql.raw(`ARRAY[${clubIds.join(",")}]`)})`,
          ),
        );
      memberIds = new Set(memberships.map((m) => m.clubId));
    }
  }

  return clubs.map((c) => ({
    ...c,
    memberCount: memberCountMap.get(c.id) ?? 0,
    isMember: memberIds.has(c.id),
    coverImageUrl: c.coverImageUrl ?? null,
  }));
}

router.get("/clubs", async (req, res): Promise<void> => {
  const parsed = GetClubsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { categoryId, search, myClubs } = parsed.data;
  const userId = getAuthUserId(req);

  const conditions = [];
  if (categoryId) conditions.push(eq(clubsTable.categoryId, categoryId));
  if (search) conditions.push(ilike(clubsTable.name, `%${search}%`));

  let clubs = await buildClubList(userId, conditions);

  if (myClubs && userId) {
    clubs = clubs.filter((c) => c.isMember);
  }

  res.json(GetClubsResponse.parse(clubs));
});

router.get("/clubs/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid club ID." });
    return;
  }

  const userId = getAuthUserId(req);

  const clubs = await buildClubList(userId, [eq(clubsTable.id, id)]);
  if (!clubs.length) {
    res.status(404).json({ error: "Club not found." });
    return;
  }

  const club = clubs[0];

  const upcomingEventsRaw = await db
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
    .where(and(eq(eventsTable.clubId, id), sql`${eventsTable.startTime} >= NOW()`))
    .orderBy(eventsTable.startTime)
    .limit(10);

  const eventIds = upcomingEventsRaw.map((e) => e.id);
  let savedIds = new Set<number>();
  let reservedIds = new Set<number>();
  const reservedCountMap = new Map<number, number>();

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

  const upcomingEvents = upcomingEventsRaw.map((e) => ({
    ...e,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    reservedCount: reservedCountMap.get(e.id) ?? 0,
    isSaved: savedIds.has(e.id),
    isReserved: reservedIds.has(e.id),
    coverImageUrl: e.coverImageUrl ?? null,
    tags: e.tags ?? [],
  }));

  const announcements = await db
    .select()
    .from(announcementsTable)
    .where(eq(announcementsTable.clubId, id))
    .orderBy(announcementsTable.createdAt)
    .limit(10);

  const detail = {
    ...club,
    upcomingEvents,
    announcements: announcements.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  };

  res.json(GetClubResponse.parse(detail));
});

router.post("/clubs/:id/join", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [existing] = await db
    .select()
    .from(clubMembershipsTable)
    .where(and(eq(clubMembershipsTable.userId, userId), eq(clubMembershipsTable.clubId, id)));

  if (existing) {
    await db
      .delete(clubMembershipsTable)
      .where(and(eq(clubMembershipsTable.userId, userId), eq(clubMembershipsTable.clubId, id)));

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clubMembershipsTable)
      .where(eq(clubMembershipsTable.clubId, id));

    res.json(JoinClubResponse.parse({ joined: false, memberCount: count }));
  } else {
    await db.insert(clubMembershipsTable).values({ userId, clubId: id });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clubMembershipsTable)
      .where(eq(clubMembershipsTable.clubId, id));

    res.json(JoinClubResponse.parse({ joined: true, memberCount: count }));
  }
});

export default router;

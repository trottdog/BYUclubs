import { Router, type IRouter } from "express";
import { eq, and, sql, ilike, or } from "drizzle-orm";
import { db, eventsTable, buildingsTable, categoriesTable, clubsTable, clubMembershipsTable, eventSavesTable, reservationsTable } from "@workspace/db";
import { SearchQueryParams, SearchResponse } from "@workspace/api-zod";
import { getAuthUserId } from "../lib/auth-cookie";

const router: IRouter = Router();

router.get("/search", async (req, res): Promise<void> => {
  const parsed = SearchQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { q } = parsed.data;
  const userId = getAuthUserId(req);

  const [eventsRaw, clubsRaw] = await Promise.all([
    db
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
      .where(or(ilike(eventsTable.title, `%${q}%`), ilike(eventsTable.description, `%${q}%`))!)
      .orderBy(eventsTable.startTime)
      .limit(20),
    db
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
      .where(or(ilike(clubsTable.name, `%${q}%`), ilike(clubsTable.description, `%${q}%`))!)
      .orderBy(clubsTable.name)
      .limit(20),
  ]);

  const eventIds = eventsRaw.map((e) => e.id);
  const clubIds = clubsRaw.map((c) => c.id);

  let savedIds = new Set<number>();
  let reservedIds = new Set<number>();
  const reservedCountMap = new Map<number, number>();
  let memberIds = new Set<number>();

  if (eventIds.length > 0) {
    const reservationCounts = await db
      .select({ eventId: reservationsTable.eventId, count: sql<number>`count(*)::int` })
      .from(reservationsTable)
      .where(sql`${reservationsTable.eventId} = ANY(${sql.raw(`ARRAY[${eventIds.join(",")}]`)})`)
      .groupBy(reservationsTable.eventId);
    for (const rc of reservationCounts) reservedCountMap.set(rc.eventId, rc.count);

    if (userId) {
      const saves = await db.select({ eventId: eventSavesTable.eventId }).from(eventSavesTable)
        .where(and(eq(eventSavesTable.userId, userId), sql`${eventSavesTable.eventId} = ANY(${sql.raw(`ARRAY[${eventIds.join(",")}]`)})`));
      savedIds = new Set(saves.map((s) => s.eventId));

      const reservations = await db.select({ eventId: reservationsTable.eventId }).from(reservationsTable)
        .where(and(eq(reservationsTable.userId, userId), sql`${reservationsTable.eventId} = ANY(${sql.raw(`ARRAY[${eventIds.join(",")}]`)})`));
      reservedIds = new Set(reservations.map((r) => r.eventId));
    }
  }

  if (clubIds.length > 0 && userId) {
    const memberships = await db.select({ clubId: clubMembershipsTable.clubId }).from(clubMembershipsTable)
      .where(and(eq(clubMembershipsTable.userId, userId), sql`${clubMembershipsTable.clubId} = ANY(${sql.raw(`ARRAY[${clubIds.join(",")}]`)})`));
    memberIds = new Set(memberships.map((m) => m.clubId));
  }

  const memberCountMap = new Map<number, number>();
  if (clubIds.length > 0) {
    const counts = await db.select({ clubId: clubMembershipsTable.clubId, count: sql<number>`count(*)::int` })
      .from(clubMembershipsTable)
      .where(sql`${clubMembershipsTable.clubId} = ANY(${sql.raw(`ARRAY[${clubIds.join(",")}]`)})`)
      .groupBy(clubMembershipsTable.clubId);
    for (const c of counts) memberCountMap.set(c.clubId, c.count);
  }

  const events = eventsRaw.map((e) => ({
    ...e,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    reservedCount: reservedCountMap.get(e.id) ?? 0,
    isSaved: savedIds.has(e.id),
    isReserved: reservedIds.has(e.id),
    coverImageUrl: e.coverImageUrl ?? null,
    tags: e.tags ?? [],
  }));

  const clubs = clubsRaw.map((c) => ({
    ...c,
    memberCount: memberCountMap.get(c.id) ?? 0,
    isMember: memberIds.has(c.id),
    coverImageUrl: c.coverImageUrl ?? null,
  }));

  res.json(SearchResponse.parse({ events, clubs }));
});

export default router;

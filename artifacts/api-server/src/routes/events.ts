import { Router, type IRouter } from "express";
import { eq, and, sql, ilike, or } from "drizzle-orm";
import { db, eventsTable, buildingsTable, categoriesTable, clubsTable, eventSavesTable, reservationsTable } from "@workspace/db";
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

const router: IRouter = Router();

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
    })
    .returning();

  const events = await buildEventList(userId, [eq(eventsTable.id, event.id)]);
  res.status(201).json(events[0]);
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

router.post("/events/:id/save", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

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

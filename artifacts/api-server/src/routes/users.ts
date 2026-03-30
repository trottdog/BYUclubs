// @ts-nocheck
import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, usersTable, eventSavesTable, reservationsTable, eventsTable, buildingsTable, categoriesTable, clubsTable } from "@workspace/db";
import { GetUserProfileResponse, UpdateUserBioBody, GetMeResponse } from "@workspace/api-zod";
import { getAuthUserId } from "../lib/auth-cookie.js";

const router = Router();

router.patch("/users/profile", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const parsed = UpdateUserBioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const normalizedBio = parsed.data.bio.trim();

  const [updated] = await db
    .update(usersTable)
    .set({ bio: normalizedBio.length > 0 ? normalizedBio : null })
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) {
    res.status(401).json({ error: "User not found." });
    return;
  }

  res.json(
    GetMeResponse.parse({
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      bio: updated.bio ?? null,
      createdAt: updated.createdAt.toISOString(),
    }),
  );
});

router.get("/users/profile", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found." });
    return;
  }

  async function getEvents(
    eventIds: number[],
    state: { isSaved: boolean; isReserved: boolean },
  ) {
    if (eventIds.length === 0) return [];
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
      .where(sql`${eventsTable.id} = ANY(${sql.raw(`ARRAY[${eventIds.join(",")}]`)})`);

    const reservedCountMap = new Map<number, number>();
    const reservationCounts = await db
      .select({ eventId: reservationsTable.eventId, count: sql<number>`count(*)::int` })
      .from(reservationsTable)
      .where(sql`${reservationsTable.eventId} = ANY(${sql.raw(`ARRAY[${eventIds.join(",")}]`)})`)
      .groupBy(reservationsTable.eventId);
    for (const rc of reservationCounts) {
      reservedCountMap.set(rc.eventId, rc.count);
    }

    return events.map((e) => ({
      ...e,
      startTime: e.startTime.toISOString(),
      endTime: e.endTime.toISOString(),
      reservedCount: reservedCountMap.get(e.id) ?? 0,
      isSaved: state.isSaved,
      isReserved: state.isReserved,
      coverImageUrl: e.coverImageUrl ?? null,
      tags: e.tags ?? [],
    }));
  }

  const saves = await db
    .select({ eventId: eventSavesTable.eventId })
    .from(eventSavesTable)
    .where(eq(eventSavesTable.userId, userId))
    .orderBy(eventSavesTable.savedAt);

  const reservationRows = await db
    .select({ eventId: reservationsTable.eventId })
    .from(reservationsTable)
    .where(eq(reservationsTable.userId, userId))
    .orderBy(reservationsTable.reservedAt);

  const savedEventIds = saves.map((s) => s.eventId);
  const reservedEventIds = reservationRows.map((r) => r.eventId);

  const [savedEvents, reservationEvents] = await Promise.all([
    getEvents(savedEventIds, { isSaved: true, isReserved: false }),
    getEvents(reservedEventIds, { isSaved: false, isReserved: true }),
  ]);

  const now = Date.now();
  const pastParticipatedEvents = reservationEvents
    .filter((event) => new Date(event.endTime).getTime() < now)
    .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

  let createdClubs: Array<{ id: number; name: string; description: string }> = [];
  try {
    const result = await db.execute(sql`
      select c.id, c.name, c.description
      from club_memberships cm
      inner join clubs c on c.id = cm.club_id
      where cm.user_id = ${userId}
      and lower(coalesce(cm.role, '')) in ('owner', 'admin', 'club_admin')
      order by c.name asc
    `);

    createdClubs = (result.rows ?? []).map((row: any) => ({
      id: Number(row.id),
      name: String(row.name ?? ""),
      description: String(row.description ?? ""),
    }));
  } catch (err: any) {
    // Compatibility: older DBs may not have the role column yet.
    if (err?.code !== "42703") {
      throw err;
    }
  }

  const profile = {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    savedEvents,
    reservations: reservationEvents,
    pastParticipatedEvents,
    createdClubs,
    savedCount: savedEventIds.length,
    reservationsCount: reservedEventIds.length,
  };

  res.json(GetUserProfileResponse.parse(profile));
});

export default router;

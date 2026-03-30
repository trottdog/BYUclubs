// @ts-nocheck
import { Router } from "express";
import { eq, and, sql, ilike } from "drizzle-orm";
import { db, clubsTable, categoriesTable, clubMembershipsTable, eventsTable, buildingsTable, announcementsTable, clubPhotosTable, eventSavesTable, reservationsTable, usersTable } from "@workspace/db";
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
const DEFAULT_ADMIN_EMAILS = [
  "byu_admin@byu.edu",
  "gunnjake@byu.edu",
];

function getAdminEmailSet(): Set<string> {
  const configured = process.env.ADMIN_EMAILS?.trim();
  const source = configured?.length ? configured.split(",") : DEFAULT_ADMIN_EMAILS;
  return new Set(
    source
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
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

  if (getAdminEmailSet().has(email)) {
    return true;
  }

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
    // Backward compatibility: if role column is not deployed yet, fall back gracefully.
    if (err?.code !== "42703") {
      throw err;
    }
  }

  return false;
}

async function isClubAdminForJoinRestriction(userId: number, clubId: number): Promise<boolean> {
  try {
    const roleCheck = await db.execute(sql`
      select role
      from club_memberships
      where user_id = ${userId} and club_id = ${clubId}
      limit 1
    `);
    const role = String(roleCheck.rows?.[0]?.role ?? "").toLowerCase();
    return role === "owner" || role === "admin" || role === "club_admin";
  } catch (err: any) {
    // If role column is not available yet, fall back to membership presence.
    if (err?.code !== "42703") throw err;
    const [membership] = await db
      .select({ clubId: clubMembershipsTable.clubId })
      .from(clubMembershipsTable)
      .where(and(eq(clubMembershipsTable.userId, userId), eq(clubMembershipsTable.clubId, clubId)))
      .limit(1);
    return Boolean(membership);
  }
}

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

  let photos: Array<{
    id: number;
    clubId: number;
    imageUrl: string;
    caption: string | null;
    addedByUserId: number | null;
    createdAt: Date;
  }> = [];

  try {
    photos = await db
      .select({
        id: clubPhotosTable.id,
        clubId: clubPhotosTable.clubId,
        imageUrl: clubPhotosTable.imageUrl,
        caption: clubPhotosTable.caption,
        addedByUserId: clubPhotosTable.addedByUserId,
        createdAt: clubPhotosTable.createdAt,
      })
      .from(clubPhotosTable)
      .where(eq(clubPhotosTable.clubId, id))
      .orderBy(clubPhotosTable.createdAt);
  } catch (err: any) {
    // Backward compatibility while production DB catches up with club_photos migration.
    if (err?.code !== "42P01") {
      throw err;
    }
  }

  const detail = {
    ...club,
    upcomingEvents,
    announcements: announcements.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
    photos: photos.map((photo) => ({
      ...photo,
      caption: photo.caption ?? null,
      addedByUserId: photo.addedByUserId ?? null,
      createdAt: photo.createdAt.toISOString(),
    })),
  };

  res.json(GetClubResponse.parse(detail));
});

async function handleClubCanManage(req: any, res: any, id: number): Promise<void> {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.json({ canManage: false });
    return;
  }

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid club ID." });
    return;
  }

  const [club] = await db.select({ id: clubsTable.id }).from(clubsTable).where(eq(clubsTable.id, id)).limit(1);
  if (!club) {
    res.status(404).json({ error: "Club not found." });
    return;
  }

  const allowed = await canManageClub(userId, id);
  res.json({ canManage: allowed });
}

router.get("/clubs/:id/can-manage", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await handleClubCanManage(req, res, id);
});

/** Query id — single-path alias for Vercel. */
router.get("/club-can-manage", async (req, res): Promise<void> => {
  const q = req.query?.id;
  const id = parseInt(typeof q === "string" ? q : Array.isArray(q) ? q[0] : String(q ?? ""), 10);
  await handleClubCanManage(req, res, id);
});

router.patch("/clubs/:id", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid club ID." });
    return;
  }

  const [club] = await db.select({ id: clubsTable.id }).from(clubsTable).where(eq(clubsTable.id, id)).limit(1);
  if (!club) {
    res.status(404).json({ error: "Club not found." });
    return;
  }

  const allowed = await canManageClub(userId, id);
  if (!allowed) {
    res.status(403).json({ error: "You do not have permission to edit this club." });
    return;
  }

  const input = req.body ?? {};
  const updates: Record<string, unknown> = {};

  if (typeof input.name === "string") {
    const name = input.name.trim();
    if (!name) {
      res.status(400).json({ error: "Club name cannot be empty." });
      return;
    }
    updates.name = name;
  }

  if (typeof input.description === "string") {
    const description = input.description.trim();
    if (!description) {
      res.status(400).json({ error: "Club description cannot be empty." });
      return;
    }
    updates.description = description;
  }

  if (typeof input.contactEmail === "string") {
    const contactEmail = input.contactEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      res.status(400).json({ error: "Invalid contactEmail format." });
      return;
    }
    updates.contactEmail = contactEmail;
  }

  if (typeof input.coverImageUrl === "string") {
    const coverImageUrl = input.coverImageUrl.trim();
    updates.coverImageUrl = coverImageUrl.length ? coverImageUrl : null;
  } else if (input.coverImageUrl === null) {
    updates.coverImageUrl = null;
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

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields provided to update." });
    return;
  }

  await db.update(clubsTable).set(updates).where(eq(clubsTable.id, id));
  const refreshed = await buildClubList(userId, [eq(clubsTable.id, id)]);
  res.json(refreshed[0]);
});

router.post("/clubs/:id/photos", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid club ID." });
    return;
  }

  const [club] = await db.select({ id: clubsTable.id }).from(clubsTable).where(eq(clubsTable.id, id)).limit(1);
  if (!club) {
    res.status(404).json({ error: "Club not found." });
    return;
  }

  const allowed = await canManageClub(userId, id);
  if (!allowed) {
    res.status(403).json({ error: "You do not have permission to add photos to this club." });
    return;
  }

  const imageUrl = typeof req.body?.imageUrl === "string" ? req.body.imageUrl.trim() : "";
  const caption = typeof req.body?.caption === "string" ? req.body.caption.trim() : "";

  if (!imageUrl) {
    res.status(400).json({ error: "imageUrl is required." });
    return;
  }

  const urlIsValid = /^(https?:)?\/\//i.test(imageUrl);
  if (!urlIsValid) {
    res.status(400).json({ error: "imageUrl must be a valid absolute URL." });
    return;
  }

  const [photo] = await db
    .insert(clubPhotosTable)
    .values({
      clubId: id,
      imageUrl,
      caption: caption.length ? caption : null,
      addedByUserId: userId,
    })
    .returning();

  res.status(201).json({
    id: photo.id,
    clubId: photo.clubId,
    imageUrl: photo.imageUrl,
    caption: photo.caption ?? null,
    addedByUserId: photo.addedByUserId ?? null,
    createdAt: photo.createdAt.toISOString(),
  });
});

router.delete("/clubs/:id/photos/:photoId", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const rawClubId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawPhotoId = Array.isArray(req.params.photoId) ? req.params.photoId[0] : req.params.photoId;
  const clubId = parseInt(rawClubId, 10);
  const photoId = parseInt(rawPhotoId, 10);
  if (isNaN(clubId) || isNaN(photoId)) {
    res.status(400).json({ error: "Invalid club or photo ID." });
    return;
  }

  const allowed = await canManageClub(userId, clubId);
  if (!allowed) {
    res.status(403).json({ error: "You do not have permission to remove photos from this club." });
    return;
  }

  const [photo] = await db
    .select({ id: clubPhotosTable.id, clubId: clubPhotosTable.clubId })
    .from(clubPhotosTable)
    .where(and(eq(clubPhotosTable.id, photoId), eq(clubPhotosTable.clubId, clubId)))
    .limit(1);

  if (!photo) {
    res.status(404).json({ error: "Photo not found." });
    return;
  }

  await db.delete(clubPhotosTable).where(eq(clubPhotosTable.id, photoId));
  res.json({ deleted: true });
});

router.post("/clubs/:id/join", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid club ID." });
    return;
  }

  const [club] = await db.select({ id: clubsTable.id }).from(clubsTable).where(eq(clubsTable.id, id));
  if (!club) {
    res.status(404).json({ error: "Club not found." });
    return;
  }

  const isAdminOfThisClub = await isClubAdminForJoinRestriction(userId, id);
  if (isAdminOfThisClub) {
    res.status(400).json({ error: "Club admins cannot join or leave their managed club." });
    return;
  }

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

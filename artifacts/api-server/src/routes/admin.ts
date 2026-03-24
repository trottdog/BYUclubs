// @ts-nocheck
import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, clubsTable, clubMembershipsTable, usersTable } from "@workspace/db";
import { getAuthUserId } from "../lib/auth-cookie.js";

const router = Router();
const DEFAULT_SUPER_ADMIN_EMAILS = ["byu_admin@byu.edu", "gunnjake@byu.edu"];

function getSuperAdminEmailSet(): Set<string> {
  const configured = process.env.SUPER_ADMIN_EMAILS?.trim();
  const configuredList = configured?.length ? configured.split(",") : [];
  return new Set(
    [...DEFAULT_SUPER_ADMIN_EMAILS, ...configuredList]
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

router.get("/admin/can-manage", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.json({ isSuperAdmin: false });
    return;
  }
  const email = await getUserEmail(userId);
  res.json({ isSuperAdmin: !!email && getSuperAdminEmailSet().has(email) });
});

router.get("/admin/clubs/admins", async (req, res): Promise<void> => {
  const userId = await requireSuperAdmin(req, res);
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
});

router.post("/admin/clubs/:id/admins", async (req, res): Promise<void> => {
  const userId = await requireSuperAdmin(req, res);
  if (!userId) return;

  const id = Number(req.params.id);
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
});

router.delete("/admin/clubs/:id/admins/:userId", async (req, res): Promise<void> => {
  const requesterId = await requireSuperAdmin(req, res);
  if (!requesterId) return;

  const clubId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);
  if (!Number.isInteger(clubId) || !Number.isInteger(targetUserId) || clubId <= 0 || targetUserId <= 0) {
    res.status(400).json({ error: "Invalid club or user ID." });
    return;
  }

  await db
    .delete(clubMembershipsTable)
    .where(and(eq(clubMembershipsTable.clubId, clubId), eq(clubMembershipsTable.userId, targetUserId)));

  res.json({ message: "Admin removed." });
});

export default router;

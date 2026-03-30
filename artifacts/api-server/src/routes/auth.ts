// @ts-nocheck
import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { RegisterBody, LoginBody, GetMeResponse } from "@workspace/api-zod";
import { clearAuthSession, getAuthUserId, setAuthSession } from "../lib/auth-cookie.js";

const router = Router();

const publicUserColumns = {
  id: usersTable.id,
  email: usersTable.email,
  firstName: usersTable.firstName,
  lastName: usersTable.lastName,
  createdAt: usersTable.createdAt,
};

const authUserColumns = {
  ...publicUserColumns,
  passwordHash: usersTable.passwordHash,
};

function toAuthResponseUser(user: {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date | string;
}) {
  const createdAt =
    user.createdAt instanceof Date
      ? user.createdAt.toISOString()
      : new Date(user.createdAt).toISOString();

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    bio: null,
    createdAt,
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

router.post("/auth/register", async (req, res): Promise<void> => {
  try {
    const parsed = RegisterBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { password, firstName, lastName } = parsed.data;
    const email = normalizeEmail(parsed.data.email);

    if (!email.endsWith("@byu.edu")) {
      res.status(400).json({ error: "Only BYU email addresses (@byu.edu) are allowed." });
      return;
    }

    const [existing] = await db
      .select(publicUserColumns)
      .from(usersTable)
      .where(eq(usersTable.email, email));
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await db.execute(sql`
      insert into users (email, password_hash, first_name, last_name)
      values (${email}, ${passwordHash}, ${firstName}, ${lastName})
    `);

    const [user] = await db
      .select(publicUserColumns)
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user) {
      res.status(500).json({ error: "Registration failed", detail: "Created user could not be loaded." });
      return;
    }

    setAuthSession(res, user.id);

    res.status(201).json({
      user: toAuthResponseUser(user),
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    req.log?.error?.({ err }, "Registration failed");
    res.status(500).json({
      error: "Registration failed",
      detail: err?.message ?? String(err),
      code: err?.code ?? null,
    });
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  try {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const password = parsed.data.password;
    const email = normalizeEmail(parsed.data.email);

    const [user] = await db
      .select(authUserColumns)
      .from(usersTable)
      .where(eq(usersTable.email, email));
    if (!user) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    setAuthSession(res, user.id);

    res.json({
      user: toAuthResponseUser(user),
    });
  } catch (err: any) {
    req.log?.error?.({ err }, "Login failed");
    res.status(500).json({
      error: "Login failed",
      detail: err?.message ?? String(err),
      code: err?.code ?? null,
    });
  }
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  clearAuthSession(res);
  res.json({ message: "Logged out successfully." });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const [user] = await db
    .select(publicUserColumns)
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found." });
    return;
  }

  const data = GetMeResponse.parse({
    ...toAuthResponseUser(user),
  });
  res.json(data);
});

export default router;

import { pgTable, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { clubsTable } from "./clubs";

export const clubMembershipsTable = pgTable("club_memberships", {
  userId: integer("user_id").notNull().references(() => usersTable.id),
  clubId: integer("club_id").notNull().references(() => clubsTable.id),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.clubId] }),
]);

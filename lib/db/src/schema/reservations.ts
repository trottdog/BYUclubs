import { pgTable, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";
import { eventsTable } from "./events.js";

export const reservationsTable = pgTable("reservations", {
  userId: integer("user_id").notNull().references(() => usersTable.id),
  eventId: integer("event_id").notNull().references(() => eventsTable.id),
  reservedAt: timestamp("reserved_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.eventId] }),
]);

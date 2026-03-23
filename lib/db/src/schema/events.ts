import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { buildingsTable } from "./buildings";
import { categoriesTable } from "./categories";
import { clubsTable } from "./clubs";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  buildingId: integer("building_id").notNull().references(() => buildingsTable.id),
  roomNumber: text("room_number").notNull(),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id),
  clubId: integer("club_id").notNull().references(() => clubsTable.id),
  capacity: integer("capacity").notNull(),
  hasFood: boolean("has_food").notNull().default(false),
  coverImageUrl: text("cover_image_url"),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;

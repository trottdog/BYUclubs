import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clubsTable } from "./clubs.js";
import { usersTable } from "./users.js";

export const clubPhotosTable = pgTable("club_photos", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubsTable.id),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  addedByUserId: integer("added_by_user_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertClubPhotoSchema = createInsertSchema(clubPhotosTable).omit({ id: true, createdAt: true });
export type InsertClubPhoto = z.infer<typeof insertClubPhotoSchema>;
export type ClubPhoto = typeof clubPhotosTable.$inferSelect;

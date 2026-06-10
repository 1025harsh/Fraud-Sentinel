import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const loginHistoryTable = pgTable("login_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceFingerprint: text("device_fingerprint"),
  deviceName: text("device_name"),
  location: text("location"),
  isTrusted: boolean("is_trusted").notNull().default(false),
  loginAt: timestamp("login_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLoginHistorySchema = createInsertSchema(loginHistoryTable).omit({ id: true, loginAt: true });
export type InsertLoginHistory = z.infer<typeof insertLoginHistorySchema>;
export type LoginHistory = typeof loginHistoryTable.$inferSelect;

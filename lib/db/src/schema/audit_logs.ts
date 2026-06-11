import { pgTable, serial, integer, text, varchar, timestamp } from "drizzle-orm/pg-core";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: varchar("action", { length: 128 }).notNull(),
  resource: varchar("resource", { length: 64 }).notNull(),
  resourceId: varchar("resource_id", { length: 64 }),
  details: text("details"),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
  status: varchar("status", { length: 16 }).notNull().default("success"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

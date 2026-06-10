import { pgTable, text, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const fraudLogsTable = pgTable("fraud_logs", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  riskScore: real("risk_score").notNull(),
  riskLevel: text("risk_level").notNull(),
  fraudProbability: real("fraud_probability").notNull(),
  signals: text("signals").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFraudLogSchema = createInsertSchema(fraudLogsTable).omit({ id: true, createdAt: true });
export type InsertFraudLog = z.infer<typeof insertFraudLogSchema>;
export type FraudLog = typeof fraudLogsTable.$inferSelect;

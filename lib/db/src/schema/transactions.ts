import { pgTable, text, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  amount: real("amount").notNull(),
  merchant: text("merchant").notNull(),
  merchantCategory: text("merchant_category").notNull(),
  cardId: integer("card_id").notNull(),
  cardLast4: text("card_last4"),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default("pending"),
  riskScore: real("risk_score").notNull().default(0),
  riskLevel: text("risk_level").notNull().default("low"),
  fraudProbability: real("fraud_probability").notNull().default(0),
  location: text("location"),
  ipAddress: text("ip_address"),
  deviceId: text("device_id"),
  reviewNote: text("review_note"),
  reviewedBy: integer("reviewed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;

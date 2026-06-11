import { pgTable, serial, integer, text, varchar, timestamp, decimal } from "drizzle-orm/pg-core";

export const fraudCasesTable = pgTable("fraud_cases", {
  id: serial("id").primaryKey(),
  caseNumber: varchar("case_number", { length: 32 }).notNull().unique(),
  userId: integer("user_id").notNull(),
  transactionId: integer("transaction_id"),
  assignedTo: integer("assigned_to"),
  status: varchar("status", { length: 32 }).notNull().default("open"),
  priority: varchar("priority", { length: 16 }).notNull().default("medium"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  resolution: text("resolution"),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }),
  amountInvolved: decimal("amount_involved", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
});

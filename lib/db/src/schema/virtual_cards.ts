import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const virtualCardsTable = pgTable("virtual_cards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  cardNumber: text("card_number").notNull(),
  last4: text("last4").notNull(),
  brand: text("brand").notNull().default("visa"),
  cvv: text("cvv").notNull(),
  expiryMonth: integer("expiry_month").notNull(),
  expiryYear: integer("expiry_year").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  usageLimit: integer("usage_limit").notNull().default(1),
  timesUsed: integer("times_used").notNull().default(0),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const insertVirtualCardSchema = createInsertSchema(virtualCardsTable).omit({ id: true, createdAt: true });
export type InsertVirtualCard = z.infer<typeof insertVirtualCardSchema>;
export type VirtualCard = typeof virtualCardsTable.$inferSelect;

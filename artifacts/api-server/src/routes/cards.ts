import { Router, type IRouter } from "express";
import { db, cardsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateCardBody, GetCardParams, BlockCardParams, BlockCardBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { sendCardBlockedAlert } from "../lib/email";
import { auditLog } from "../lib/audit";
import { createNotification } from "../lib/notifications";

const router: IRouter = Router();

function cardToJson(card: typeof cardsTable.$inferSelect) {
  return {
    id: card.id,
    userId: card.userId,
    last4: card.last4,
    brand: card.brand,
    expiryMonth: card.expiryMonth,
    expiryYear: card.expiryYear,
    isBlocked: card.isBlocked,
    blockReason: card.blockReason ?? null,
    createdAt: card.createdAt.toISOString(),
  };
}

router.get("/cards", requireAuth, async (req, res): Promise<void> => {
  const cards = await db.select().from(cardsTable).where(eq(cardsTable.userId, req.auth!.userId));
  res.json(cards.map(cardToJson));
});

router.post("/cards", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCardBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [card] = await db
    .insert(cardsTable)
    .values({ userId: req.auth!.userId, last4: parsed.data.last4, brand: parsed.data.brand, expiryMonth: parsed.data.expiryMonth, expiryYear: parsed.data.expiryYear, isBlocked: false })
    .returning();
  await auditLog({ req, action: "card_added", resource: "card", resourceId: card.id });
  res.status(201).json(cardToJson(card));
});

router.get("/cards/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetCardParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [card] = await db.select().from(cardsTable).where(and(eq(cardsTable.id, params.data.id), eq(cardsTable.userId, req.auth!.userId)));
  if (!card) { res.status(404).json({ error: "Card not found" }); return; }
  res.json(cardToJson(card));
});

router.patch("/cards/:id/block", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = BlockCardParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = BlockCardBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const conditions = [eq(cardsTable.id, params.data.id)];
  if (req.auth!.role !== "admin") conditions.push(eq(cardsTable.userId, req.auth!.userId));

  const [card] = await db.select().from(cardsTable).where(and(...conditions));
  if (!card) { res.status(404).json({ error: "Card not found" }); return; }

  const [updated] = await db
    .update(cardsTable)
    .set({ isBlocked: body.data.blocked, blockReason: body.data.blocked ? (body.data.reason ?? "Blocked by user") : null })
    .where(eq(cardsTable.id, params.data.id))
    .returning();

  const action = body.data.blocked ? "card_blocked" : "card_unblocked";
  await auditLog({ req, action, resource: "card", resourceId: card.id });

  // Send block/unblock alerts
  if (body.data.blocked) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, card.userId));
    if (user) {
      void createNotification({
        userId: card.userId,
        type: "card_blocked",
        title: "Card Blocked",
        message: `Your card ending in ${card.last4} has been blocked. Reason: ${body.data.reason ?? "Blocked by user"}`,
      });
      void sendCardBlockedAlert({
        userName: user.name,
        userEmail: user.email,
        cardLast4: card.last4,
        reason: body.data.reason ?? "Blocked by user",
        blockedAt: new Date().toLocaleString(),
      });
    }
  }

  res.json(cardToJson(updated));
});

export default router;

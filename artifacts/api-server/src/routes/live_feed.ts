import { Router, type IRouter } from "express";
import { db, transactionsTable, cardsTable, alertsTable } from "@workspace/db";
import { eq, desc, gte, and, count, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/live-feed", requireAuth, async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit ?? 10), 50);
  const since = req.query.since ? new Date(String(req.query.since)) : null;

  const userId = req.auth!.role === "admin" ? undefined : req.auth!.userId;

  const conditions = [];
  if (userId) conditions.push(eq(transactionsTable.userId, userId));
  if (since) conditions.push(gte(transactionsTable.createdAt, since));

  const events = await db
    .select()
    .from(transactionsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit);

  res.json({
    events: events.map((tx) => ({
      id: tx.id,
      type: tx.status === "declined" ? "fraud_detected" : tx.status === "flagged" ? "high_risk" : "transaction",
      amount: tx.amount,
      merchant: tx.merchant,
      merchantCategory: tx.merchantCategory,
      riskLevel: tx.riskLevel,
      riskScore: tx.riskScore,
      fraudProbability: tx.fraudProbability,
      status: tx.status,
      cardLast4: tx.cardLast4 ?? null,
      location: tx.location ?? null,
      createdAt: tx.createdAt.toISOString(),
    })),
    serverTime: new Date().toISOString(),
  });
});

router.get("/command-center/stats", requireAuth, async (req, res): Promise<void> => {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    [{ fraudLast24h }],
    [{ totalToday }],
    [{ blockedCards }],
    [{ activeAlerts }],
    [{ autoBlocked }],
  ] = await Promise.all([
    db
      .select({ fraudLast24h: count() })
      .from(transactionsTable)
      .where(and(
        sql`${transactionsTable.status} IN ('declined', 'flagged')`,
        gte(transactionsTable.createdAt, last24h)
      )),
    db
      .select({ totalToday: count() })
      .from(transactionsTable)
      .where(gte(transactionsTable.createdAt, today)),
    db
      .select({ blockedCards: count() })
      .from(cardsTable)
      .where(eq(cardsTable.isBlocked, true)),
    db
      .select({ activeAlerts: count() })
      .from(alertsTable)
      .where(eq(alertsTable.isRead, false)),
    db
      .select({ autoBlocked: count() })
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.status, "declined"),
        gte(transactionsTable.createdAt, last24h)
      )),
  ]);

  const fraudNum = Number(fraudLast24h);
  let threatLevel = "LOW";
  if (fraudNum > 10) threatLevel = "CRITICAL";
  else if (fraudNum > 5) threatLevel = "HIGH";
  else if (fraudNum > 2) threatLevel = "MEDIUM";

  res.json({
    fraudLast24h: fraudNum,
    blockedCards: Number(blockedCards),
    activeAlerts: Number(activeAlerts),
    totalToday: Number(totalToday),
    threatLevel,
    autoBlocked: Number(autoBlocked),
  });
});

export default router;

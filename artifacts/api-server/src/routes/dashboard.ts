import { Router, type IRouter } from "express";
import { db, transactionsTable, cardsTable, alertsTable } from "@workspace/db";
import { eq, desc, count, avg, sum, and, gte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = req.auth!.role === "admin" ? undefined : req.auth!.userId;

  const txCondition = userId ? eq(transactionsTable.userId, userId) : undefined;
  const cardCondition = userId ? eq(cardsTable.userId, userId) : undefined;
  const alertCondition = userId
    ? and(eq(alertsTable.userId, userId), eq(alertsTable.isRead, false))
    : eq(alertsTable.isRead, false);

  const [
    [{ total }],
    [{ flagged }],
    [{ declined }],
    [{ totalAmount }],
    [{ avgRisk }],
    [{ blockedCards }],
    [{ activeAlerts }],
  ] = await Promise.all([
    db.select({ total: count() }).from(transactionsTable).where(txCondition),
    db
      .select({ flagged: count() })
      .from(transactionsTable)
      .where(txCondition ? and(txCondition, eq(transactionsTable.status, "flagged")) : eq(transactionsTable.status, "flagged")),
    db
      .select({ declined: count() })
      .from(transactionsTable)
      .where(txCondition ? and(txCondition, eq(transactionsTable.status, "declined")) : eq(transactionsTable.status, "declined")),
    db.select({ totalAmount: sum(transactionsTable.amount) }).from(transactionsTable).where(txCondition),
    db.select({ avgRisk: avg(transactionsTable.riskScore) }).from(transactionsTable).where(txCondition),
    db.select({ blockedCards: count() }).from(cardsTable).where(
      cardCondition ? and(cardCondition, eq(cardsTable.isBlocked, true)) : eq(cardsTable.isBlocked, true)
    ),
    db.select({ activeAlerts: count() }).from(alertsTable).where(alertCondition),
  ]);

  const totalNum = Number(total);
  const flaggedNum = Number(flagged);
  const declinedNum = Number(declined);

  res.json({
    totalTransactions: totalNum,
    totalFlagged: flaggedNum,
    totalDeclined: declinedNum,
    fraudRate: totalNum > 0 ? Math.round(((flaggedNum + declinedNum) / totalNum) * 10000) / 100 : 0,
    totalAmount: Number(totalAmount ?? 0),
    blockedCards: Number(blockedCards),
    activeAlerts: Number(activeAlerts),
    avgRiskScore: Math.round(Number(avgRisk ?? 0) * 10) / 10,
  });
});

router.get("/dashboard/fraud-trend", requireAuth, async (req, res): Promise<void> => {
  const userId = req.auth!.role === "admin" ? undefined : req.auth!.userId;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const condition = userId
    ? and(eq(transactionsTable.userId, userId), gte(transactionsTable.createdAt, thirtyDaysAgo))
    : gte(transactionsTable.createdAt, thirtyDaysAgo);

  const rows = await db
    .select({
      date: sql<string>`DATE(${transactionsTable.createdAt})`.as("date"),
      total: count(),
      flagged: sql<number>`COUNT(*) FILTER (WHERE ${transactionsTable.status} IN ('flagged','declined'))`.as("flagged"),
      approved: sql<number>`COUNT(*) FILTER (WHERE ${transactionsTable.status} = 'approved')`.as("approved"),
    })
    .from(transactionsTable)
    .where(condition)
    .groupBy(sql`DATE(${transactionsTable.createdAt})`)
    .orderBy(sql`DATE(${transactionsTable.createdAt})`);

  res.json(
    rows.map((r) => ({
      date: r.date,
      total: Number(r.total),
      flagged: Number(r.flagged),
      approved: Number(r.approved),
    }))
  );
});

router.get("/dashboard/risk-breakdown", requireAuth, async (req, res): Promise<void> => {
  const userId = req.auth!.role === "admin" ? undefined : req.auth!.userId;
  const condition = userId ? eq(transactionsTable.userId, userId) : undefined;

  const rows = await db
    .select({
      level: transactionsTable.riskLevel,
      count: count(),
    })
    .from(transactionsTable)
    .where(condition)
    .groupBy(transactionsTable.riskLevel);

  const total = rows.reduce((s, r) => s + Number(r.count), 0);

  const levels = ["low", "medium", "high", "critical"];
  const result = levels.map((level) => {
    const row = rows.find((r) => r.level === level);
    const cnt = row ? Number(row.count) : 0;
    return {
      level,
      count: cnt,
      percentage: total > 0 ? Math.round((cnt / total) * 1000) / 10 : 0,
    };
  });

  res.json(result);
});

router.get("/dashboard/recent-fraud", requireAuth, async (req, res): Promise<void> => {
  const userId = req.auth!.role === "admin" ? undefined : req.auth!.userId;

  const condition = userId
    ? and(
        eq(transactionsTable.userId, userId),
        sql`${transactionsTable.riskLevel} IN ('high','critical')`
      )
    : sql`${transactionsTable.riskLevel} IN ('high','critical')`;

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(condition)
    .orderBy(desc(transactionsTable.createdAt))
    .limit(10);

  res.json(
    rows.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      merchant: tx.merchant,
      merchantCategory: tx.merchantCategory,
      cardId: tx.cardId,
      cardLast4: tx.cardLast4 ?? undefined,
      userId: tx.userId,
      status: tx.status,
      riskScore: tx.riskScore,
      riskLevel: tx.riskLevel,
      fraudProbability: tx.fraudProbability,
      location: tx.location ?? undefined,
      ipAddress: tx.ipAddress ?? undefined,
      deviceId: tx.deviceId ?? undefined,
      reviewNote: tx.reviewNote ?? null,
      reviewedBy: tx.reviewedBy ?? null,
      createdAt: tx.createdAt.toISOString(),
    }))
  );
});

export default router;

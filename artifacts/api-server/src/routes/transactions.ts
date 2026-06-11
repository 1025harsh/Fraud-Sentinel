import { Router, type IRouter } from "express";
import { db, transactionsTable, cardsTable, alertsTable, fraudLogsTable, usersTable, fraudCasesTable } from "@workspace/db";
import { eq, and, desc, ilike, or, count } from "drizzle-orm";
import {
  ListTransactionsQueryParams,
  CreateTransactionBody,
  GetTransactionParams,
  ReviewTransactionParams,
  ReviewTransactionBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { analyzeFraud } from "../lib/fraud-engine";
import { sendFraudAlert } from "../lib/email";
import { auditLog } from "../lib/audit";
import { createNotification } from "../lib/notifications";
import { broadcast } from "../lib/websocket";

const router: IRouter = Router();

function txToJson(tx: typeof transactionsTable.$inferSelect) {
  return {
    id: tx.id,
    amount: tx.amount,
    merchant: tx.merchant,
    merchantCategory: tx.merchantCategory,
    cardId: tx.cardId,
    cardLast4: tx.cardLast4 ?? null,
    userId: tx.userId,
    status: tx.status,
    riskScore: tx.riskScore,
    riskLevel: tx.riskLevel,
    fraudProbability: tx.fraudProbability,
    location: tx.location ?? null,
    ipAddress: tx.ipAddress ?? null,
    deviceId: tx.deviceId ?? null,
    reviewNote: tx.reviewNote ?? null,
    reviewedBy: tx.reviewedBy ?? null,
    createdAt: tx.createdAt.toISOString(),
  };
}

router.get("/transactions", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListTransactionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { page, limit, status, riskLevel, cardId, search } = parsed.data;
  const offset = ((page ?? 1) - 1) * (limit ?? 20);

  const conditions = [];
  if (req.auth!.role !== "admin") {
    conditions.push(eq(transactionsTable.userId, req.auth!.userId));
  }
  if (status) conditions.push(eq(transactionsTable.status, status));
  if (riskLevel) conditions.push(eq(transactionsTable.riskLevel, riskLevel));
  if (cardId) conditions.push(eq(transactionsTable.cardId, cardId));
  if (search) {
    conditions.push(
      or(
        ilike(transactionsTable.merchant, `%${search}%`),
        ilike(transactionsTable.merchantCategory, `%${search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(transactionsTable)
      .where(whereClause)
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit ?? 20)
      .offset(offset),
    db.select({ total: count() }).from(transactionsTable).where(whereClause),
  ]);

  res.json({
    transactions: rows.map(txToJson),
    total: Number(total),
    page: page ?? 1,
    limit: limit ?? 20,
  });
});

router.post("/transactions", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;

  const [card] = await db
    .select()
    .from(cardsTable)
    .where(and(eq(cardsTable.id, data.cardId), eq(cardsTable.userId, req.auth!.userId)));
  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }
  if (card.isBlocked) {
    res.status(400).json({ error: "Card is blocked" });
    return;
  }

  const analysis = analyzeFraud({
    amount: data.amount,
    merchant: data.merchant,
    merchantCategory: data.merchantCategory,
    location: data.location,
    ipAddress: data.ipAddress,
    deviceId: data.deviceId,
  });

  let status: string;
  if (analysis.riskScore >= 81) {
    status = "declined";
  } else if (analysis.riskScore >= 61) {
    status = "flagged";
  } else {
    status = "approved";
  }

  const [tx] = await db
    .insert(transactionsTable)
    .values({
      amount: data.amount,
      merchant: data.merchant,
      merchantCategory: data.merchantCategory,
      cardId: data.cardId,
      cardLast4: card.last4,
      userId: req.auth!.userId,
      status,
      riskScore: analysis.riskScore,
      riskLevel: analysis.riskLevel,
      fraudProbability: analysis.fraudProbability,
      location: data.location,
      ipAddress: data.ipAddress,
      deviceId: data.deviceId,
    })
    .returning();

  await db.insert(fraudLogsTable).values({
    transactionId: tx.id,
    riskScore: analysis.riskScore,
    riskLevel: analysis.riskLevel,
    fraudProbability: analysis.fraudProbability,
    signals: analysis.signals,
  });

  // Broadcast via WebSocket
  broadcast(
    {
      type: "transaction",
      payload: { ...txToJson(tx), signals: analysis.signals },
      timestamp: new Date().toISOString(),
    },
    req.auth!.userId
  );

  // High/critical: create alert, notification, fraud case, email
  if (analysis.riskScore >= 61) {
    const alertType = analysis.riskScore >= 81 ? "fraud_detected" : "high_risk";
    await db.insert(alertsTable).values({
      userId: req.auth!.userId,
      type: alertType,
      message: `${status === "declined" ? "FRAUD DETECTED" : "High-risk transaction"}: $${data.amount.toFixed(2)} at ${data.merchant}`,
      transactionId: tx.id,
      isRead: false,
    });

    // Create fraud case for critical
    if (analysis.riskScore >= 81) {
      const caseNumber = `FG-${Date.now().toString(36).toUpperCase()}`;
      await db.insert(fraudCasesTable).values({
        caseNumber,
        userId: req.auth!.userId,
        transactionId: tx.id,
        status: "open",
        priority: "high",
        title: `Fraud Detected: $${data.amount.toFixed(2)} at ${data.merchant}`,
        description: `Automated fraud case. Risk score: ${analysis.riskScore}. Signals: ${analysis.signals.join("; ")}`,
        riskScore: String(analysis.riskScore),
        amountInvolved: String(data.amount),
      });

      // Auto-block card on critical
      await db
        .update(cardsTable)
        .set({ isBlocked: true, blockReason: `Auto-blocked: Fraud detected on transaction #${tx.id}` })
        .where(eq(cardsTable.id, data.cardId));
    }

    // In-app notification
    void createNotification({
      userId: req.auth!.userId,
      type: alertType,
      title: status === "declined" ? "Fraud Detected — Card Blocked" : "High-Risk Transaction Flagged",
      message: `$${data.amount.toFixed(2)} at ${data.merchant} — Risk Score: ${analysis.riskScore}/100`,
      metadata: { transactionId: tx.id, riskScore: analysis.riskScore },
    });

    // Email alert (fire-and-forget)
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.auth!.userId));
    if (user) {
      void sendFraudAlert({
        userName: user.name,
        userEmail: user.email,
        amount: data.amount,
        merchant: data.merchant,
        riskScore: analysis.riskScore,
        riskLevel: analysis.riskLevel,
        signals: analysis.signals,
        transactionId: tx.id,
        cardLast4: card.last4,
      });
    }
  }

  await auditLog({ req, action: "transaction_created", resource: "transaction", resourceId: tx.id });

  res.status(201).json(txToJson(tx));
});

router.get("/transactions/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetTransactionParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const conditions = [eq(transactionsTable.id, params.data.id)];
  if (req.auth!.role !== "admin") conditions.push(eq(transactionsTable.userId, req.auth!.userId));

  const [tx] = await db.select().from(transactionsTable).where(and(...conditions));
  if (!tx) { res.status(404).json({ error: "Transaction not found" }); return; }

  // Fetch signals from fraud log
  const [log] = await db
    .select()
    .from(fraudLogsTable)
    .where(eq(fraudLogsTable.transactionId, tx.id))
    .limit(1);

  res.json({ ...txToJson(tx), signals: log?.signals ?? [] });
});

router.patch("/transactions/:id/review", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ReviewTransactionParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = ReviewTransactionBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, params.data.id));
  if (!tx) { res.status(404).json({ error: "Transaction not found" }); return; }

  const [updated] = await db
    .update(transactionsTable)
    .set({ status: body.data.decision, reviewNote: body.data.note ?? null, reviewedBy: req.auth!.userId })
    .where(eq(transactionsTable.id, params.data.id))
    .returning();

  await auditLog({ req, action: "transaction_reviewed", resource: "transaction", resourceId: tx.id, details: body.data.decision });
  res.json(txToJson(updated));
});

export default router;

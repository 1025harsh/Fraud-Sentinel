import { Router, type IRouter } from "express";
import { db, alertsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { ListAlertsQueryParams, MarkAlertReadParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function alertToJson(a: typeof alertsTable.$inferSelect) {
  return {
    id: a.id,
    userId: a.userId,
    type: a.type,
    message: a.message,
    transactionId: a.transactionId ?? null,
    isRead: a.isRead,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/alerts", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListAlertsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { unreadOnly, limit } = parsed.data;

  const conditions = [eq(alertsTable.userId, req.auth!.userId)];
  if (unreadOnly) conditions.push(eq(alertsTable.isRead, false));

  const alerts = await db
    .select()
    .from(alertsTable)
    .where(and(...conditions))
    .orderBy(desc(alertsTable.createdAt))
    .limit(limit ?? 20);

  res.json(alerts.map(alertToJson));
});

router.patch("/alerts/:id/read", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = MarkAlertReadParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [alert] = await db
    .select()
    .from(alertsTable)
    .where(and(eq(alertsTable.id, params.data.id), eq(alertsTable.userId, req.auth!.userId)));
  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  const [updated] = await db
    .update(alertsTable)
    .set({ isRead: true })
    .where(eq(alertsTable.id, params.data.id))
    .returning();

  res.json(alertToJson(updated));
});

export default router;

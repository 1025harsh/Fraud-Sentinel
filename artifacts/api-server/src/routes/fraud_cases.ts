import { Router, type IRouter } from "express";
import { db, fraudCasesTable, transactionsTable, usersTable } from "@workspace/db";
import { eq, desc, and, count, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { auditLog } from "../lib/audit";

const router: IRouter = Router();

function caseToJson(c: typeof fraudCasesTable.$inferSelect) {
  return {
    id: c.id,
    caseNumber: c.caseNumber,
    userId: c.userId,
    transactionId: c.transactionId ?? null,
    assignedTo: c.assignedTo ?? null,
    status: c.status,
    priority: c.priority,
    title: c.title,
    description: c.description ?? null,
    resolution: c.resolution ?? null,
    riskScore: c.riskScore ? Number(c.riskScore) : null,
    amountInvolved: c.amountInvolved ? Number(c.amountInvolved) : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    closedAt: c.closedAt?.toISOString() ?? null,
  };
}

router.get("/fraud-cases", requireAuth, async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const offset = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  const conditions = [];
  if (req.auth!.role !== "admin") conditions.push(eq(fraudCasesTable.userId, req.auth!.userId));
  if (status) conditions.push(eq(fraudCasesTable.status, status));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [cases, [{ total }]] = await Promise.all([
    db.select().from(fraudCasesTable).where(where).orderBy(desc(fraudCasesTable.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(fraudCasesTable).where(where),
  ]);

  res.json({ cases: cases.map(caseToJson), total: Number(total), page, limit });
});

router.get("/fraud-cases/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const conditions = [eq(fraudCasesTable.id, id)];
  if (req.auth!.role !== "admin") conditions.push(eq(fraudCasesTable.userId, req.auth!.userId));

  const [fc] = await db.select().from(fraudCasesTable).where(and(...conditions));
  if (!fc) { res.status(404).json({ error: "Case not found" }); return; }
  res.json(caseToJson(fc));
});

router.patch("/fraud-cases/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { status, priority, resolution, assignedTo } = req.body ?? {};

  const [fc] = await db.select().from(fraudCasesTable).where(eq(fraudCasesTable.id, id));
  if (!fc) { res.status(404).json({ error: "Case not found" }); return; }

  const updates: Partial<typeof fraudCasesTable.$inferInsert> = { updatedAt: new Date() };
  if (status) updates.status = status;
  if (priority) updates.priority = priority;
  if (resolution !== undefined) updates.resolution = resolution;
  if (assignedTo !== undefined) updates.assignedTo = assignedTo;
  if (status === "closed" || status === "resolved") updates.closedAt = new Date();

  const [updated] = await db.update(fraudCasesTable).set(updates).where(eq(fraudCasesTable.id, id)).returning();
  await auditLog({ req, action: "fraud_case_updated", resource: "fraud_case", resourceId: id, details: `status=${status}` });
  res.json(caseToJson(updated));
});

export default router;

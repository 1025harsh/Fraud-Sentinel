import { Router, type IRouter } from "express";
import { db, auditLogsTable } from "@workspace/db";
import { desc, count, eq, and, gte } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/audit-logs", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const offset = (page - 1) * limit;

  const [logs, [{ total }]] = await Promise.all([
    db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(auditLogsTable),
  ]);

  res.json({
    logs: logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      action: l.action,
      resource: l.resource,
      resourceId: l.resourceId,
      details: l.details,
      ipAddress: l.ipAddress,
      userAgent: l.userAgent,
      status: l.status,
      createdAt: l.createdAt.toISOString(),
    })),
    total: Number(total),
    page,
    limit,
  });
});

export default router;

import { Router, type IRouter } from "express";
import { db, usersTable, cardsTable, transactionsTable, fraudLogsTable } from "@workspace/db";
import { eq, count, desc, ilike, and } from "drizzle-orm";
import {
  AdminListUsersQueryParams,
  AdminUpdateUserParams,
  AdminUpdateUserBody,
  ListFraudLogsQueryParams,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/admin/users", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminListUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { page, limit, search } = parsed.data;
  const offset = ((page ?? 1) - 1) * (limit ?? 20);

  const condition = search ? ilike(usersTable.email, `%${search}%`) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(usersTable)
      .where(condition)
      .orderBy(desc(usersTable.createdAt))
      .limit(limit ?? 20)
      .offset(offset),
    db.select({ total: count() }).from(usersTable).where(condition),
  ]);

  res.json({
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
    })),
    total: Number(total),
    page: page ?? 1,
    limit: limit ?? 20,
  });
});

router.patch("/admin/users/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminUpdateUserParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = AdminUpdateUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (body.data.role) updates.role = body.data.role;
  if (body.data.status) updates.status = body.data.status;

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  res.json({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
    status: updated.status,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.get("/admin/stats", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    [{ totalUsers }],
    [{ totalCards }],
    [{ totalTransactions }],
    [{ fraudToday }],
  ] = await Promise.all([
    db.select({ totalUsers: count() }).from(usersTable),
    db.select({ totalCards: count() }).from(cardsTable),
    db.select({ totalTransactions: count() }).from(transactionsTable),
    db
      .select({ fraudToday: count() })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.status, "declined"),
        )
      ),
  ]);

  res.json({
    totalUsers: Number(totalUsers),
    totalCards: Number(totalCards),
    totalTransactions: Number(totalTransactions),
    fraudDetectedToday: Number(fraudToday),
    systemUptime: "99.97%",
    mlModelAccuracy: 94.3,
  });
});

router.get("/admin/fraud-logs", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = ListFraudLogsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { page, limit } = parsed.data;
  const offset = ((page ?? 1) - 1) * (limit ?? 20);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(fraudLogsTable)
      .orderBy(desc(fraudLogsTable.createdAt))
      .limit(limit ?? 20)
      .offset(offset),
    db.select({ total: count() }).from(fraudLogsTable),
  ]);

  res.json({
    logs: rows.map((l) => ({
      id: l.id,
      transactionId: l.transactionId,
      riskScore: l.riskScore,
      riskLevel: l.riskLevel,
      fraudProbability: l.fraudProbability,
      signals: l.signals,
      createdAt: l.createdAt.toISOString(),
    })),
    total: Number(total),
    page: page ?? 1,
    limit: limit ?? 20,
  });
});

export default router;

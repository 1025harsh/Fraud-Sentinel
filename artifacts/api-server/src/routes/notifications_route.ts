import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function notifToJson(n: typeof notificationsTable.$inferSelect) {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    emailSent: n.emailSent,
    metadata: n.metadata ? JSON.parse(n.metadata) : null,
    createdAt: n.createdAt.toISOString(),
  };
}

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const unreadOnly = req.query.unread === "true";
  const conditions = [eq(notificationsTable.userId, req.auth!.userId)];
  if (unreadOnly) conditions.push(eq(notificationsTable.isRead, false));

  const [notifs, [{ total }], [{ unread }]] = await Promise.all([
    db.select().from(notificationsTable).where(and(...conditions)).orderBy(desc(notificationsTable.createdAt)).limit(limit),
    db.select({ total: count() }).from(notificationsTable).where(eq(notificationsTable.userId, req.auth!.userId)),
    db.select({ unread: count() }).from(notificationsTable).where(and(eq(notificationsTable.userId, req.auth!.userId), eq(notificationsTable.isRead, false))),
  ]);

  res.json({ notifications: notifs.map(notifToJson), total: Number(total), unread: Number(unread) });
});

router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const [notif] = await db.select().from(notificationsTable).where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.auth!.userId)));
  if (!notif) { res.status(404).json({ error: "Not found" }); return; }
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id));
  res.json({ message: "Marked as read" });
});

router.patch("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, req.auth!.userId));
  res.json({ message: "All notifications marked as read" });
});

export default router;

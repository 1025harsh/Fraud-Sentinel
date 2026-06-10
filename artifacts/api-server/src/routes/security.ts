import { Router, type IRouter } from "express";
import { db, loginHistoryTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function loginToJson(l: typeof loginHistoryTable.$inferSelect) {
  return {
    id: l.id,
    userId: l.userId,
    ipAddress: l.ipAddress ?? null,
    userAgent: l.userAgent ?? null,
    deviceFingerprint: l.deviceFingerprint ?? null,
    deviceName: l.deviceName ?? null,
    location: l.location ?? null,
    isTrusted: l.isTrusted,
    loginAt: l.loginAt.toISOString(),
  };
}

router.get("/security/login-history", requireAuth, async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit ?? 20), 50);
  const history = await db
    .select()
    .from(loginHistoryTable)
    .where(eq(loginHistoryTable.userId, req.auth!.userId))
    .orderBy(desc(loginHistoryTable.loginAt))
    .limit(limit);
  res.json(history.map(loginToJson));
});

router.get("/security/devices", requireAuth, async (req, res): Promise<void> => {
  // Return unique devices by fingerprint, most recent login first
  const history = await db
    .select()
    .from(loginHistoryTable)
    .where(eq(loginHistoryTable.userId, req.auth!.userId))
    .orderBy(desc(loginHistoryTable.loginAt))
    .limit(50);

  // Deduplicate by fingerprint, keeping most recent
  const seen = new Set<string>();
  const devices = history.filter((h) => {
    const key = h.deviceFingerprint ?? h.userAgent ?? h.id.toString();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  res.json(devices.map(loginToJson));
});

router.delete("/security/devices/:id/remove", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(loginHistoryTable).where(eq(loginHistoryTable.id, id));
  res.json({ message: "Device removed" });
});

export default router;

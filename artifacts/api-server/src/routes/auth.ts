import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, loginHistoryTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody, RegisterBody } from "@workspace/api-zod";
import { signToken, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function parseDeviceName(ua: string): string {
  if (!ua) return "Unknown Device";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android Device";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Mac/i.test(ua)) return "Mac";
  if (/Linux/i.test(ua)) return "Linux PC";
  return "Unknown Device";
}

function getBrowserFingerprint(ua: string, ip: string): string {
  // Simple deterministic fingerprint from UA + IP for demo purposes
  let hash = 5381;
  const str = ua + ip;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role });

  // Log login history
  const ua = String(req.headers["user-agent"] ?? "");
  const ip = String(req.ip ?? req.socket.remoteAddress ?? "");
  const fingerprint = getBrowserFingerprint(ua, ip);
  const deviceName = parseDeviceName(ua);

  // Check if this device was seen before
  const [existing] = await db
    .select()
    .from(loginHistoryTable)
    .where(eq(loginHistoryTable.deviceFingerprint, fingerprint))
    .limit(1);

  await db.insert(loginHistoryTable).values({
    userId: user.id,
    ipAddress: ip,
    userAgent: ua,
    deviceFingerprint: fingerprint,
    deviceName,
    location: "Online",
    isTrusted: existing ? true : false,
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password, name } = parsed.data;
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash, name, role: "user", status: "active" })
    .returning();
  const token = signToken({ userId: user.id, role: user.role });
  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.auth!.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;

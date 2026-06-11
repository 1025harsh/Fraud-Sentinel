import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, usersTable, loginHistoryTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody, RegisterBody } from "@workspace/api-zod";
import { signToken, requireAuth } from "../middlewares/auth";
import { sendLoginAlert, sendPasswordResetEmail } from "../lib/email";
import { auditLog } from "../lib/audit";
import { createNotification } from "../lib/notifications";

const router: IRouter = Router();

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

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

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    res.status(423).json({ error: `Account locked. Try again in ${remaining} minute(s).` });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const newAttempts = (user.failedLoginAttempts ?? 0) + 1;
    const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;
    await db
      .update(usersTable)
      .set({
        failedLoginAttempts: newAttempts,
        ...(shouldLock ? { lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) } : {}),
      })
      .where(eq(usersTable.id, user.id));

    await auditLog({ req, userId: user.id, action: "login_failed", resource: "auth", status: "failure" });
    res.status(401).json({
      error: shouldLock
        ? `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts. Try again in 15 minutes.`
        : "Invalid email or password",
    });
    return;
  }

  // Reset failed attempts on success
  await db
    .update(usersTable)
    .set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(usersTable.id, user.id));

  const token = signToken({ userId: user.id, role: user.role });

  // Log login history & detect new device
  const ua = String(req.headers["user-agent"] ?? "");
  const ip = String(req.ip ?? req.socket.remoteAddress ?? "");
  const fingerprint = getBrowserFingerprint(ua, ip);
  const deviceName = parseDeviceName(ua);

  const [existingDevice] = await db
    .select()
    .from(loginHistoryTable)
    .where(eq(loginHistoryTable.deviceFingerprint, fingerprint))
    .limit(1);

  const isNewDevice = !existingDevice;

  await db.insert(loginHistoryTable).values({
    userId: user.id,
    ipAddress: ip,
    userAgent: ua,
    deviceFingerprint: fingerprint,
    deviceName,
    location: "Online",
    isTrusted: !isNewDevice,
  });

  await auditLog({ req, userId: user.id, action: "login_success", resource: "auth" });

  // Fire-and-forget alerts for new device
  if (isNewDevice) {
    void createNotification({
      userId: user.id,
      type: "new_device_login",
      title: "New Device Login",
      message: `A new login was detected from ${deviceName} (${ip})`,
      metadata: { deviceName, ip, fingerprint },
    });
    void sendLoginAlert({
      userName: user.name,
      email: user.email,
      userEmail: user.email,
      deviceName,
      ipAddress: ip,
      isNewDevice: true,
      loginAt: new Date().toLocaleString(),
    });
  }

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
  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash, name, role: "user", status: "active" })
    .returning();

  await auditLog({ req, userId: user.id, action: "register", resource: "auth" });

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

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  // Always return success to prevent email enumeration
  if (!user) {
    res.json({ message: "If that email exists, a reset code was sent." });
    return;
  }

  // Generate 6-digit OTP
  const resetToken = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  await db
    .update(usersTable)
    .set({ passwordResetToken: resetToken, passwordResetExpires: expires })
    .where(eq(usersTable.id, user.id));

  await auditLog({ req, userId: user.id, action: "password_reset_requested", resource: "auth" });

  void sendPasswordResetEmail({
    userName: user.name,
    userEmail: user.email,
    resetToken,
    expiresIn: "15 minutes",
  });

  res.json({ message: "If that email exists, a reset code was sent." });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { email, token, newPassword } = req.body ?? {};
  if (!email || !token || !newPassword) {
    res.status(400).json({ error: "email, token and newPassword are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (
    !user ||
    user.passwordResetToken !== String(token) ||
    !user.passwordResetExpires ||
    user.passwordResetExpires < new Date()
  ) {
    res.status(400).json({ error: "Invalid or expired reset code" });
    return;
  }

  const passwordHash = await bcrypt.hash(String(newPassword), 12);
  await db
    .update(usersTable)
    .set({ passwordHash, passwordResetToken: null, passwordResetExpires: null, failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(usersTable.id, user.id));

  await auditLog({ req, userId: user.id, action: "password_reset_completed", resource: "auth" });
  res.json({ message: "Password reset successfully" });
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
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;

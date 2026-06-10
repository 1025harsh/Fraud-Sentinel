import { Router, type IRouter } from "express";
import { db, virtualCardsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { GenerateVirtualCardBody, DeactivateVirtualCardParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function vcToJson(vc: typeof virtualCardsTable.$inferSelect) {
  return {
    id: vc.id,
    userId: vc.userId,
    cardNumber: vc.cardNumber,
    last4: vc.last4,
    brand: vc.brand,
    cvv: vc.cvv,
    expiryMonth: vc.expiryMonth,
    expiryYear: vc.expiryYear,
    isActive: vc.isActive,
    usageLimit: vc.usageLimit,
    timesUsed: vc.timesUsed,
    note: vc.note ?? null,
    createdAt: vc.createdAt.toISOString(),
    expiresAt: vc.expiresAt ? vc.expiresAt.toISOString() : null,
  };
}

function generateCardNumber(): string {
  // Generate a realistic-looking 16-digit Visa number starting with 4
  const prefix = "4";
  const digits = Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join("");
  return prefix + digits;
}

function generateCvv(): string {
  return String(Math.floor(Math.random() * 900) + 100);
}

router.get("/virtual-cards", requireAuth, async (req, res): Promise<void> => {
  const cards = await db
    .select()
    .from(virtualCardsTable)
    .where(eq(virtualCardsTable.userId, req.auth!.userId));
  res.json(cards.map(vcToJson));
});

router.post("/virtual-cards/generate", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateVirtualCardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { usageLimit = 1, note, validHours = 24 } = parsed.data;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + (validHours ?? 24) * 60 * 60 * 1000);

  // Card expiry: 1 month from now
  const cardNumber = generateCardNumber();
  const last4 = cardNumber.slice(-4);
  const cvv = generateCvv();
  const expiryMonth = now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2;
  const expiryYear = expiryMonth === 1 ? now.getFullYear() + 1 : now.getFullYear();

  const [vc] = await db
    .insert(virtualCardsTable)
    .values({
      userId: req.auth!.userId,
      cardNumber,
      last4,
      brand: "visa",
      cvv,
      expiryMonth,
      expiryYear,
      isActive: true,
      usageLimit: usageLimit ?? 1,
      timesUsed: 0,
      note: note ?? null,
      expiresAt,
    })
    .returning();

  res.status(201).json(vcToJson(vc));
});

router.patch("/virtual-cards/:id/deactivate", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeactivateVirtualCardParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [vc] = await db
    .select()
    .from(virtualCardsTable)
    .where(and(eq(virtualCardsTable.id, params.data.id), eq(virtualCardsTable.userId, req.auth!.userId)));

  if (!vc) {
    res.status(404).json({ error: "Virtual card not found" });
    return;
  }

  const [updated] = await db
    .update(virtualCardsTable)
    .set({ isActive: false })
    .where(eq(virtualCardsTable.id, params.data.id))
    .returning();

  res.json(vcToJson(updated));
});

export default router;

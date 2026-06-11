import { db, notificationsTable } from "@workspace/db";
import { logger } from "./logger";

export async function createNotification(opts: {
  userId: number;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  emailSent?: boolean;
}): Promise<void> {
  try {
    await db.insert(notificationsTable).values({
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      isRead: false,
      emailSent: opts.emailSent ?? false,
      metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to create notification");
  }
}

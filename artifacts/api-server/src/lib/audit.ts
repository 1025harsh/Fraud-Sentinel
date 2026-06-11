import { db, auditLogsTable } from "@workspace/db";
import { Request } from "express";
import { logger } from "./logger";

export async function auditLog(opts: {
  req?: Request;
  userId?: number;
  action: string;
  resource: string;
  resourceId?: string | number;
  details?: string;
  status?: "success" | "failure";
}): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      userId: opts.userId ?? opts.req?.auth?.userId ?? null,
      action: opts.action,
      resource: opts.resource,
      resourceId: opts.resourceId ? String(opts.resourceId) : null,
      details: opts.details ?? null,
      ipAddress: opts.req ? String(opts.req.ip ?? opts.req.socket.remoteAddress ?? "") : null,
      userAgent: opts.req ? String(opts.req.headers["user-agent"] ?? "") : null,
      status: opts.status ?? "success",
    });
  } catch (err) {
    logger.error({ err }, "Failed to write audit log");
  }
}

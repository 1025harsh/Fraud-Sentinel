import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import jwt from "jsonwebtoken";
import { logger } from "./logger";

const JWT_SECRET = process.env.SESSION_SECRET ?? "fraud-guard-secret-key";

let wss: WebSocketServer | null = null;

export interface WsEvent {
  type: "transaction" | "alert" | "card_blocked" | "fraud_detected";
  payload: Record<string, unknown>;
  timestamp: string;
}

export function initWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const token = url.searchParams.get("token");

    let userId: number | null = null;
    let role = "user";

    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
        userId = payload.userId;
        role = payload.role;
      } catch {
        ws.close(1008, "Invalid token");
        return;
      }
    }

    (ws as any).userId = userId;
    (ws as any).role = role;

    ws.send(JSON.stringify({
      type: "connected",
      payload: { message: "FraudGuard Live Feed connected", userId, role },
      timestamp: new Date().toISOString(),
    }));

    ws.on("close", () => {
      logger.debug({ userId }, "WS client disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ err }, "WS error");
    });
  });

  logger.info("WebSocket server initialized on /api/ws");
}

export function broadcast(event: WsEvent, targetUserId?: number): void {
  if (!wss) return;

  const message = JSON.stringify(event);

  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;

    const cUserId = (client as any).userId as number | null;
    const cRole = (client as any).role as string;

    // Admins receive all events; users only receive their own events
    if (targetUserId && cRole !== "admin" && cUserId !== targetUserId) return;

    client.send(message);
  });
}

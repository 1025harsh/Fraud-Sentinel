import nodemailer from "nodemailer";
import { logger } from "./logger";

const SMTP_EMAIL = process.env.SMTP_EMAIL ?? "";
const SMTP_PASSWORD = process.env.SMTP_PASSWORD ?? "";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "hhr135696@gmail.com";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!SMTP_EMAIL || !SMTP_PASSWORD) {
    logger.warn("SMTP not configured — email skipped");
    return false;
  }
  try {
    await getTransporter().sendMail({
      from: `"FraudGuard Alerts" <${SMTP_EMAIL}>`,
      to: Array.isArray(payload.to) ? payload.to.join(", ") : payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send email");
    return false;
  }
}

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0d1117; color: #e6edf3; padding: 32px;
`;
const CARD_STYLE = `
  background: #161b22; border: 1px solid #30363d; border-radius: 8px;
  padding: 24px; max-width: 560px; margin: 0 auto;
`;
const BADGE = (color: string) =>
  `display:inline-block;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:700;background:${color}20;color:${color};border:1px solid ${color}40`;

function fraudAlertHtml(opts: {
  userName: string; amount: number; merchant: string;
  riskScore: number; riskLevel: string; signals: string[];
  transactionId: number; cardLast4?: string | null;
}) {
  const color = opts.riskLevel === "critical" ? "#f85149" : opts.riskLevel === "high" ? "#d29922" : "#3fb950";
  return `<div style="${BASE_STYLE}"><div style="${CARD_STYLE}">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <span style="font-size:28px">🛡️</span>
      <div><h1 style="margin:0;font-size:20px">FraudGuard Alert</h1>
      <p style="margin:0;color:#8b949e;font-size:13px">Real-time Fraud Detection</p></div>
    </div>
    <div style="background:#0d1117;border-radius:6px;padding:16px;margin-bottom:16px">
      <p style="margin:0 0 4px;color:#8b949e;font-size:12px;text-transform:uppercase">Risk Level</p>
      <span style="${BADGE(color)}">${opts.riskLevel.toUpperCase()} — Score ${opts.riskScore}/100</span>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#8b949e">Transaction #</td><td style="padding:8px 0">#${opts.transactionId}</td></tr>
      <tr><td style="padding:8px 0;color:#8b949e">Cardholder</td><td style="padding:8px 0">${opts.userName}</td></tr>
      <tr><td style="padding:8px 0;color:#8b949e">Amount</td><td style="padding:8px 0;font-weight:700">$${opts.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td></tr>
      <tr><td style="padding:8px 0;color:#8b949e">Merchant</td><td style="padding:8px 0">${opts.merchant}</td></tr>
      ${opts.cardLast4 ? `<tr><td style="padding:8px 0;color:#8b949e">Card</td><td style="padding:8px 0">•••• ${opts.cardLast4}</td></tr>` : ""}
    </table>
    <div style="margin-top:16px">
      <p style="color:#8b949e;font-size:12px;text-transform:uppercase;margin-bottom:8px">Risk Signals</p>
      <ul style="margin:0;padding-left:20px;color:#e6edf3;font-size:13px">
        ${opts.signals.map((s) => `<li style="margin-bottom:4px">${s}</li>`).join("")}
      </ul>
    </div>
    <p style="margin-top:24px;color:#8b949e;font-size:12px">This alert was generated automatically by FraudGuard at ${new Date().toLocaleString()}.</p>
  </div></div>`;
}

function loginAlertHtml(opts: {
  userName: string; email: string; deviceName: string;
  ipAddress: string; isNewDevice: boolean; loginAt: string;
}) {
  const icon = opts.isNewDevice ? "⚠️" : "✅";
  const title = opts.isNewDevice ? "New Device Login Detected" : "Login Notification";
  return `<div style="${BASE_STYLE}"><div style="${CARD_STYLE}">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <span style="font-size:28px">${icon}</span>
      <div><h1 style="margin:0;font-size:20px">FraudGuard — ${title}</h1>
      <p style="margin:0;color:#8b949e;font-size:13px">Security Alert</p></div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#8b949e">Account</td><td style="padding:8px 0">${opts.email}</td></tr>
      <tr><td style="padding:8px 0;color:#8b949e">Name</td><td style="padding:8px 0">${opts.userName}</td></tr>
      <tr><td style="padding:8px 0;color:#8b949e">Device</td><td style="padding:8px 0">${opts.deviceName}</td></tr>
      <tr><td style="padding:8px 0;color:#8b949e">IP Address</td><td style="padding:8px 0">${opts.ipAddress}</td></tr>
      <tr><td style="padding:8px 0;color:#8b949e">Time</td><td style="padding:8px 0">${opts.loginAt}</td></tr>
    </table>
    ${opts.isNewDevice ? `<div style="background:#d2992220;border:1px solid #d2992240;border-radius:6px;padding:12px;margin-top:16px;font-size:13px">⚠️ This is a new device that hasn't been seen before. If this wasn't you, please change your password immediately.</div>` : ""}
    <p style="margin-top:24px;color:#8b949e;font-size:12px">Generated by FraudGuard at ${new Date().toLocaleString()}.</p>
  </div></div>`;
}

function cardBlockedHtml(opts: {
  userName: string; cardLast4: string; reason: string; blockedAt: string;
}) {
  return `<div style="${BASE_STYLE}"><div style="${CARD_STYLE}">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <span style="font-size:28px">🔒</span>
      <div><h1 style="margin:0;font-size:20px">FraudGuard — Card Blocked</h1>
      <p style="margin:0;color:#8b949e;font-size:13px">Card Security Alert</p></div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#8b949e">Cardholder</td><td style="padding:8px 0">${opts.userName}</td></tr>
      <tr><td style="padding:8px 0;color:#8b949e">Card</td><td style="padding:8px 0">•••• •••• •••• ${opts.cardLast4}</td></tr>
      <tr><td style="padding:8px 0;color:#8b949e">Reason</td><td style="padding:8px 0">${opts.reason}</td></tr>
      <tr><td style="padding:8px 0;color:#8b949e">Blocked At</td><td style="padding:8px 0">${opts.blockedAt}</td></tr>
    </table>
    <p style="margin-top:24px;color:#8b949e;font-size:12px">Generated by FraudGuard at ${new Date().toLocaleString()}.</p>
  </div></div>`;
}

function passwordResetHtml(opts: { userName: string; resetToken: string; expiresIn: string }) {
  return `<div style="${BASE_STYLE}"><div style="${CARD_STYLE}">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <span style="font-size:28px">🔑</span>
      <div><h1 style="margin:0;font-size:20px">FraudGuard — Password Reset</h1></div>
    </div>
    <p>Hi ${opts.userName},</p>
    <p>You requested a password reset. Use the code below to reset your password. It expires in ${opts.expiresIn}.</p>
    <div style="background:#161b22;border:1px solid #30363d;border-radius:6px;padding:20px;text-align:center;margin:20px 0">
      <p style="margin:0 0 8px;color:#8b949e;font-size:12px">RESET CODE</p>
      <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:8px;font-family:monospace">${opts.resetToken}</p>
    </div>
    <p style="color:#8b949e;font-size:13px">If you didn't request this, ignore this email. Your password won't change.</p>
  </div></div>`;
}

// Public alert senders
export async function sendFraudAlert(opts: Parameters<typeof fraudAlertHtml>[0] & { userEmail: string }) {
  const html = fraudAlertHtml(opts);
  const subject = `🚨 [FraudGuard] ${opts.riskLevel.toUpperCase()} Risk — $${opts.amount} at ${opts.merchant}`;
  await Promise.all([
    sendEmail({ to: opts.userEmail, subject, html }),
    sendEmail({ to: ADMIN_EMAIL, subject: `[ADMIN] ${subject}`, html }),
  ]);
}

export async function sendLoginAlert(opts: Parameters<typeof loginAlertHtml>[0] & { userEmail: string }) {
  if (!opts.isNewDevice) return; // Only alert on new devices
  const html = loginAlertHtml(opts);
  const subject = `⚠️ [FraudGuard] New Device Login — ${opts.email}`;
  await Promise.all([
    sendEmail({ to: opts.userEmail, subject, html }),
    sendEmail({ to: ADMIN_EMAIL, subject, html }),
  ]);
}

export async function sendCardBlockedAlert(opts: Parameters<typeof cardBlockedHtml>[0] & { userEmail: string }) {
  const html = cardBlockedHtml(opts);
  const subject = `🔒 [FraudGuard] Card Blocked — ••••${opts.cardLast4}`;
  await Promise.all([
    sendEmail({ to: opts.userEmail, subject, html }),
    sendEmail({ to: ADMIN_EMAIL, subject, html }),
  ]);
}

export async function sendPasswordResetEmail(opts: Parameters<typeof passwordResetHtml>[0] & { userEmail: string }) {
  const html = passwordResetHtml(opts);
  await sendEmail({ to: opts.userEmail, subject: "🔑 [FraudGuard] Password Reset Code", html });
}

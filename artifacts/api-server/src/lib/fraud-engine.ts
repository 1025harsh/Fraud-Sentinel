export interface FraudSignals {
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  fraudProbability: number;
  signals: string[];
}

interface TransactionContext {
  amount: number;
  merchant: string;
  merchantCategory: string;
  location?: string;
  ipAddress?: string;
  deviceId?: string;
  hour?: number;
}

const HIGH_RISK_CATEGORIES = ["casino", "crypto", "wire_transfer", "gift_cards", "gambling", "forex", "atm_withdrawal"];
const SUSPICIOUS_MERCHANTS = ["unknown", "test", "temp", "anonymous"];
const HIGH_RISK_IP_PREFIXES = ["185.", "194.", "45.33.", "198.199.", "192.0."];

export function analyzeFraud(ctx: TransactionContext): FraudSignals {
  const signals: string[] = [];
  let score = 0;

  // --- Amount-based scoring ---
  if (ctx.amount > 10000) {
    score += 35;
    signals.push("Very large transaction amount (>$10,000)");
  } else if (ctx.amount > 5000) {
    score += 28;
    signals.push("Large transaction amount (>$5,000)");
  } else if (ctx.amount > 2000) {
    score += 20;
    signals.push("High transaction amount (>$2,000)");
  } else if (ctx.amount > 1000) {
    score += 12;
    signals.push("Elevated transaction amount (>$1,000)");
  } else if (ctx.amount < 1) {
    score += 18;
    signals.push("Micro-transaction — possible card testing");
  }

  // --- Merchant category risk ---
  const cat = ctx.merchantCategory.toLowerCase();
  if (HIGH_RISK_CATEGORIES.some((c) => cat.includes(c))) {
    score += 25;
    signals.push(`High-risk merchant category: ${ctx.merchantCategory}`);
  }

  // --- Suspicious merchant name ---
  const merchant = ctx.merchant.toLowerCase();
  if (SUSPICIOUS_MERCHANTS.some((m) => merchant.includes(m))) {
    score += 22;
    signals.push("Suspicious merchant name pattern");
  }

  // --- Rapid round-number amounts (classic fraud signal) ---
  if (ctx.amount % 100 === 0 && ctx.amount >= 500) {
    score += 8;
    signals.push("Round-number high-value amount");
  }

  // --- Time-based scoring (off-hours) ---
  const hour = ctx.hour ?? new Date().getHours();
  if (hour >= 1 && hour <= 4) {
    score += 18;
    signals.push("Transaction at high-risk hours (1am–4am)");
  } else if (hour >= 23 || hour === 0) {
    score += 8;
    signals.push("Late-night transaction");
  }

  // --- Geolocation risk ---
  if (ctx.location) {
    const loc = ctx.location.toLowerCase();
    if (loc.includes("international") || loc.includes("overseas") || loc.includes("foreign")) {
      score += 22;
      signals.push("International/cross-border transaction");
    }
    if (loc.includes("high-risk") || loc.includes("sanctioned")) {
      score += 30;
      signals.push("High-risk geographic region");
    }
  }

  // --- IP address risk ---
  if (ctx.ipAddress) {
    if (HIGH_RISK_IP_PREFIXES.some((p) => ctx.ipAddress!.startsWith(p))) {
      score += 18;
      signals.push("IP address from known high-risk range");
    }
    // VPN/Tor detection heuristic
    if (ctx.ipAddress.startsWith("10.") || ctx.ipAddress.startsWith("172.")) {
      // internal — no penalty
    } else if (ctx.ipAddress.split(".").length === 4) {
      const lastOctet = parseInt(ctx.ipAddress.split(".")[3] ?? "0", 10);
      if (lastOctet === 1 || lastOctet === 254) {
        score += 6;
        signals.push("Unusual IP pattern detected");
      }
    }
  }

  // --- Device anomaly ---
  if (!ctx.deviceId) {
    score += 10;
    signals.push("No device fingerprint — anonymous transaction");
  }

  // Controlled randomness for realism
  const noise = Math.floor(Math.random() * 6);
  score = Math.min(100, Math.max(0, score + noise));

  // Risk level per spec: 0-30 safe, 31-60 medium, 61-80 high, 81-100 critical
  let riskLevel: FraudSignals["riskLevel"];
  if (score >= 81) riskLevel = "critical";
  else if (score >= 61) riskLevel = "high";
  else if (score >= 31) riskLevel = "medium";
  else riskLevel = "low";

  if (signals.length === 0) signals.push("No significant risk indicators detected");

  const fraudProbability = Math.min(0.99, score / 100 + (Math.random() * 0.04 - 0.02));

  return {
    riskScore: score,
    riskLevel,
    fraudProbability: Math.max(0, Math.round(fraudProbability * 100) / 100),
    signals,
  };
}

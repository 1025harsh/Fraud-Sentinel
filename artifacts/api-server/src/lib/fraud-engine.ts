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

const HIGH_RISK_CATEGORIES = ["casino", "crypto", "wire_transfer", "gift_cards", "gambling"];
const SUSPICIOUS_MERCHANTS = ["unknown", "test", "temp"];

export function analyzeFraud(ctx: TransactionContext): FraudSignals {
  const signals: string[] = [];
  let score = 0;

  // Amount-based scoring
  if (ctx.amount > 5000) {
    score += 30;
    signals.push("Very high transaction amount (>$5,000)");
  } else if (ctx.amount > 2000) {
    score += 20;
    signals.push("High transaction amount (>$2,000)");
  } else if (ctx.amount > 1000) {
    score += 10;
    signals.push("Elevated transaction amount (>$1,000)");
  }

  // Merchant category risk
  const cat = ctx.merchantCategory.toLowerCase();
  if (HIGH_RISK_CATEGORIES.some((c) => cat.includes(c))) {
    score += 25;
    signals.push(`High-risk merchant category: ${ctx.merchantCategory}`);
  }

  // Suspicious merchant name
  const merchant = ctx.merchant.toLowerCase();
  if (SUSPICIOUS_MERCHANTS.some((m) => merchant.includes(m))) {
    score += 20;
    signals.push("Suspicious merchant name pattern");
  }

  // Time-based scoring (off-hours = higher risk)
  const hour = ctx.hour ?? new Date().getHours();
  if (hour >= 1 && hour <= 5) {
    score += 15;
    signals.push("Transaction at unusual hours (1am–5am)");
  }

  // Foreign/unusual location signals
  if (ctx.location) {
    const loc = ctx.location.toLowerCase();
    if (loc.includes("international") || loc.includes("overseas")) {
      score += 20;
      signals.push("International transaction detected");
    }
  }

  // IP anomaly signals
  if (ctx.ipAddress) {
    const parts = ctx.ipAddress.split(".");
    // Simple heuristic: certain IP ranges treated as suspicious
    if (parts[0] === "185" || parts[0] === "194") {
      score += 15;
      signals.push("IP address associated with high-risk region");
    }
  }

  // Add noise for realism
  const noise = Math.floor(Math.random() * 8);
  score = Math.min(100, score + noise);

  // Determine risk level
  let riskLevel: FraudSignals["riskLevel"];
  if (score >= 75) {
    riskLevel = "critical";
  } else if (score >= 50) {
    riskLevel = "high";
  } else if (score >= 25) {
    riskLevel = "medium";
  } else {
    riskLevel = "low";
  }

  if (signals.length === 0) {
    signals.push("No significant risk indicators detected");
  }

  const fraudProbability = Math.min(0.99, score / 100 + Math.random() * 0.05);

  return {
    riskScore: score,
    riskLevel,
    fraudProbability: Math.round(fraudProbability * 100) / 100,
    signals,
  };
}

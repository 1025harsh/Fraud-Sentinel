import { useRoute, useLocation } from "wouter";
import { useGetTransaction, useReviewTransaction } from "@workspace/api-client-react";
import { getGetTransactionQueryKey, getListTransactionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: "bg-green-500/15 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    critical: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium border ${colors[level] ?? colors.low}`}>
      {level.toUpperCase()}
    </span>
  );
}

function RiskMeter({ score }: { score: number }) {
  const pct = Math.min(100, score);
  const color = pct >= 75 ? "#ef4444" : pct >= 50 ? "#f97316" : pct >= 25 ? "#f59e0b" : "#22c55e";
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Risk Score</span>
        <span className="font-mono font-bold" style={{ color }}>{score.toFixed(0)} / 100</span>
      </div>
      <div className="h-3 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function TransactionDetail() {
  const [, params] = useRoute("/transactions/:id");
  const [, navigate] = useLocation();
  const id = Number(params?.id);
  const { data: tx, isLoading } = useGetTransaction(id, { query: { queryKey: getGetTransactionQueryKey(id), enabled: !!id } });
  const review = useReviewTransaction();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  function handleReview(decision: "approved" | "declined") {
    review.mutate(
      { id, data: { decision } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetTransactionQueryKey(id) });
          qc.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
          toast({ title: `Transaction ${decision}` });
        },
        onError: () => toast({ title: "Review failed", variant: "destructive" }),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-secondary/50 rounded" />
          <div className="h-64 bg-secondary/50 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="p-6">
        <div className="text-center py-16">
          <ShieldAlert size={40} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Transaction not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/transactions")}>
            Back to Transactions
          </Button>
        </div>
      </div>
    );
  }

  const isFlagged = tx.status === "flagged";

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/transactions")} className="gap-2">
          <ArrowLeft size={16} /> Back
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm text-muted-foreground font-mono">TX #{tx.id}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{tx.merchant}</h1>
          <p className="text-muted-foreground mt-1">{tx.merchantCategory} · {format(new Date(tx.createdAt), "PPp")}</p>
        </div>
        <div className="flex items-center gap-3">
          <RiskBadge level={tx.riskLevel} />
          {isFlagged && (user?.role === "admin") && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleReview("approved")}
                disabled={review.isPending}
                className="bg-green-700 hover:bg-green-600 text-white gap-2"
              >
                <CheckCircle size={14} /> Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleReview("declined")}
                disabled={review.isPending}
                className="gap-2"
              >
                <XCircle size={14} /> Decline
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Transaction Details */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">Transaction Details</h2>
          <dl className="space-y-3">
            {[
              ["Amount", `$${tx.amount.toFixed(2)}`],
              ["Card", `···· ${tx.cardLast4 ?? "?????"}`],
              ["Status", tx.status.toUpperCase()],
              ["Location", tx.location ?? "—"],
              ["IP Address", tx.ipAddress ?? "—"],
              ["Device ID", tx.deviceId ?? "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center text-sm">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-mono text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Fraud Analysis */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">Fraud Analysis</h2>
          <RiskMeter score={tx.riskScore} />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fraud Probability</span>
            <span className="font-mono font-bold text-destructive">{(tx.fraudProbability * 100).toFixed(1)}%</span>
          </div>
          {tx.reviewNote && (
            <div className="mt-2 p-3 bg-secondary/40 rounded text-sm">
              <span className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">Review Note</span>
              {tx.reviewNote}
            </div>
          )}
        </div>
      </div>

      {/* Risk indicators */}
      {tx.riskLevel !== "low" && (
        <div className="bg-card border border-destructive/30 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-destructive" />
            <h2 className="text-sm font-semibold text-destructive uppercase tracking-wider font-mono">Risk Indicators</h2>
          </div>
          <ul className="space-y-2">
            {tx.riskScore > 75 && (
              <li className="flex items-start gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-destructive mt-1.5 shrink-0" />
                Critical risk score ({tx.riskScore.toFixed(0)}/100) — fraud highly probable
              </li>
            )}
            {tx.riskScore > 50 && tx.riskScore <= 75 && (
              <li className="flex items-start gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                Elevated risk score ({tx.riskScore.toFixed(0)}/100) — manual review recommended
              </li>
            )}
            {tx.amount > 2000 && (
              <li className="flex items-start gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                High transaction amount (${tx.amount.toFixed(2)}) exceeds typical threshold
              </li>
            )}
            {["crypto", "gambling", "wire_transfer", "casino"].some(c => tx.merchantCategory?.toLowerCase().includes(c)) && (
              <li className="flex items-start gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 shrink-0" />
                High-risk merchant category: {tx.merchantCategory}
              </li>
            )}
            <li className="flex items-start gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
              Fraud probability: {(tx.fraudProbability * 100).toFixed(1)}%
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

import {
  useGetDashboardSummary,
  useGetFraudTrend,
  useGetRiskBreakdown,
  useGetRecentFraud,
} from "@workspace/api-client-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { AlertTriangle, TrendingUp, CreditCard, Bell, ShieldCheck, ShieldAlert, Activity, Percent } from "lucide-react";
import { format } from "date-fns";

const RISK_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  danger,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  danger?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono">{label}</span>
        <Icon size={18} className={danger ? "text-destructive" : "text-primary"} />
      </div>
      <div className={`text-3xl font-bold tabular-nums ${danger ? "text-destructive" : "text-foreground"}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: "bg-green-500/15 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    critical: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[level] ?? colors.low}`}>
      {level.toUpperCase()}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    approved: "bg-green-500/15 text-green-400 border-green-500/30",
    declined: "bg-red-500/15 text-red-400 border-red-500/30",
    flagged: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    pending: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[status] ?? colors.pending}`}>
      {status.toUpperCase()}
    </span>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: trend } = useGetFraudTrend();
  const { data: riskBreakdown } = useGetRiskBreakdown();
  const { data: recentFraud } = useGetRecentFraud();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operations Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Real-time fraud monitoring and analytics</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
          LIVE
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Transactions"
          value={summaryLoading ? "—" : (summary?.totalTransactions ?? 0).toLocaleString()}
          icon={Activity}
          sub="All time"
        />
        <StatCard
          label="Fraud Rate"
          value={summaryLoading ? "—" : `${summary?.fraudRate ?? 0}%`}
          icon={Percent}
          sub={`${summary?.totalFlagged ?? 0} flagged + ${summary?.totalDeclined ?? 0} declined`}
          danger={(summary?.fraudRate ?? 0) > 5}
        />
        <StatCard
          label="Blocked Cards"
          value={summaryLoading ? "—" : summary?.blockedCards ?? 0}
          icon={CreditCard}
          sub="Currently blocked"
          danger={(summary?.blockedCards ?? 0) > 0}
        />
        <StatCard
          label="Active Alerts"
          value={summaryLoading ? "—" : summary?.activeAlerts ?? 0}
          icon={Bell}
          sub="Unread notifications"
          danger={(summary?.activeAlerts ?? 0) > 0}
        />
        <StatCard
          label="Avg Risk Score"
          value={summaryLoading ? "—" : summary?.avgRiskScore ?? 0}
          icon={TrendingUp}
          sub="Out of 100"
          danger={(summary?.avgRiskScore ?? 0) > 50}
        />
        <StatCard
          label="Total Volume"
          value={
            summaryLoading
              ? "—"
              : `$${((summary?.totalAmount ?? 0) / 1000).toFixed(1)}K`
          }
          icon={ShieldCheck}
          sub="Transaction volume"
        />
        <StatCard
          label="Flagged"
          value={summaryLoading ? "—" : summary?.totalFlagged ?? 0}
          icon={AlertTriangle}
          sub="Pending review"
          danger={(summary?.totalFlagged ?? 0) > 0}
        />
        <StatCard
          label="Declined"
          value={summaryLoading ? "—" : summary?.totalDeclined ?? 0}
          icon={ShieldAlert}
          sub="Auto-blocked"
          danger={(summary?.totalDeclined ?? 0) > 0}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Fraud Trend */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-mono mb-4">
            Fraud Trend — Last 30 Days
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="flaggedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="approvedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickFormatter={(d) => format(new Date(d + "T00:00:00"), "MMM d")}
              />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6 }}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Area type="monotone" dataKey="flagged" stroke="#ef4444" fill="url(#flaggedGrad)" strokeWidth={2} name="Flagged/Declined" />
              <Area type="monotone" dataKey="approved" stroke="#22c55e" fill="url(#approvedGrad)" strokeWidth={2} name="Approved" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Breakdown */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-mono mb-4">
            Risk Distribution
          </h2>
          {(riskBreakdown ?? []).some((r) => r.count > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={riskBreakdown ?? []}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="level"
                >
                  {(riskBreakdown ?? []).map((entry) => (
                    <Cell key={entry.level} fill={RISK_COLORS[entry.level] ?? "#6b7280"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6 }}
                  formatter={(val, name) => [`${val} txns`, String(name).toUpperCase()]}
                />
                <Legend
                  formatter={(value) => <span className="text-xs text-muted-foreground uppercase">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Recent High-Risk Transactions */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            Recent High-Risk Transactions
          </h2>
          <a href="/transactions" className="text-xs text-primary hover:underline">View all</a>
        </div>
        <div className="overflow-x-auto">
          {(recentFraud ?? []).length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No high-risk transactions detected</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Merchant</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Risk</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Probability</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Time</th>
                </tr>
              </thead>
              <tbody>
                {(recentFraud ?? []).map((tx) => (
                  <tr key={tx.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium">{tx.merchant}</div>
                      <div className="text-xs text-muted-foreground">{tx.merchantCategory}</div>
                    </td>
                    <td className="px-5 py-3 font-mono tabular-nums font-semibold">${tx.amount.toFixed(2)}</td>
                    <td className="px-5 py-3"><RiskBadge level={tx.riskLevel} /></td>
                    <td className="px-5 py-3"><StatusBadge status={tx.status} /></td>
                    <td className="px-5 py-3 font-mono tabular-nums text-destructive">
                      {(tx.fraudProbability * 100).toFixed(1)}%
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">
                      {format(new Date(tx.createdAt), "MMM d, HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

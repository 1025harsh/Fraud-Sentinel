import { useEffect, useRef, useState } from "react";
import {
  useGetCommandCenterStats,
  useGetLiveFeed,
  getGetCommandCenterStatsQueryKey,
  getGetLiveFeedQueryKey,
} from "@workspace/api-client-react";
import { Shield, TrendingUp, CreditCard, Bell, Zap, AlertTriangle, CheckCircle2, XCircle, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FeedEvent = {
  id: number;
  type: string;
  amount: number;
  merchant: string;
  merchantCategory: string;
  riskLevel: string;
  riskScore: number;
  fraudProbability: number;
  status: string;
  cardLast4?: string | null;
  location?: string | null;
  createdAt: string;
};

function ThreatBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    LOW: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    CRITICAL: "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border font-mono tracking-widest ${map[level] ?? map["LOW"]}`}>
      {level}
    </span>
  );
}

function RiskBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    low: "bg-emerald-500/10 text-emerald-400",
    medium: "bg-yellow-500/10 text-yellow-400",
    high: "bg-orange-500/10 text-orange-400",
    critical: "bg-red-500/10 text-red-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono ${map[level] ?? "bg-muted text-muted-foreground"}`}>
      {level}
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "declined") return <XCircle className="w-4 h-4 text-destructive shrink-0" />;
  if (status === "flagged") return <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />;
  return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
}

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{label}</p>
            <p className={`text-3xl font-bold mt-1 font-mono ${accent ?? ""}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="p-2 rounded-md bg-secondary text-muted-foreground">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CommandCenter() {
  const { data: stats, refetch: refetchStats } = useGetCommandCenterStats({ query: { refetchInterval: 8000, queryKey: getGetCommandCenterStatsQueryKey() } });
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [sinceTs, setSinceTs] = useState<string>(new Date(Date.now() - 60_000).toISOString());
  const feedRef = useRef<HTMLDivElement>(null);
  const [ticker, setTicker] = useState(0);

  // Poll live feed every 5s
  const { data: liveFeed } = useGetLiveFeed(
    { since: sinceTs, limit: 20 },
    { query: { refetchInterval: 5000, queryKey: getGetLiveFeedQueryKey({ since: sinceTs, limit: 20 }) } }
  );

  useEffect(() => {
    if (!liveFeed?.events) return;
    if (liveFeed.events.length === 0) return;

    setFeedEvents((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const newEvents = (liveFeed.events as FeedEvent[]).filter((e) => !existingIds.has(e.id));
      if (newEvents.length === 0) return prev;
      const merged = [...newEvents, ...prev].slice(0, 100);
      // Advance since cursor
      setSinceTs(liveFeed.serverTime);
      setTicker((t) => t + newEvents.length);
      return merged;
    });
  }, [liveFeed]);

  // Scroll feed to top on new events
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [ticker]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            Fraud Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time threat monitoring & fraud analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </div>
          {stats?.threatLevel && <ThreatBadge level={stats.threatLevel} />}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={<Shield className="w-5 h-5" />}
          label="Fraud 24h"
          value={stats?.fraudLast24h ?? "—"}
          sub="flagged or declined"
          accent={stats?.fraudLast24h && stats.fraudLast24h > 5 ? "text-destructive" : ""}
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Today Total"
          value={stats?.totalToday ?? "—"}
          sub="transactions"
        />
        <StatCard
          icon={<CreditCard className="w-5 h-5" />}
          label="Blocked Cards"
          value={stats?.blockedCards ?? "—"}
          accent={stats?.blockedCards && stats.blockedCards > 0 ? "text-orange-400" : ""}
        />
        <StatCard
          icon={<Bell className="w-5 h-5" />}
          label="Active Alerts"
          value={stats?.activeAlerts ?? "—"}
          accent={stats?.activeAlerts && stats.activeAlerts > 0 ? "text-yellow-400" : ""}
        />
        <StatCard
          icon={<XCircle className="w-5 h-5" />}
          label="Auto-Blocked"
          value={stats?.autoBlocked ?? "—"}
          sub="last 24h"
          accent={stats?.autoBlocked && stats.autoBlocked > 0 ? "text-destructive" : ""}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Threat Level"
          value={stats?.threatLevel ?? "LOW"}
          accent={stats?.threatLevel === "CRITICAL" ? "text-destructive" : stats?.threatLevel === "HIGH" ? "text-orange-400" : "text-emerald-400"}
        />
      </div>

      {/* Live Feed */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Live Transaction Feed
            <span className="ml-auto text-xs text-muted-foreground font-normal">Auto-refreshing every 5s</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {feedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Activity className="w-10 h-10 opacity-30" />
              <p className="text-sm font-mono">Waiting for transactions…</p>
            </div>
          ) : (
            <div ref={feedRef} className="max-h-[480px] overflow-y-auto divide-y divide-border">
              {feedEvents.map((event) => (
                <FeedRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FeedRow({ event }: { event: FeedEvent }) {
  const time = new Date(event.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/30 transition-colors text-sm">
      <StatusIcon status={event.status} />
      <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{time}</span>
      <span className="font-medium flex-1 truncate">{event.merchant}</span>
      <span className="font-mono text-xs text-muted-foreground">{event.merchantCategory}</span>
      <span className="font-mono font-bold w-20 text-right shrink-0">
        ${Number(event.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <div className="w-16 shrink-0 flex justify-end">
        <RiskBadge level={event.riskLevel} />
      </div>
      <span className="font-mono text-xs text-muted-foreground w-16 text-right shrink-0">
        {Math.round(Number(event.fraudProbability ?? 0) * 100)}% fraud
      </span>
      {event.cardLast4 && (
        <span className="font-mono text-xs text-muted-foreground w-14 shrink-0">••{event.cardLast4}</span>
      )}
    </div>
  );
}

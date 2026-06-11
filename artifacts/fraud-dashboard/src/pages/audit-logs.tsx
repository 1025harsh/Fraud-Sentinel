import { useState } from "react";
import { useListAuditLogs } from "@workspace/api-client-react";
import { ClipboardList, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type AuditLog = {
  id: number;
  userId?: number | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  status: string;
  createdAt: string;
};

const ACTION_COLORS: Record<string, string> = {
  login_success: "text-emerald-400",
  login_failed: "text-red-400",
  register: "text-blue-400",
  card_blocked: "text-orange-400",
  card_unblocked: "text-emerald-400",
  transaction_created: "text-primary",
  transaction_reviewed: "text-yellow-400",
  fraud_case_updated: "text-purple-400",
  password_reset_requested: "text-yellow-400",
  password_reset_completed: "text-emerald-400",
};

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch } = useListAuditLogs({ limit: 50, page });

  const logs = (data as any)?.logs as AuditLog[] ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{total} total events</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm font-mono">Loading…</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <ClipboardList className="w-10 h-10 opacity-20" />
              <p className="text-sm font-mono">No audit events yet</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 px-5 py-3 hover:bg-secondary/30 transition-colors text-sm">
                    <div className="mt-0.5 shrink-0">
                      {log.status === "success"
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        : <XCircle className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-mono text-xs font-semibold ${ACTION_COLORS[log.action] ?? "text-primary"}`}>
                          {log.action}
                        </span>
                        <span className="text-xs text-muted-foreground">{log.resource}{log.resourceId ? ` #${log.resourceId}` : ""}</span>
                        {log.details && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{log.details}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground/70 font-mono">
                        {log.userId && <span>User #{log.userId}</span>}
                        {log.ipAddress && <span>{log.ipAddress}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                  <span className="text-xs text-muted-foreground font-mono">Page {page} of {totalPages}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

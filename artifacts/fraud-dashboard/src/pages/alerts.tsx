import { useListAlerts, useMarkAlertRead } from "@workspace/api-client-react";
import { getListAlertsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, ShieldAlert, CreditCard, LogIn, Info, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

const ALERT_ICONS: Record<string, React.ElementType> = {
  fraud_detected: ShieldAlert,
  high_risk: AlertTriangle,
  card_blocked: CreditCard,
  login_alert: LogIn,
  system: Info,
};

const ALERT_COLORS: Record<string, string> = {
  fraud_detected: "text-red-400 bg-red-500/10 border-red-500/30",
  high_risk: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  card_blocked: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  login_alert: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  system: "text-muted-foreground bg-secondary/50 border-border",
};

export default function Alerts() {
  const { data: alerts, isLoading } = useListAlerts({ limit: 50 });
  const markRead = useMarkAlertRead();
  const qc = useQueryClient();
  const { toast } = useToast();

  function handleMarkRead(id: number) {
    markRead.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListAlertsQueryKey() });
        },
        onError: () => toast({ title: "Failed to mark as read", variant: "destructive" }),
      }
    );
  }

  const unread = (alerts ?? []).filter((a) => !a.isRead).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {unread > 0 ? `${unread} unread alert${unread > 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
        {unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              (alerts ?? [])
                .filter((a) => !a.isRead)
                .forEach((a) => handleMarkRead(a.id));
            }}
          >
            <CheckCheck size={14} /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-secondary/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (alerts ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell size={48} className="text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No alerts yet</p>
          <p className="text-sm text-muted-foreground mt-1">You'll be notified when fraud is detected</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(alerts ?? []).map((alert) => {
            const Icon = ALERT_ICONS[alert.type] ?? Bell;
            const colorClass = ALERT_COLORS[alert.type] ?? ALERT_COLORS.system;
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                  alert.isRead
                    ? "bg-card border-border opacity-60"
                    : "bg-card border-border"
                }`}
              >
                <div className={`p-2 rounded-lg border shrink-0 ${colorClass}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${alert.isRead ? "text-muted-foreground" : "text-foreground"}`}>
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">{format(new Date(alert.createdAt), "MMM d, HH:mm")}</span>
                    <span className="text-xs font-mono text-muted-foreground uppercase">{alert.type.replace("_", " ")}</span>
                    {alert.transactionId && (
                      <Link href={`/transactions/${alert.transactionId}`} className="text-xs text-primary hover:underline">
                        View transaction
                      </Link>
                    )}
                  </div>
                </div>
                {!alert.isRead && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => handleMarkRead(alert.id)}
                      disabled={markRead.isPending}
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

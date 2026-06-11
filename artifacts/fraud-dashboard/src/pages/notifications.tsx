import { Bell, CheckCheck, RefreshCw, ShieldAlert, CreditCard, LogIn, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Notification = {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

type NotifListResponse = {
  notifications: Notification[];
  total: number;
  unread: number;
};

function NotifIcon({ type }: { type: string }) {
  if (type.includes("fraud") || type.includes("high_risk")) return <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />;
  if (type.includes("card")) return <CreditCard className="w-5 h-5 text-orange-400 shrink-0" />;
  if (type.includes("login") || type.includes("device")) return <LogIn className="w-5 h-5 text-yellow-400 shrink-0" />;
  if (type.includes("warning")) return <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />;
  return <Info className="w-5 h-5 text-primary shrink-0" />;
}

import { useListNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Notifications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, refetch } = useListNotifications({}, { query: { refetchInterval: 15000, queryKey: [] } });
  const response = data as NotifListResponse | undefined;

  const markRead = useMarkNotificationRead({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
    },
  });

  const markAll = useMarkAllNotificationsRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        toast({ title: "All notifications marked as read" });
      },
    },
  });

  const notifications = response?.notifications ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {response?.unread ?? 0} unread · {response?.total ?? 0} total
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
          </Button>
          {(response?.unread ?? 0) > 0 && (
            <Button size="sm" className="gap-2" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm font-mono">Loading…</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Bell className="w-12 h-12 opacity-20" />
              <p className="text-sm font-mono">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-4 px-5 py-4 hover:bg-secondary/30 transition-colors ${!notif.isRead ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                >
                  <NotifIcon type={notif.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold truncate">{notif.title}</p>
                      {!notif.isRead && (
                        <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30 shrink-0">NEW</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{notif.message}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
                      {new Date(notif.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground shrink-0"
                      onClick={() => markRead.mutate({ id: notif.id })}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

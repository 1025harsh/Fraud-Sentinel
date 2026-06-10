import { useGetLoginHistory, useGetTrustedDevices, useRemoveDevice } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetTrustedDevicesQueryKey, getGetLoginHistoryQueryKey } from "@workspace/api-client-react";
import {
  Lock, Monitor, Smartphone, Globe, Clock, CheckCircle2, XCircle, ShieldCheck, RefreshCw, Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type LoginEvent = {
  id: number;
  userId: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceFingerprint?: string | null;
  deviceName?: string | null;
  location?: string | null;
  isTrusted: boolean;
  loginAt: string;
};

function DeviceIcon({ deviceName }: { deviceName?: string | null }) {
  if (!deviceName) return <Monitor className="w-5 h-5 text-muted-foreground" />;
  const d = deviceName.toLowerCase();
  if (d.includes("iphone") || d.includes("ipad") || d.includes("android")) {
    return <Smartphone className="w-5 h-5 text-muted-foreground" />;
  }
  return <Monitor className="w-5 h-5 text-muted-foreground" />;
}

function BrowserFromUA(ua?: string | null): string {
  if (!ua) return "Unknown Browser";
  if (/Edg\//i.test(ua)) return "Microsoft Edge";
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Safari/i.test(ua)) return "Safari";
  return "Unknown Browser";
}

export default function Security() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: history = [], isLoading: histLoading, refetch: refetchHistory } = useGetLoginHistory({ limit: 20 });
  const { data: devices = [], isLoading: devLoading, refetch: refetchDevices } = useGetTrustedDevices();

  const removeDevice = useRemoveDevice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTrustedDevicesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLoginHistoryQueryKey() });
        toast({ title: "Device removed", description: "The device has been removed from your history." });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to remove device.", variant: "destructive" });
      },
    },
  });

  const loginList = history as LoginEvent[];
  const deviceList = devices as LoginEvent[];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
            <Lock className="w-6 h-6 text-primary" />
            Security Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor login activity and trusted devices</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetchHistory(); refetchDevices(); }} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Security status banner */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-4">
        <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-400">Account Secure</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {deviceList.length} known device{deviceList.length !== 1 ? "s" : ""} · {loginList.length} recent login events recorded
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trusted Devices */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <Monitor className="w-4 h-4 text-primary" />
              Known Devices
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {devLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm font-mono">Loading…</span>
              </div>
            ) : deviceList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Monitor className="w-8 h-8 opacity-30" />
                <p className="text-sm font-mono">No devices recorded yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {deviceList.map((device) => (
                  <div key={device.id} className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/30 transition-colors">
                    <DeviceIcon deviceName={device.deviceName} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{device.deviceName ?? "Unknown Device"}</p>
                        {device.isTrusted ? (
                          <Badge variant="outline" className="text-emerald-400 border-emerald-400/20 bg-emerald-400/10 text-[10px] shrink-0">
                            Trusted
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-400 border-yellow-400/20 bg-yellow-400/10 text-[10px] shrink-0">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{BrowserFromUA(device.userAgent)}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        Last login: {new Date(device.loginAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeDevice.mutate({ id: device.id })}
                      disabled={removeDevice.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Login History */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Login History
              <span className="ml-auto text-xs text-muted-foreground font-normal">Last 20 events</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {histLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm font-mono">Loading…</span>
              </div>
            ) : loginList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Clock className="w-8 h-8 opacity-30" />
                <p className="text-sm font-mono">No login history</p>
                <p className="text-xs">Log in to start recording activity.</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                {loginList.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                    <div className="mt-0.5 shrink-0">
                      {event.isTrusted
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        : <XCircle className="w-4 h-4 text-yellow-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{event.deviceName ?? "Unknown Device"}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {event.ipAddress ?? "Unknown IP"}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">{BrowserFromUA(event.userAgent)}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono shrink-0 text-right">
                      <p>{new Date(event.loginAt).toLocaleDateString()}</p>
                      <p>{new Date(event.loginAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

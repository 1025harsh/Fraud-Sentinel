import { useState } from "react";
import { useGetAdminStats, useAdminListUsers, useAdminUpdateUser, useListFraudLogs } from "@workspace/api-client-react";
import { getAdminListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Shield, Users, CreditCard, Activity, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function StatCard({ label, value, icon: Icon, danger }: { label: string; value: string | number; icon: React.ElementType; danger?: boolean }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono">{label}</span>
        <Icon size={18} className={danger ? "text-destructive" : "text-muted-foreground"} />
      </div>
      <div className={`text-3xl font-bold tabular-nums ${danger ? "text-destructive" : "text-foreground"}`}>{value}</div>
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

export default function Admin() {
  const [search, setSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: stats } = useGetAdminStats();
  const { data: users, isLoading: usersLoading } = useAdminListUsers({ page: userPage, limit: 15, ...(search ? { search } : {}) });
  const { data: fraudLogs, isLoading: logsLoading } = useListFraudLogs({ page: logPage, limit: 15 });
  const updateUser = useAdminUpdateUser();

  function handleUpdateUser(id: number, updates: { role?: "user" | "admin"; status?: "active" | "suspended" }) {
    updateUser.mutate(
      { id, data: updates },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
          toast({ title: "User updated" });
        },
        onError: () => toast({ title: "Failed to update user", variant: "destructive" }),
      }
    );
  }

  const userPages = Math.ceil((users?.total ?? 0) / 15);
  const logPages = Math.ceil((fraudLogs?.total ?? 0) / 15);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Control Center</h1>
        <p className="text-muted-foreground text-sm mt-0.5">System-wide monitoring and management</p>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Users" value={(stats?.totalUsers ?? 0).toLocaleString()} icon={Users} />
        <StatCard label="Total Cards" value={(stats?.totalCards ?? 0).toLocaleString()} icon={CreditCard} />
        <StatCard label="All Transactions" value={(stats?.totalTransactions ?? 0).toLocaleString()} icon={Activity} />
        <StatCard label="Fraud Today" value={stats?.fraudDetectedToday ?? 0} icon={AlertTriangle} danger={(stats?.fraudDetectedToday ?? 0) > 0} />
        <StatCard label="System Uptime" value={stats?.systemUptime ?? "—"} icon={Shield} />
        <StatCard label="ML Accuracy" value={`${stats?.mlModelAccuracy ?? 0}%`} icon={Shield} />
      </div>

      <Tabs defaultValue="users">
        <TabsList className="bg-secondary/40">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="logs">Fraud Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setUserPage(1); }}
            />
          </div>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/20">
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">User</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Joined</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-secondary/50 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : (users?.users ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No users found</td>
                  </tr>
                ) : (
                  (users?.users ?? []).map((u) => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-5 py-3">
                        <Select
                          value={u.role}
                          onValueChange={(v) => handleUpdateUser(u.id, { role: v as "user" | "admin" })}
                        >
                          <SelectTrigger className="h-7 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-5 py-3">
                        <Select
                          value={u.status}
                          onValueChange={(v) => handleUpdateUser(u.id, { status: v as "active" | "suspended" })}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{format(new Date(u.createdAt), "MMM d, yyyy")}</td>
                      <td className="px-5 py-3" />
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {userPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">{users?.total ?? 0} users</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setUserPage((p) => p - 1)} disabled={userPage === 1}><ChevronLeft size={14} /></Button>
                  <span className="text-xs font-mono">{userPage} / {userPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setUserPage((p) => p + 1)} disabled={userPage === userPages}><ChevronRight size={14} /></Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4 mt-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/20">
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">TX ID</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Risk Level</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Score</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Probability</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Signals</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Time</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-secondary/50 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : (fraudLogs?.logs ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No fraud logs yet</td>
                  </tr>
                ) : (
                  (fraudLogs?.logs ?? []).map((log) => (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3 font-mono text-muted-foreground">#{log.transactionId}</td>
                      <td className="px-5 py-3"><RiskBadge level={log.riskLevel} /></td>
                      <td className="px-5 py-3 font-mono tabular-nums">{log.riskScore.toFixed(0)}</td>
                      <td className="px-5 py-3 font-mono tabular-nums text-destructive">{(log.fraudProbability * 100).toFixed(1)}%</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground max-w-64 truncate">
                        {log.signals.slice(0, 2).join("; ")}
                        {log.signals.length > 2 && ` +${log.signals.length - 2} more`}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{format(new Date(log.createdAt), "MMM d, HH:mm")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {logPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">{fraudLogs?.total ?? 0} logs</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setLogPage((p) => p - 1)} disabled={logPage === 1}><ChevronLeft size={14} /></Button>
                  <span className="text-xs font-mono">{logPage} / {logPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setLogPage((p) => p + 1)} disabled={logPage === logPages}><ChevronRight size={14} /></Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

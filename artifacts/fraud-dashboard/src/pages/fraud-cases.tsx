import { useState } from "react";
import { useListFraudCases, useUpdateFraudCase } from "@workspace/api-client-react";
import { getListFraudCasesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, RefreshCw, AlertTriangle, CheckCircle2, Clock, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type FraudCase = {
  id: number;
  caseNumber: string;
  userId: number;
  transactionId?: number | null;
  status: string;
  priority: string;
  title: string;
  description?: string | null;
  resolution?: string | null;
  riskScore?: number | null;
  amountInvolved?: number | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-500/10 text-red-400 border-red-500/20",
  investigating: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  resolved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  closed: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "open") return <AlertTriangle className="w-4 h-4 text-red-400" />;
  if (status === "investigating") return <Clock className="w-4 h-4 text-yellow-400" />;
  if (status === "resolved") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  return <XCircle className="w-4 h-4 text-zinc-400" />;
}

export default function FraudCases() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCase, setSelectedCase] = useState<FraudCase | null>(null);
  const [resolution, setResolution] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const { data, isLoading, refetch } = useListFraudCases(
    { limit: 15, page, status: statusFilter === "all" ? undefined : statusFilter },
    { query: { refetchInterval: 15000, queryKey: [] } }
  );

  const update = useUpdateFraudCase({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFraudCasesQueryKey() });
        setSelectedCase(null);
        toast({ title: "Case updated successfully" });
      },
      onError: () => toast({ title: "Failed to update case", variant: "destructive" }),
    },
  });

  const cases = (data as any)?.cases as FraudCase[] ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / 15);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            Fraud Cases
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{total} total cases</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Open", status: "open", color: "text-red-400" },
          { label: "Investigating", status: "investigating", color: "text-yellow-400" },
          { label: "Resolved", status: "resolved", color: "text-emerald-400" },
          { label: "Closed", status: "closed", color: "text-zinc-400" },
        ].map(({ label, status, color }) => (
          <Card key={status} className="bg-card border-border cursor-pointer hover:bg-secondary/30 transition-colors"
            onClick={() => setStatusFilter(status)}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground font-mono uppercase">{label}</p>
              <p className={`text-2xl font-bold font-mono mt-1 ${color}`}>
                {cases.filter((c) => c.status === status).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm font-mono">Loading cases…</span>
            </div>
          ) : cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Briefcase className="w-12 h-12 opacity-20" />
              <p className="text-sm font-mono">No fraud cases found</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {cases.map((fc) => (
                  <div key={fc.id} className="flex items-start gap-4 px-5 py-4 hover:bg-secondary/30 transition-colors">
                    <div className="mt-0.5"><StatusIcon status={fc.status} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">{fc.caseNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] border font-mono ${STATUS_COLORS[fc.status] ?? ""}`}>
                          {fc.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] border font-mono ${PRIORITY_COLORS[fc.priority] ?? ""}`}>
                          {fc.priority}
                        </span>
                        {fc.riskScore != null && (
                          <span className="text-xs text-muted-foreground font-mono">Score: {Math.round(fc.riskScore)}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{fc.title}</p>
                      {fc.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{fc.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground/60 font-mono mt-1">
                        {new Date(fc.createdAt).toLocaleString()}
                        {fc.amountInvolved != null && ` · $${Number(fc.amountInvolved).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs shrink-0"
                      onClick={() => { setSelectedCase(fc); setResolution(fc.resolution ?? ""); setNewStatus(fc.status); }}
                    >
                      Manage
                    </Button>
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

      {/* Edit dialog */}
      <Dialog open={!!selectedCase} onOpenChange={(o) => !o && setSelectedCase(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {selectedCase?.caseNumber} — Manage Case
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm font-medium mb-1">{selectedCase?.title}</p>
              <p className="text-xs text-muted-foreground">{selectedCase?.description}</p>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Resolution Notes</Label>
              <Textarea
                placeholder="Describe the investigation findings and resolution…"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
              />
            </div>
            <Button
              className="w-full"
              disabled={update.isPending}
              onClick={() => {
                if (!selectedCase) return;
                update.mutate({ id: selectedCase.id, data: { status: newStatus, resolution: resolution || undefined } });
              }}
            >
              {update.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

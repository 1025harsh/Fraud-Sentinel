import { useState } from "react";
import { useListTransactions, useCreateTransaction, useListCards } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListTransactionsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Search, Plus, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const txSchema = z.object({
  amount: z.coerce.number().min(0.01),
  merchant: z.string().min(1),
  merchantCategory: z.string().min(1),
  cardId: z.coerce.number().min(1),
  location: z.string().optional(),
});

export default function Transactions() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [riskFilter, setRiskFilter] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const params = {
    page,
    limit: 20,
    ...(search ? { search } : {}),
    ...(statusFilter && statusFilter !== "all" ? { status: statusFilter as any } : {}),
    ...(riskFilter && riskFilter !== "all" ? { riskLevel: riskFilter as any } : {}),
  };

  const { data, isLoading } = useListTransactions(params);
  const { data: cards } = useListCards();
  const createTx = useCreateTransaction();

  const form = useForm<z.infer<typeof txSchema>>({
    resolver: zodResolver(txSchema),
    defaultValues: { amount: 0, merchant: "", merchantCategory: "", cardId: 0, location: "" },
  });

  function onSubmit(values: z.infer<typeof txSchema>) {
    createTx.mutate(
      { data: { ...values, location: values.location || undefined } },
      {
        onSuccess: (tx) => {
          qc.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
          setDialogOpen(false);
          form.reset();
          const msg =
            tx.riskLevel === "critical"
              ? "Transaction declined — critical fraud risk detected"
              : tx.riskLevel === "high"
              ? "Transaction flagged for review — high risk detected"
              : "Transaction approved";
          toast({ title: msg, variant: tx.riskLevel === "critical" ? "destructive" : "default" });
        },
        onError: () => toast({ title: "Failed to submit transaction", variant: "destructive" }),
      }
    );
  }

  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Monitor and review all card transactions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus size={16} /> New Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Submit Transaction</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="merchant" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Merchant Name</FormLabel>
                    <FormControl><Input placeholder="Amazon, Walmart..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="merchantCategory" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {["retail", "grocery", "dining", "travel", "entertainment", "gas", "healthcare", "crypto", "gambling", "wire_transfer"].map((c) => (
                            <SelectItem key={c} value={c}>{c.replace("_", " ").toUpperCase()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cardId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card</FormLabel>
                    <FormControl>
                      <Select onValueChange={(v) => field.onChange(Number(v))}>
                        <SelectTrigger><SelectValue placeholder="Select card" /></SelectTrigger>
                        <SelectContent>
                          {(cards ?? []).filter((c) => !c.isBlocked).map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.brand.toUpperCase()} ···· {c.last4}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (optional)</FormLabel>
                    <FormControl><Input placeholder="New York, US" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createTx.isPending}>
                  {createTx.isPending ? "Analyzing..." : "Submit & Analyze"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search merchant..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <Filter size={14} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={(v) => { setRiskFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Risk Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risks</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Merchant</th>
                <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Amount</th>
                <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Card</th>
                <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Risk</th>
                <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Score</th>
                <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-secondary/50 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : (data?.transactions ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">No transactions found</td>
                </tr>
              ) : (
                (data?.transactions ?? []).map((tx) => (
                  <tr key={tx.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer">
                    <td className="px-5 py-3">
                      <Link href={`/transactions/${tx.id}`}>
                        <div className="font-medium hover:text-primary transition-colors">{tx.merchant}</div>
                        <div className="text-xs text-muted-foreground">{tx.merchantCategory}</div>
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-mono tabular-nums font-semibold">${tx.amount.toFixed(2)}</td>
                    <td className="px-5 py-3 font-mono text-muted-foreground text-xs">···· {tx.cardLast4 ?? "?????"}</td>
                    <td className="px-5 py-3"><RiskBadge level={tx.riskLevel} /></td>
                    <td className="px-5 py-3"><StatusBadge status={tx.status} /></td>
                    <td className="px-5 py-3 font-mono tabular-nums">
                      <span className={tx.riskScore > 50 ? "text-destructive" : "text-foreground"}>
                        {tx.riskScore.toFixed(0)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{format(new Date(tx.createdAt), "MMM d, HH:mm")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {data?.total ?? 0} total transactions
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                <ChevronLeft size={14} />
              </Button>
              <span className="text-xs font-mono">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

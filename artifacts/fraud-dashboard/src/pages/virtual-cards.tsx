import { useState } from "react";
import {
  useListVirtualCards,
  useGenerateVirtualCard,
  useDeactivateVirtualCard,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListVirtualCardsQueryKey } from "@workspace/api-client-react";
import { Zap, PlusCircle, Eye, EyeOff, XCircle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type VirtualCard = {
  id: number;
  cardNumber: string;
  last4: string;
  brand: string;
  cvv: string;
  expiryMonth: number;
  expiryYear: number;
  isActive: boolean;
  usageLimit: number;
  timesUsed: number;
  note?: string | null;
  createdAt: string;
  expiresAt?: string | null;
};

function maskNumber(n: string): string {
  return `•••• •••• •••• ${n.slice(-4)}`;
}

function VisaCardUI({ card, showFull }: { card: VirtualCard; showFull: boolean }) {
  const exp = `${String(card.expiryMonth).padStart(2, "0")}/${String(card.expiryYear).slice(-2)}`;
  return (
    <div className={`relative w-full aspect-[1.6] rounded-2xl p-5 select-none overflow-hidden transition-all ${
      card.isActive
        ? "bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 shadow-xl shadow-violet-500/20"
        : "bg-gradient-to-br from-zinc-700 to-zinc-800 opacity-60 shadow-md"
    }`}>
      {/* Chip */}
      <div className="w-10 h-7 rounded-md bg-yellow-300/80 mb-4 flex items-center justify-center">
        <div className="grid grid-cols-2 gap-[2px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-2 h-2 bg-yellow-500/60 rounded-sm" />
          ))}
        </div>
      </div>
      {/* Card Number */}
      <p className="text-white font-mono text-base tracking-widest mb-3">
        {showFull ? card.cardNumber.replace(/(.{4})/g, "$1 ").trim() : maskNumber(card.cardNumber)}
      </p>
      {/* Bottom row */}
      <div className="flex items-end justify-between mt-auto">
        <div>
          <p className="text-white/50 text-[10px] uppercase tracking-wider">Expires</p>
          <p className="text-white font-mono text-sm">{exp}</p>
        </div>
        <div>
          <p className="text-white/50 text-[10px] uppercase tracking-wider">CVV</p>
          <p className="text-white font-mono text-sm">{showFull ? card.cvv : "•••"}</p>
        </div>
        <span className="text-white font-bold text-xl italic opacity-80 uppercase">{card.brand}</span>
      </div>
      {!card.isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="bg-black/40 text-white text-xs font-mono px-3 py-1 rounded-full uppercase tracking-widest">
            Deactivated
          </span>
        </div>
      )}
    </div>
  );
}

function GenerateDialog({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [usageLimit, setUsageLimit] = useState(1);
  const [validHours, setValidHours] = useState(24);
  const [note, setNote] = useState("");

  const generate = useGenerateVirtualCard({
    mutation: {
      onSuccess: () => {
        toast({ title: "Virtual card generated!", description: "Your new virtual card is ready to use." });
        setOpen(false);
        onSuccess();
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to generate virtual card.", variant: "destructive" });
      },
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <PlusCircle className="w-4 h-4" />
          Generate Card
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Generate Virtual Card
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor="usage">Usage Limit (transactions)</Label>
            <Input
              id="usage"
              type="number"
              min={1}
              max={100}
              value={usageLimit}
              onChange={(e) => setUsageLimit(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">Card auto-deactivates after this many uses.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="hours">Valid For (hours)</Label>
            <Input
              id="hours"
              type="number"
              min={1}
              max={720}
              value={validHours}
              onChange={(e) => setValidHours(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="note">Note (optional)</Label>
            <Input
              id="note"
              placeholder="e.g. Amazon subscription"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={generate.isPending}
            onClick={() => generate.mutate({ data: { usageLimit, validHours, note: note || undefined } })}
          >
            {generate.isPending ? "Generating…" : "Generate Card"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function VirtualCards() {
  const queryClient = useQueryClient();
  const { data: cards = [], refetch, isLoading } = useListVirtualCards();
  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());

  const deactivate = useDeactivateVirtualCard({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListVirtualCardsQueryKey() }),
    },
  });

  const toggleReveal = (id: number) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const active = (cards as VirtualCard[]).filter((c) => c.isActive);
  const inactive = (cards as VirtualCard[]).filter((c) => !c.isActive);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            Virtual Cards
          </h1>
          <p className="text-sm text-muted-foreground mt-1">One-time or limited-use virtual cards for safe online payments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <GenerateDialog onSuccess={() => refetch()} />
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Active</p>
            <p className="text-3xl font-bold font-mono text-emerald-400 mt-1">{active.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Deactivated</p>
            <p className="text-3xl font-bold font-mono text-muted-foreground mt-1">{inactive.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Total Uses</p>
            <p className="text-3xl font-bold font-mono mt-1">
              {(cards as VirtualCard[]).reduce((acc, c) => acc + c.timesUsed, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm font-mono">Loading virtual cards…</span>
        </div>
      ) : (cards as VirtualCard[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
          <Zap className="w-14 h-14 opacity-20" />
          <p className="text-base font-mono">No virtual cards yet</p>
          <p className="text-sm">Generate one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(cards as VirtualCard[]).map((card) => (
            <div key={card.id} className="space-y-3">
              <VisaCardUI card={card} showFull={revealedIds.has(card.id)} />
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <Clock className="w-3 h-3" />
                  {card.expiresAt
                    ? `Expires ${new Date(card.expiresAt).toLocaleDateString()}`
                    : "No expiry"}
                </div>
                <div className="flex items-center gap-1">
                  {card.isActive && (
                    <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 bg-emerald-400/10 text-[10px]">
                      {card.timesUsed}/{card.usageLimit} uses
                    </Badge>
                  )}
                </div>
              </div>
              {card.note && (
                <p className="text-xs text-muted-foreground px-1 truncate">{card.note}</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2 text-xs"
                  onClick={() => toggleReveal(card.id)}
                >
                  {revealedIds.has(card.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {revealedIds.has(card.id) ? "Hide" : "Reveal"}
                </Button>
                {card.isActive && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1 gap-2 text-xs"
                    disabled={deactivate.isPending}
                    onClick={() => deactivate.mutate({ id: card.id })}
                  >
                    <XCircle className="w-3 h-3" />
                    Deactivate
                  </Button>
                )}
                {!card.isActive && (
                  <div className="flex-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
                    Deactivated
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

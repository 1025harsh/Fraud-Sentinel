import { useState } from "react";
import { useListCards, useCreateCard, useBlockCard } from "@workspace/api-client-react";
import { getListCardsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, CreditCard, Lock, Unlock, Shield } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const BRAND_COLORS: Record<string, string> = {
  visa: "from-blue-900 to-blue-700",
  mastercard: "from-red-900 to-orange-700",
  amex: "from-green-900 to-teal-700",
  discover: "from-orange-900 to-yellow-700",
};

const cardSchema = z.object({
  last4: z.string().length(4).regex(/^\d+$/),
  brand: z.enum(["visa", "mastercard", "amex", "discover"]),
  expiryMonth: z.coerce.number().min(1).max(12),
  expiryYear: z.coerce.number().min(2024).max(2040),
});

export default function Cards() {
  const { data: cards, isLoading } = useListCards();
  const createCard = useCreateCard();
  const blockCard = useBlockCard();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof cardSchema>>({
    resolver: zodResolver(cardSchema),
    defaultValues: { last4: "", brand: "visa", expiryMonth: 12, expiryYear: 2027 },
  });

  function onSubmit(values: z.infer<typeof cardSchema>) {
    createCard.mutate(
      { data: values },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListCardsQueryKey() });
          setDialogOpen(false);
          form.reset();
          toast({ title: "Card added successfully" });
        },
        onError: () => toast({ title: "Failed to add card", variant: "destructive" }),
      }
    );
  }

  function toggleBlock(id: number, isBlocked: boolean) {
    blockCard.mutate(
      { id, data: { blocked: !isBlocked, reason: !isBlocked ? "Manually blocked by user" : undefined } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListCardsQueryKey() });
          toast({ title: isBlocked ? "Card unblocked" : "Card blocked" });
        },
        onError: () => toast({ title: "Action failed", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Card Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage and monitor your payment cards</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus size={16} /> Add Card</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Add New Card</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="last4" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last 4 Digits</FormLabel>
                    <FormControl><Input placeholder="4242" maxLength={4} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="brand" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Brand</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["visa", "mastercard", "amex", "discover"].map(b => (
                            <SelectItem key={b} value={b}>{b.toUpperCase()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="expiryMonth" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Month</FormLabel>
                      <FormControl><Input type="number" min={1} max={12} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="expiryYear" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Year</FormLabel>
                      <FormControl><Input type="number" min={2024} max={2040} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full" disabled={createCard.isPending}>
                  {createCard.isPending ? "Adding..." : "Add Card"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-secondary/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (cards ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CreditCard size={48} className="text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No cards added yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add a card to start monitoring transactions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(cards ?? []).map((card) => (
            <div
              key={card.id}
              className={`relative rounded-xl p-5 bg-gradient-to-br ${BRAND_COLORS[card.brand] ?? "from-slate-800 to-slate-700"} overflow-hidden border border-white/10 ${card.isBlocked ? "opacity-60" : ""}`}
            >
              {card.isBlocked && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="flex items-center gap-2 bg-red-900/80 px-4 py-2 rounded-full border border-red-500/50">
                    <Lock size={14} className="text-red-400" />
                    <span className="text-red-300 text-sm font-semibold uppercase tracking-wider">Blocked</span>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-start mb-8">
                <Shield size={20} className="text-white/60" />
                <span className="text-white/60 text-xs font-mono uppercase">{card.brand}</span>
              </div>
              <div className="text-white font-mono text-lg tracking-widest mb-4">
                ···· ···· ···· {card.last4}
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-white/50 text-xs uppercase mb-0.5">Expires</div>
                  <div className="text-white font-mono text-sm">
                    {String(card.expiryMonth).padStart(2, "0")}/{card.expiryYear}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white/50 text-xs uppercase mb-0.5">Added</div>
                  <div className="text-white/80 text-xs">{format(new Date(card.createdAt), "MMM yyyy")}</div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className={`gap-1.5 text-xs ${card.isBlocked ? "text-green-300 hover:text-green-200" : "text-red-300 hover:text-red-200"}`}
                  onClick={() => toggleBlock(card.id, card.isBlocked)}
                  disabled={blockCard.isPending}
                >
                  {card.isBlocked ? <><Unlock size={12} /> Unblock</> : <><Lock size={12} /> Block</>}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

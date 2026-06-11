import { useState } from "react";
import { Link } from "wouter";
import { Shield, Mail, KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      await res.json();
      // Always advance (prevents email enumeration)
      setStep("reset");
      toast({ title: "Reset code sent", description: "Check your email for the 6-digit code." });
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Invalid code", variant: "destructive" });
        return;
      }
      setStep("done");
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <Shield className="w-10 h-10 text-destructive" />
          <h1 className="text-xl font-bold">FraudGuard</h1>
          <p className="text-sm text-muted-foreground text-center">
            {step === "email" && "Enter your email to receive a reset code"}
            {step === "reset" && "Enter the code sent to your email"}
            {step === "done" && "Password reset successfully"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          {step === "email" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-9"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Send Reset Code"}
              </Button>
              <div className="text-center">
                <Link href="/login" className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Back to login
                </Link>
              </div>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="token">6-digit Reset Code</Label>
                <Input
                  id="token"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  className="text-center text-2xl tracking-widest font-mono"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="newpw">New Password</Label>
                <Input id="newpw" type="password" placeholder="Min. 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input id="confirm" type="password" placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Resetting…" : "Reset Password"}
              </Button>
              <button type="button" className="w-full text-sm text-muted-foreground hover:text-primary" onClick={() => setStep("email")}>
                ← Use a different email
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle2 className="w-14 h-14 text-emerald-400" />
              <p className="text-center text-sm text-muted-foreground">Your password has been reset. You can now sign in.</p>
              <Link href="/login">
                <Button className="w-full">Go to Login</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

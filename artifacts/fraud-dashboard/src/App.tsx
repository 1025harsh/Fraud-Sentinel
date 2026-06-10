import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import "@/lib/api";
import { Sidebar } from "@/components/sidebar";

import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Transactions from "@/pages/transactions";
import TransactionDetail from "@/pages/transaction-detail";
import Cards from "@/pages/cards";
import Alerts from "@/pages/alerts";
import Admin from "@/pages/admin";
import CommandCenter from "@/pages/command-center";
import VirtualCards from "@/pages/virtual-cards";
import Security from "@/pages/security";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground font-mono">Authenticating...</span>
        </div>
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;
  if (adminOnly && user.role !== "admin") return <Redirect to="/dashboard" />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <Component />
      </main>
    </div>
  );
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return <Redirect to="/dashboard" />;
  return <Component />;
}

function AppRouter() {
  const { user, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/" component={() => {
        if (isLoading) return null;
        return <Redirect to={user ? "/dashboard" : "/login"} />;
      }} />
      <Route path="/login" component={() => <PublicRoute component={Login} />} />
      <Route path="/register" component={() => <PublicRoute component={Register} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/transactions" component={() => <ProtectedRoute component={Transactions} />} />
      <Route path="/transactions/:id" component={() => <ProtectedRoute component={TransactionDetail} />} />
      <Route path="/cards" component={() => <ProtectedRoute component={Cards} />} />
      <Route path="/alerts" component={() => <ProtectedRoute component={Alerts} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={Admin} adminOnly />} />
      <Route path="/command-center" component={() => <ProtectedRoute component={CommandCenter} />} />
      <Route path="/virtual-cards" component={() => <ProtectedRoute component={VirtualCards} />} />
      <Route path="/security" component={() => <ProtectedRoute component={Security} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRouter />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

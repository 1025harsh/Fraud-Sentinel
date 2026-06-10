import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Shield, LayoutDashboard, ListOrdered, CreditCard, Bell, ShieldAlert, LogOut } from "lucide-react";

export function Sidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="w-64 bg-card border-r border-border h-full flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-2 text-primary">
          <Shield className="w-6 h-6 text-destructive" />
          <span className="font-bold text-lg tracking-tight">FraudGuard</span>
        </div>
      </div>
      
      <div className="px-4 pb-4">
        <div className="text-xs font-mono text-muted-foreground mb-4 uppercase tracking-wider">Operations</div>
        <nav className="flex flex-col gap-1">
          <NavItem href="/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" active={location === "/dashboard"} />
          <NavItem href="/transactions" icon={<ListOrdered size={18} />} label="Transactions" active={location.startsWith("/transactions")} />
          <NavItem href="/cards" icon={<CreditCard size={18} />} label="Cards" active={location === "/cards"} />
          <NavItem href="/alerts" icon={<Bell size={18} />} label="Alerts" active={location === "/alerts"} />
          {user?.role === "admin" && (
            <NavItem href="/admin" icon={<ShieldAlert size={18} />} label="Admin" active={location === "/admin"} />
          )}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-medium text-sm">
            {user?.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-sm font-medium truncate">{user?.name}</span>
            <span className="text-xs text-muted-foreground truncate">{user?.role}</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-primary transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
        active 
          ? "bg-secondary text-primary" 
          : "text-muted-foreground hover:text-primary hover:bg-secondary/50"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

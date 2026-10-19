import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeftRight, BarChart3, HandCoins, LayoutGrid, Send, UserRound, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useFinance } from "@/lib/store";
import { formatINR } from "@/lib/finance";
import { Avatar } from "@/components/finance-ui";
import { cn } from "@/lib/utils";

type NavTo = "/" | "/transactions" | "/send" | "/requests" | "/analytics" | "/profile";
const NAV: { to: NavTo; label: string; short: string; icon: LucideIcon }[] = [
  { to: "/", label: "Dashboard", short: "Home", icon: LayoutGrid },
  { to: "/transactions", label: "Transactions", short: "Activity", icon: ArrowLeftRight },
  { to: "/send", label: "Send money", short: "Send", icon: Send },
  { to: "/requests", label: "Requests", short: "Requests", icon: HandCoins },
  { to: "/analytics", label: "Analytics", short: "Insights", icon: BarChart3 },
];

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
        <svg viewBox="0 0 24 24" className="size-5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M16.5 7.5a6 6 0 1 0 0 9" />
          <path d="M12 9v6" />
        </svg>
      </span>
      <span className="font-display text-xl font-bold">
        Coin<span className="text-primary">Track</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, balance, requests } = useFinance();
  const pendingIncoming = requests.filter((r) => r.direction === "incoming" && r.status === "pending").length;
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <div className="min-h-screen bg-page">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <Logo className="px-2" />
        <nav className="mt-10 flex flex-1 flex-col gap-1">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Menu</p>
          {[...NAV, { to: "/profile" as const, label: "Profile & settings", short: "Profile", icon: UserRound }].map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <item.icon className={cn("size-[18px]", active && "text-primary")} strokeWidth={1.8} />
                {item.label}
                {item.to === "/requests" && pendingIncoming > 0 && (
                  <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                    {pendingIncoming}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="rounded-2xl border border-sidebar-border bg-surface p-4">
          <p className="text-xs text-muted-foreground">Available balance</p>
          <p className="figure mt-1 font-display text-xl font-bold">{formatINR(balance)}</p>
          <Link to="/profile" className="mt-4 flex items-center gap-3 border-t border-sidebar-border pt-4">
            <Avatar name={profile.name} className="size-9" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{profile.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{profile.handle}</span>
            </span>
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Logo />
        <Link to="/profile" aria-label="Profile">
          <Avatar name={profile.name} className="size-9" />
        </Link>
      </header>

      <main className="px-4 pb-28 pt-6 sm:px-6 lg:ml-64 lg:px-10 lg:pb-12 lg:pt-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl lg:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map((item) => {
            const active = isActive(item.to);
            const center = item.to === "/send";
            return (
              <li key={item.to} className="flex justify-center">
                <Link
                  to={item.to}
                  className={cn(
                    "relative flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-medium",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {center ? (
                    <span className="-mt-6 grid size-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                      <item.icon className="size-5" />
                    </span>
                  ) : (
                    <item.icon className={cn("size-5", active && "text-primary")} strokeWidth={1.8} />
                  )}
                  {item.short}
                  {item.to === "/requests" && pendingIncoming > 0 && (
                    <span className="absolute right-1 top-0 size-2 rounded-full bg-primary" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

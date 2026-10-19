import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, HandCoins, Plus, Send, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, CATEGORY_COLORS, Money, PageHeader } from "@/components/finance-ui";
import { TransactionRow } from "@/components/transaction-row";
import { TransactionDialog } from "@/components/transaction-dialog";
import { ChartTooltip } from "@/components/chart-tooltip";
import { useFinance } from "@/lib/store";
import { categoryBreakdown, formatCompactINR, formatINR, inMonth, monthTotals, monthlySeries, percentChange } from "@/lib/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — CoinTrack" },
      { name: "description", content: "Your CoinTrack overview: balance, monthly cash flow, spending by category and pending requests." },
      { property: "og:title", content: "Dashboard — CoinTrack" },
      { property: "og:description", content: "Your balance, cash flow and spending at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function greeting(h: number) {
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { profile, balance, transactions, requests, contacts, payRequest } = useFinance();
  const [dialogOpen, setDialogOpen] = useState(false);
  const now = new Date();

  const thisMonth = monthTotals(transactions, now);
  const lastMonth = monthTotals(transactions, new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const series = useMemo(() => monthlySeries(transactions, 6, new Date()), [transactions]);
  const monthTx = transactions.filter((t) => inMonth(t.date, now.getFullYear(), now.getMonth()));
  const breakdown = categoryBreakdown(monthTx, "expense");
  const top = breakdown.slice(0, 5);
  const other = breakdown.slice(5).reduce((s, c) => s + c.amount, 0);
  const pie = other > 0 ? [...top, { category: "Other", amount: other, share: 0 }] : top;
  const savingsRate = thisMonth.income ? Math.max(0, (thisMonth.net / thisMonth.income) * 100) : 0;
  const pending = requests.filter((r) => r.direction === "incoming" && r.status === "pending");

  const handlePay = (id: string, name: string) => {
    const res = payRequest(id);
    if (res.ok) toast.success(`Paid ${name}`);
    else toast.error(res.error);
  };

  return (
    <>
      <PageHeader
        eyebrow={format(now, "EEEE, d MMMM")}
        title={`${greeting(now.getHours())}, ${profile.name.split(" ")[0]}`}
        description="Here's where your money is going this month."
        actions={
          <>
            <Button variant="soft" onClick={() => setDialogOpen(true)}>
              <Plus /> Add transaction
            </Button>
            <Button variant="hero" asChild>
              <Link to="/send"><Send /> Send money</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        {/* Balance card */}
        <section className="grain relative overflow-hidden rounded-3xl border border-border bg-balance p-6 shadow-card animate-rise sm:p-8 lg:col-span-2">
          <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full border border-primary/20" />
          <div className="pointer-events-none absolute -right-2 top-6 size-28 rounded-full border border-primary/25" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="size-4 text-primary" /> Total balance
          </div>
          <p className="figure mt-3 font-display text-4xl font-bold sm:text-6xl">{formatINR(balance)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className={cn("font-semibold", thisMonth.net >= 0 ? "text-income" : "text-expense")}>
              {thisMonth.net >= 0 ? "+" : "−"}
              {formatINR(Math.abs(thisMonth.net))}
            </span>{" "}
            net this month
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="rounded-2xl bg-background/40 p-4 backdrop-blur">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ArrowDownLeft className="size-3.5 text-income" /> Money in</p>
              <p className="figure mt-1 font-display text-xl font-semibold">{formatINR(thisMonth.income)}</p>
            </div>
            <div className="rounded-2xl bg-background/40 p-4 backdrop-blur">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ArrowUpRight className="size-3.5 text-expense" /> Money out</p>
              <p className="figure mt-1 font-display text-xl font-semibold">{formatINR(thisMonth.expense)}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="hero" size="sm" asChild><Link to="/send"><Send /> Send</Link></Button>
            <Button variant="soft" size="sm" asChild><Link to="/requests"><HandCoins /> Request</Link></Button>
            <Button variant="soft" size="sm" onClick={() => setDialogOpen(true)}><Plus /> Log expense</Button>
          </div>
        </section>

        {/* Pending requests */}
        <section className="panel flex flex-col p-5 animate-rise sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Payment requests</h2>
            <Link to="/requests" className="text-xs font-semibold text-primary hover:underline">View all</Link>
          </div>
          <p className="text-xs text-muted-foreground">{pending.length} waiting for you</p>
          <div className="mt-4 flex flex-1 flex-col gap-3">
            {pending.slice(0, 3).map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-surface p-3">
                <div className="flex items-center gap-3">
                  <Avatar name={r.name} className="size-9 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.note}</p>
                  </div>
                  <Money amount={r.amount} className="text-sm" signed={false} />
                </div>
                <Button size="sm" className="mt-3 w-full" onClick={() => handlePay(r.id, r.name)}>
                  Pay {formatINR(r.amount)}
                </Button>
              </div>
            ))}
            {pending.length === 0 && (
              <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                You're all settled up 🎉
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Stats */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:mt-5 lg:gap-5">
        <StatCard label="Income this month" value={thisMonth.income} change={percentChange(thisMonth.income, lastMonth.income)} good="up" />
        <StatCard label="Spent this month" value={thisMonth.expense} change={percentChange(thisMonth.expense, lastMonth.expense)} good="down" />
        <div className="panel p-5">
          <p className="text-xs font-medium text-muted-foreground">Savings rate</p>
          <p className="figure mt-2 font-display text-3xl font-bold">{savingsRate.toFixed(0)}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${Math.min(100, savingsRate)}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">of this month's income kept</p>
        </div>
      </div>

      {/* Charts */}
      <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-3 lg:gap-5">
        <section className="panel p-5 sm:p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Cash flow</h2>
              <p className="text-xs text-muted-foreground">Last 6 months</p>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-income" /> Income</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-expense" /> Expenses</span>
            </div>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -10, right: 4, top: 8 }}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--income)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--income)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--expense)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--expense)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickFormatter={formatCompactINR} width={56} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)" }} />
                <Area type="monotone" dataKey="income" name="Income" stroke="var(--income)" strokeWidth={2.5} fill="url(#gIn)" />
                <Area type="monotone" dataKey="expense" name="Expenses" stroke="var(--expense)" strokeWidth={2.5} fill="url(#gOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Spending mix</h2>
          <p className="text-xs text-muted-foreground">{format(now, "MMMM")} by category</p>
          {pie.length ? (
            <>
              <div className="relative mx-auto mt-2 h-44 w-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pie} dataKey="amount" nameKey="category" innerRadius={58} outerRadius={84} paddingAngle={3} stroke="none">
                      {pie.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Spent</p>
                    <p className="figure font-display text-lg font-bold">{formatCompactINR(thisMonth.expense)}</p>
                  </div>
                </div>
              </div>
              <ul className="mt-3 space-y-2">
                {pie.map((c, i) => (
                  <li key={c.category} className="flex items-center gap-2 text-sm">
                    <span className="size-2.5 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    <span className="flex-1 truncate text-muted-foreground">{c.category}</span>
                    <span className="figure font-semibold">{formatINR(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-10 text-center text-sm text-muted-foreground">No spending yet this month.</p>
          )}
        </section>
      </div>

      {/* Recent + quick send */}
      <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-3 lg:gap-5">
        <section className="panel p-3 sm:p-4 lg:col-span-2">
          <div className="flex items-center justify-between px-2 pb-2 pt-1 sm:px-3">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <Link to="/transactions" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              All transactions <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border/60">
            {transactions.slice(0, 7).map((t) => <TransactionRow key={t.id} tx={t} compact />)}
          </div>
        </section>

        <section className="panel p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Quick send</h2>
          <p className="text-xs text-muted-foreground">Your frequent contacts</p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {contacts.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                to="/send"
                search={{ to: c.id }}
                className="flex flex-col items-center gap-2 rounded-2xl p-2 text-center transition-colors hover:bg-surface-2"
              >
                <Avatar name={c.name} className="size-12" />
                <span className="w-full truncate text-xs font-medium">{c.name.split(" ")[0]}</span>
              </Link>
            ))}
          </div>
          <Button variant="soft" className="mt-5 w-full" asChild>
            <Link to="/send"><Send /> New payment</Link>
          </Button>
        </section>
      </div>

      <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

function StatCard({ label, value, change, good }: { label: string; value: number; change: number | null; good: "up" | "down" }) {
  const up = (change ?? 0) >= 0;
  const positive = good === "up" ? up : !up;
  return (
    <div className="panel p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="figure mt-2 font-display text-3xl font-bold">{formatINR(value)}</p>
      {change !== null ? (
        <p className={cn("mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", positive ? "bg-income-soft text-income" : "bg-expense-soft text-expense")}>
          {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
          {Math.abs(change).toFixed(1)}% vs last month
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No data last month</p>
      )}
    </div>
  );
}

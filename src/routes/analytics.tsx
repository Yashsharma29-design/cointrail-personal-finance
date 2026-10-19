import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { CATEGORY_COLORS, CategoryIcon, PageHeader } from "@/components/finance-ui";
import { ChartTooltip } from "@/components/chart-tooltip";
import { useFinance } from "@/lib/store";
import { categoryBreakdown, formatCompactINR, formatINR, monthlySeries } from "@/lib/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — CoinTrack" },
      { name: "description", content: "Monthly income vs expenses, category trends and your biggest spends, all in CoinTrack." },
      { property: "og:title", content: "Analytics — CoinTrack" },
      { property: "og:description", content: "See exactly where your money goes each month." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

const RANGES = [3, 6] as const;

function AnalyticsPage() {
  const { transactions } = useFinance();
  const [range, setRange] = useState<(typeof RANGES)[number]>(6);

  const series = useMemo(() => monthlySeries(transactions, range, new Date()), [transactions, range]);
  const inRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (range - 1), 1);
    return transactions.filter((t) => new Date(t.date) >= start);
  }, [transactions, range]);

  const spend = categoryBreakdown(inRange, "expense");
  const earn = categoryBreakdown(inRange, "income");
  const totalIn = series.reduce((s, m) => s + m.income, 0);
  const totalOut = series.reduce((s, m) => s + m.expense, 0);
  const avgOut = totalOut / range;
  const biggest = [...inRange].filter((t) => t.type === "expense" && t.category !== "Rent" && t.category !== "Transfer").sort((a, b) => b.amount - a.amount).slice(0, 5);
  const best = [...series].sort((a, b) => b.net - a.net)[0];

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Spot trends and see exactly where your money goes."
        actions={
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
            {RANGES.map((r) => (
              <Button key={r} size="sm" variant={range === r ? "default" : "ghost"} onClick={() => setRange(r)}>
                {r} months
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Total earned" value={formatINR(totalIn)} tone="income" />
        <Kpi label="Total spent" value={formatINR(totalOut)} tone="expense" />
        <Kpi label="Avg. monthly spend" value={formatINR(avgOut)} />
        <Kpi label="Best month" value={best ? best.label : "—"} sub={best ? `${formatINR(best.net)} saved` : undefined} />
      </div>

      <section className="panel mt-4 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Income vs expenses</h2>
        <p className="text-xs text-muted-foreground">Monthly totals</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} barGap={6} margin={{ left: -10, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickFormatter={formatCompactINR} width={56} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-2)" }} />
              <Bar dataKey="income" name="Income" fill="var(--income)" radius={[8, 8, 0, 0]} maxBarSize={36} />
              <Bar dataKey="expense" name="Expenses" fill="var(--expense)" radius={[8, 8, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Breakdown title="Where it went" items={spend} type="expense" />
        <div className="grid gap-4">
          <Breakdown title="Where it came from" items={earn} type="income" />
          <section className="panel p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Biggest spends</h2>
            <p className="text-xs text-muted-foreground">Excluding rent and transfers</p>
            <ul className="mt-4 space-y-3">
              {biggest.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3">
                  <span className="figure w-4 text-xs font-bold text-muted-foreground">{i + 1}</span>
                  <CategoryIcon category={t.category} type={t.type} className="size-9" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{t.description}</span>
                    <span className="block text-xs text-muted-foreground">{t.category}</span>
                  </span>
                  <span className="figure text-sm font-semibold">{formatINR(t.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "income" | "expense" }) {
  return (
    <div className="panel p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("figure mt-1 font-display text-xl font-bold sm:text-2xl", tone === "income" && "text-income", tone === "expense" && "text-expense")}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Breakdown({ title, items, type }: { title: string; items: { category: string; amount: number; share: number }[]; type: "income" | "expense" }) {
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-4 space-y-4">
        {items.map((c, i) => (
          <li key={c.category}>
            <div className="flex items-center gap-3">
              <CategoryIcon category={c.category} type={type} className="size-9" />
              <span className="flex-1 text-sm font-medium">{c.category}</span>
              <span className="text-xs text-muted-foreground">{(c.share * 100).toFixed(1)}%</span>
              <span className="figure w-24 text-right text-sm font-semibold">{formatINR(c.amount)}</span>
            </div>
            <div className="ml-12 mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, c.share * 100)}%`, background: type === "income" ? "var(--income)" : CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
              />
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-muted-foreground">Nothing recorded in this period.</li>}
      </ul>
    </section>
  );
}

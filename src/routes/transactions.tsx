import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Download, Plus, Search, SearchX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState, PageHeader } from "@/components/finance-ui";
import { TransactionRow } from "@/components/transaction-row";
import { TransactionDialog } from "@/components/transaction-dialog";
import { useFinance } from "@/lib/store";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, formatINR, sumBy, type Transaction } from "@/lib/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — CoinTrack" },
      { name: "description", content: "Search, filter, add, edit and delete every income and expense in CoinTrack." },
      { property: "og:title", content: "Transactions — CoinTrack" },
      { property: "og:description", content: "Every rupee in and out, searchable and editable." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TransactionsPage,
});

type TypeFilter = "all" | "income" | "expense";
const ALL_CATEGORIES = Array.from(new Set<string>([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]));

function TransactionsPage() {
  const { transactions, deleteTransaction, addTransaction } = useFinance();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [category, setCategory] = useState("all");
  const [month, setMonth] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [toDelete, setToDelete] = useState<Transaction | null>(null);

  const months = useMemo(() => {
    const set = new Map<string, string>();
    for (const t of transactions) {
      const d = new Date(t.date);
      set.set(format(d, "yyyy-MM"), format(d, "MMMM yyyy"));
    }
    return [...set.entries()];
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (category !== "all" && t.category !== category) return false;
      if (month !== "all" && format(new Date(t.date), "yyyy-MM") !== month) return false;
      if (q && !`${t.description} ${t.category} ${t.counterparty ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [transactions, query, typeFilter, category, month]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const key = format(new Date(t.date), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return [...map.entries()];
  }, [filtered]);

  const totalIn = sumBy(filtered, "income");
  const totalOut = sumBy(filtered, "expense");

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (t: Transaction) => {
    setEditing(t);
    setDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    const removed = toDelete;
    deleteTransaction(removed.id);
    setToDelete(null);
    toast("Transaction deleted", {
      action: { label: "Undo", onClick: () => addTransaction({ ...removed }) },
    });
  };

  const exportCsv = () => {
    const rows = [["Date", "Type", "Description", "Category", "Method", "Status", "Amount (INR)"]];
    for (const t of filtered) rows.push([format(new Date(t.date), "yyyy-MM-dd HH:mm"), t.type, t.description, t.category, t.method, t.status, String(t.amount)]);
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `cointrack-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} transactions`);
  };

  return (
    <>
      <PageHeader
        eyebrow="Ledger"
        title="Transactions"
        description="Every rupee in and out. Tap a row's menu to edit or delete it."
        actions={
          <>
            <Button variant="soft" onClick={exportCsv}><Download /> Export</Button>
            <Button variant="hero" onClick={openNew}><Plus /> Add transaction</Button>
          </>
        }
      />

      <div className="panel p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search description, category or person" value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 pl-9" />
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
            {(["all", "income", "expense"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-semibold capitalize transition-colors",
                  typeFilter === t ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 lg:w-96">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {ALL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                {months.map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-border px-1 pt-3 text-xs text-muted-foreground">
          <span>{filtered.length} transactions</span>
          <span>In <span className="figure font-semibold text-income">{formatINR(totalIn)}</span></span>
          <span>Out <span className="figure font-semibold text-expense">{formatINR(totalOut)}</span></span>
        </div>
      </div>

      <div className="panel mt-4 p-2 sm:p-3">
        {groups.length === 0 ? (
          <EmptyState icon={SearchX} title="Nothing matches" text="Try a different search or clear your filters." />
        ) : (
          groups.map(([day, list]) => {
            const net = list.reduce((s, t) => (t.status === "completed" ? s + (t.type === "income" ? t.amount : -t.amount) : s), 0);
            return (
              <div key={day} className="mb-2 last:mb-0">
                <div className="sticky top-[61px] z-10 flex items-center justify-between rounded-lg bg-card/95 px-3 py-2 text-xs font-semibold text-muted-foreground backdrop-blur lg:top-0">
                  <span>{format(new Date(day), "EEEE, d MMM yyyy")}</span>
                  <span className={cn("figure", net >= 0 ? "text-income" : "text-muted-foreground")}>
                    {net >= 0 ? "+" : "−"}{formatINR(Math.abs(net))}
                  </span>
                </div>
                {list.map((t) => <TransactionRow key={t.id} tx={t} onEdit={openEdit} onDelete={setToDelete} />)}
              </div>
            );
          })
        )}
      </div>

      <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && `${toDelete.description} · ${formatINR(toDelete.amount)}. Your balance will be recalculated.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

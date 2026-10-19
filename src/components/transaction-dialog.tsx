import { useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAY_METHODS,
  type PayMethod,
  type Transaction,
  type TxStatus,
  type TxType,
} from "@/lib/finance";
import { useFinance } from "@/lib/store";
import { cn } from "@/lib/utils";

const schema = z.object({
  amount: z.number({ invalid_type_error: "Enter an amount" }).positive("Amount must be more than ₹0").max(10_000_000, "That's a little too much"),
  description: z.string().trim().min(2, "Add a short description").max(80),
  category: z.string().min(1),
  date: z.string().min(1, "Pick a date"),
});

function toDateInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function TransactionDialog({
  open,
  onOpenChange,
  editing,
  defaultType = "expense",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Transaction | null;
  defaultType?: TxType;
}) {
  const { addTransaction, updateTransaction } = useFinance();
  const [type, setType] = useState<TxType>(defaultType);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("Food & Dining");
  const [date, setDate] = useState("");
  const [method, setMethod] = useState<PayMethod>("UPI");
  const [status, setStatus] = useState<TxStatus>("completed");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setDescription(editing.description);
      setCategory(editing.category);
      setDate(toDateInput(editing.date));
      setMethod(editing.method);
      setStatus(editing.status);
    } else {
      setType(defaultType);
      setAmount("");
      setDescription("");
      setCategory(defaultType === "income" ? "Salary" : "Food & Dining");
      setDate(toDateInput(new Date().toISOString()));
      setMethod("UPI");
      setStatus("completed");
    }
  }, [open, editing, defaultType]);

  const categories: readonly string[] = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const switchType = (t: TxType) => {
    setType(t);
    const list: readonly string[] = t === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!list.includes(category)) setCategory(list[0] ?? "Other");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ amount: amount === "" ? NaN : Number(amount), description, category, date });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] = issue.message;
      setErrors(errs);
      return;
    }
    // Keep original time-of-day when editing; use now for new entries on today.
    const base = editing ? new Date(editing.date) : new Date();
    const [y = 0, m = 1, d = 1] = date.split("-").map(Number);
    const when = new Date(y, m - 1, d, base.getHours(), base.getMinutes()).toISOString();
    const payload = { type, amount: parsed.data.amount, description: parsed.data.description, category, date: when, method, status };
    if (editing) {
      updateTransaction(editing.id, payload);
      toast.success("Transaction updated");
    } else {
      addTransaction(payload);
      toast.success(type === "income" ? "Income added" : "Expense added");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{editing ? "Edit transaction" : "New transaction"}</DialogTitle>
          <DialogDescription>{editing ? "Update the details below." : "Log money coming in or going out."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchType(t)}
                className={cn(
                  "rounded-lg py-2 text-sm font-semibold capitalize transition-colors",
                  type === t ? (t === "income" ? "bg-income text-primary-foreground" : "bg-expense text-primary-foreground") : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <Field label="Amount" error={errors["amount"]}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-display text-lg text-muted-foreground">₹</span>
              <Input
                inputMode="decimal"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="figure h-12 pl-8 font-display text-xl"
                autoFocus
              />
            </div>
          </Field>

          <Field label="Description" error={errors["description"]}>
            <Input placeholder="e.g. Swiggy — Friday dinner" value={description} onChange={(e) => setDescription(e.target.value)} className="h-11" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date" error={errors["date"]}>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
            </Field>
            <Field label="Paid via">
              <Select value={method} onValueChange={(v) => setMethod(v as PayMethod)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAY_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as TxStatus)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="hero">{editing ? "Save changes" : "Add transaction"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, error, children }: { label: string; error?: string | undefined; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs font-medium text-expense">{error}</p>}
    </div>
  );
}

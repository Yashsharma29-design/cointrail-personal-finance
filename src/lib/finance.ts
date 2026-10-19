// Pure finance logic for CoinTrack. No React, no browser APIs — safe to test and SSR.

export type TxType = "income" | "expense";
export type TxStatus = "completed" | "pending";
export type PayMethod = "UPI" | "Card" | "Bank" | "Cash";

export const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Groceries",
  "Transport",
  "Shopping",
  "Bills & Utilities",
  "Rent",
  "Entertainment",
  "Health",
  "Travel",
  "Transfer",
  "Other",
] as const;

export const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Investments",
  "Refund",
  "Transfer",
  "Gift",
  "Other",
] as const;

export const PAY_METHODS: PayMethod[] = ["UPI", "Card", "Bank", "Cash"];

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  description: string;
  date: string; // ISO
  method: PayMethod;
  status: TxStatus;
  counterparty?: string;
}

export interface Contact {
  id: string;
  name: string;
  handle: string;
}

export type RequestDirection = "incoming" | "outgoing";
export type RequestStatus = "pending" | "paid" | "declined" | "cancelled";

export interface PaymentRequest {
  id: string;
  direction: RequestDirection;
  name: string;
  handle: string;
  amount: number;
  note: string;
  date: string;
  status: RequestStatus;
}

export interface Profile {
  name: string;
  email: string;
  handle: string;
  phone: string;
}

export interface FinanceState {
  profile: Profile;
  openingBalance: number;
  transactions: Transaction[];
  requests: PaymentRequest[];
  contacts: Contact[];
}

/** Balance = opening balance + completed income − completed expenses. */
export function computeBalance(openingBalance: number, txs: Transaction[]): number {
  let bal = openingBalance;
  for (const t of txs) {
    if (t.status !== "completed") continue;
    bal += t.type === "income" ? t.amount : -t.amount;
  }
  return Math.round(bal * 100) / 100;
}

/** Returns an error message, or null when the payment is allowed. */
export function validatePayment(amount: number, balance: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return "Enter an amount greater than ₹0";
  if (amount > balance) return "Insufficient balance for this payment";
  if (amount > 200000) return "Single payments are limited to ₹2,00,000";
  return null;
}

export function sumBy(txs: Transaction[], type: TxType): number {
  return txs.filter((t) => t.type === type && t.status === "completed").reduce((s, t) => s + t.amount, 0);
}

export function inMonth(iso: string, year: number, month: number): boolean {
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() === month;
}

export function monthTotals(txs: Transaction[], ref: Date) {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const list = txs.filter((t) => inMonth(t.date, y, m));
  const income = sumBy(list, "income");
  const expense = sumBy(list, "expense");
  return { income, expense, net: income - expense };
}

export function monthlySeries(txs: Transaction[], months: number, ref: Date) {
  const out: { key: string; label: string; income: number; expense: number; net: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const t = monthTotals(txs, d);
    out.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString("en-IN", { month: "short" }),
      ...t,
    });
  }
  return out;
}

export function categoryBreakdown(txs: Transaction[], type: TxType) {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== type || t.status !== "completed") continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount, share: total ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const inrPrecise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatINR(n: number, precise = false): string {
  return (precise ? inrPrecise : inr).format(n);
}

export function formatCompactINR(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(0)}k`;
  return `${sign}₹${abs.toFixed(0)}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

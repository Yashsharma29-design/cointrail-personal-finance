import {
  ArrowLeftRight,
  Banknote,
  Briefcase,
  Car,
  Clapperboard,
  Gift,
  HeartPulse,
  Home,
  LineChart,
  Plane,
  Receipt,
  RotateCcw,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatINR, initials, type TxType } from "@/lib/finance";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Food & Dining": UtensilsCrossed,
  Groceries: ShoppingBasket,
  Transport: Car,
  Shopping: ShoppingBag,
  "Bills & Utilities": Receipt,
  Rent: Home,
  Entertainment: Clapperboard,
  Health: HeartPulse,
  Travel: Plane,
  Transfer: ArrowLeftRight,
  Salary: Briefcase,
  Freelance: Sparkles,
  Investments: LineChart,
  Refund: RotateCcw,
  Gift: Gift,
};

export const CATEGORY_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export function CategoryIcon({ category, type, className }: { category: string; type: TxType; className?: string }) {
  const Icon = CATEGORY_ICONS[category] ?? Banknote;
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-xl",
        type === "income" ? "bg-income-soft text-income" : "bg-surface-2 text-foreground/80",
        className,
      )}
    >
      <Icon className="size-[18px]" strokeWidth={1.75} />
    </span>
  );
}

export function Money({
  amount,
  type,
  className,
  signed = true,
}: {
  amount: number;
  type?: TxType;
  className?: string;
  signed?: boolean;
}) {
  const sign = signed && type ? (type === "income" ? "+" : "−") : "";
  return (
    <span className={cn("figure font-semibold", type === "income" && "text-income", className)}>
      {sign}
      {formatINR(amount)}
    </span>
  );
}

const AVATAR_TONES = [
  "bg-income-soft text-income",
  "bg-expense-soft text-expense",
  "bg-warning-soft text-warning",
  "bg-primary/15 text-primary",
  "bg-surface-2 text-foreground",
];

export function Avatar({ name, className }: { name: string; className?: string }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold font-display",
        AVATAR_TONES[h % AVATAR_TONES.length],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="animate-rise">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "completed" || status === "paid"
      ? "bg-income-soft text-income"
      : status === "pending"
        ? "bg-warning-soft text-warning"
        : "bg-expense-soft text-expense";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", tone)}>
      {status}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

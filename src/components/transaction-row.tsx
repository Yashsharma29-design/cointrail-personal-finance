import { format } from "date-fns";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Transaction } from "@/lib/finance";
import { CategoryIcon, Money, StatusPill } from "@/components/finance-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TransactionRow({
  tx,
  onEdit,
  onDelete,
  compact = false,
}: {
  tx: Transaction;
  onEdit?: (t: Transaction) => void;
  onDelete?: (t: Transaction) => void;
  compact?: boolean;
}) {
  const d = new Date(tx.date);
  return (
    <div className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-2/60 sm:gap-4 sm:px-3">
      <CategoryIcon category={tx.category} type={tx.type} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{tx.description}</p>
        <p className="truncate text-xs text-muted-foreground">
          {tx.category} · {format(d, compact ? "d MMM" : "d MMM, h:mm a")}
          {!compact && <span className="hidden sm:inline"> · {tx.method}</span>}
        </p>
      </div>
      {!compact && tx.status === "pending" && (
        <span className="hidden sm:inline">
          <StatusPill status="pending" />
        </span>
      )}
      <div className="text-right">
        <Money amount={tx.amount} type={tx.type} className="text-sm" />
        {compact && tx.status === "pending" && <p className="text-[11px] font-medium text-warning">Pending</p>}
      </div>
      {(onEdit || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Transaction actions"
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(tx)}>
                <Pencil className="mr-2 size-4" /> Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem onClick={() => onDelete(tx)} className="text-expense focus:text-expense">
                <Trash2 className="mr-2 size-4" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

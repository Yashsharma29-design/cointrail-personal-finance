import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { HandCoins, Inbox, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, EmptyState, Money, PageHeader, StatusPill } from "@/components/finance-ui";
import { Field } from "@/components/transaction-dialog";
import { useFinance } from "@/lib/store";
import { formatINR, type PaymentRequest } from "@/lib/finance";

export const Route = createFileRoute("/requests")({
  head: () => ({
    meta: [
      { title: "Payment requests — CoinTrack" },
      { name: "description", content: "Pay or decline money requests from friends, and request money from others in CoinTrack." },
      { property: "og:title", content: "Payment requests — CoinTrack" },
      { property: "og:description", content: "Settle up with friends without the awkward reminders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const { requests, payRequest, declineRequest, cancelRequest, simulateRequestPaid } = useFinance();
  const [open, setOpen] = useState(false);
  const incoming = requests.filter((r) => r.direction === "incoming");
  const outgoing = requests.filter((r) => r.direction === "outgoing");
  const owe = incoming.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0);
  const owed = outgoing.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0);

  const pay = (r: PaymentRequest) => {
    const res = payRequest(r.id);
    if (res.ok) toast.success(`Paid ${formatINR(r.amount)} to ${r.name}`);
    else toast.error(res.error);
  };

  return (
    <>
      <PageHeader
        eyebrow="Split & settle"
        title="Payment requests"
        description="Money people have asked you for, and money you've asked others for."
        actions={<Button variant="hero" onClick={() => setOpen(true)}><Plus /> Request money</Button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-4">
        <div className="panel p-5">
          <p className="text-xs font-medium text-muted-foreground">You owe</p>
          <p className="figure mt-1 font-display text-2xl font-bold text-expense sm:text-3xl">{formatINR(owe)}</p>
        </div>
        <div className="panel p-5">
          <p className="text-xs font-medium text-muted-foreground">Owed to you</p>
          <p className="figure mt-1 font-display text-2xl font-bold text-income sm:text-3xl">{formatINR(owed)}</p>
        </div>
      </div>

      <Tabs defaultValue="incoming">
        <TabsList className="h-11 rounded-xl bg-surface-2 p-1">
          <TabsTrigger value="incoming" className="rounded-lg px-4 py-1.5">Received ({incoming.filter((r) => r.status === "pending").length})</TabsTrigger>
          <TabsTrigger value="outgoing" className="rounded-lg px-4 py-1.5">Sent ({outgoing.filter((r) => r.status === "pending").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="mt-4">
          <RequestList
            items={incoming}
            empty={<EmptyState icon={Inbox} title="No requests" text="When someone asks you for money it'll show up here." />}
            renderActions={(r) =>
              r.status === "pending" && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { declineRequest(r.id); toast(`Declined ${r.name}'s request`); }}>Decline</Button>
                  <Button size="sm" onClick={() => pay(r)}>Pay</Button>
                </div>
              )
            }
          />
        </TabsContent>

        <TabsContent value="outgoing" className="mt-4">
          <RequestList
            items={outgoing}
            empty={<EmptyState icon={Send} title="Nothing requested" text="Ask a friend to pay you back for that dinner." />}
            renderActions={(r) =>
              r.status === "pending" && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { cancelRequest(r.id); toast("Request cancelled"); }}>Cancel</Button>
                  <Button variant="soft" size="sm" onClick={() => { simulateRequestPaid(r.id); toast.success(`${r.name} paid you ${formatINR(r.amount)}`); }}>
                    Mark received
                  </Button>
                </div>
              )
            }
          />
        </TabsContent>
      </Tabs>

      <RequestDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function RequestList({
  items,
  empty,
  renderActions,
}: {
  items: PaymentRequest[];
  empty: React.ReactNode;
  renderActions: (r: PaymentRequest) => React.ReactNode;
}) {
  if (!items.length) return <div className="panel">{empty}</div>;
  const sorted = [...items].sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending") || b.date.localeCompare(a.date));
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {sorted.map((r) => (
        <article key={r.id} className="panel animate-rise p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Avatar name={r.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold">{r.name}</p>
                <StatusPill status={r.status} />
              </div>
              <p className="truncate text-xs text-muted-foreground">{r.handle} · {formatDistanceToNow(new Date(r.date), { addSuffix: true })}</p>
            </div>
            <Money amount={r.amount} signed={false} className="font-display text-lg" />
          </div>
          <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-sm text-muted-foreground">"{r.note}"</p>
          {r.status === "pending" && <div className="mt-3 flex justify-end">{renderActions(r)}</div>}
        </article>
      ))}
    </div>
  );
}

function RequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { contacts, createRequest } = useFinance();
  const [contactId, setContactId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = contacts.find((x) => x.id === contactId);
    const value = Number(amount);
    if (!c) return setError("Choose who to request from");
    if (!Number.isFinite(value) || value <= 0) return setError("Enter an amount greater than ₹0");
    if (note.trim().length < 2) return setError("Add a short note so they know what it's for");
    createRequest({ name: c.name, handle: c.handle, amount: value, note: note.trim() });
    toast.success(`Requested ${formatINR(value)} from ${c.name}`);
    setContactId("");
    setAmount("");
    setNote("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-2xl"><HandCoins className="size-5 text-primary" /> Request money</DialogTitle>
          <DialogDescription>They'll get a request they can pay in one tap.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="From">
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Choose a contact" /></SelectTrigger>
              <SelectContent>
                {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} · {c.handle}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Amount">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-display text-lg text-muted-foreground">₹</span>
              <Input type="number" inputMode="decimal" min="0" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="figure h-12 pl-8 font-display text-xl" />
            </div>
          </Field>
          <Field label="What's it for?">
            <Input placeholder="e.g. Movie tickets" maxLength={60} value={note} onChange={(e) => setNote(e.target.value)} className="h-11" />
          </Field>
          {error && <p className="text-sm font-medium text-expense">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="hero">Send request</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { ArrowLeft, Check, Search, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, PageHeader } from "@/components/finance-ui";
import { Field } from "@/components/transaction-dialog";
import { useFinance } from "@/lib/store";
import { PAY_METHODS, formatINR, validatePayment, type Contact, type PayMethod } from "@/lib/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/send")({
  validateSearch: z.object({ to: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Send money — CoinTrack" },
      { name: "description", content: "Send money to friends and family by UPI, card or bank transfer with CoinTrack." },
      { property: "og:title", content: "Send money — CoinTrack" },
      { property: "og:description", content: "Pay anyone in a few taps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SendPage,
});

type Step = "pick" | "amount" | "review" | "done";
const QUICK = [500, 1000, 2000, 5000];
const handleSchema = z.string().trim().regex(/^[\w.-]+@[\w.-]+$/, "Enter a valid UPI ID, like name@bank");

function SendPage() {
  const { to } = Route.useSearch();
  const { contacts, balance, sendMoney, addContact } = useFinance();
  const preset = contacts.find((c) => c.id === to) ?? null;
  const [recipient, setRecipient] = useState<Contact | null>(preset);
  const [step, setStep] = useState<Step>(preset ? "amount" : "pick");
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newHandle, setNewHandle] = useState("");
  const [newErr, setNewErr] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<PayMethod>("UPI");
  const [error, setError] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.toLowerCase();
    return contacts.filter((c) => `${c.name} ${c.handle}`.toLowerCase().includes(q));
  }, [contacts, query]);

  const value = Number(amount);

  const choose = (c: Contact) => {
    setRecipient(c);
    setStep("amount");
  };

  const addNew = () => {
    if (newName.trim().length < 2) return setNewErr("Enter the person's name");
    const h = handleSchema.safeParse(newHandle);
    if (!h.success) return setNewErr(h.error.issues[0]?.message ?? "Invalid UPI ID");
    const c = addContact({ name: newName.trim(), handle: h.data });
    setNewName("");
    setNewHandle("");
    setNewErr(null);
    choose(c);
  };

  const toReview = () => {
    const err = validatePayment(value, balance);
    setError(err);
    if (!err) setStep("review");
  };

  const confirm = () => {
    if (!recipient) return;
    const res = sendMoney({ name: recipient.name, handle: recipient.handle, amount: value, note: note.trim(), method });
    if (!res.ok) {
      setError(res.error);
      setStep("amount");
      toast.error(res.error);
      return;
    }
    setStep("done");
  };

  const restart = () => {
    setRecipient(null);
    setAmount("");
    setNote("");
    setError(null);
    setStep("pick");
  };

  return (
    <>
      <PageHeader eyebrow="Payments" title="Send money" description={`Available balance: ${formatINR(balance)}`} />

      <div className="mx-auto max-w-xl">
        <Stepper step={step} />

        {step === "pick" && (
          <div className="panel animate-rise p-4 sm:p-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search name or UPI ID" value={query} onChange={(e) => setQuery(e.target.value)} className="h-12 pl-9" />
            </div>
            <ul className="mt-4 space-y-1">
              {list.map((c) => (
                <li key={c.id}>
                  <button onClick={() => choose(c)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2">
                    <Avatar name={c.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{c.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{c.handle}</span>
                    </span>
                  </button>
                </li>
              ))}
              {list.length === 0 && <li className="px-2 py-4 text-sm text-muted-foreground">No contacts match "{query}".</li>}
            </ul>

            <div className="mt-5 rounded-2xl border border-dashed border-border p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><UserPlus className="size-4 text-primary" /> Pay someone new</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-11" />
                <Input placeholder="UPI ID (name@bank)" value={newHandle} onChange={(e) => setNewHandle(e.target.value)} className="h-11" />
              </div>
              {newErr && <p className="mt-2 text-xs font-medium text-expense">{newErr}</p>}
              <Button variant="soft" className="mt-3 w-full" onClick={addNew}>Continue</Button>
            </div>
          </div>
        )}

        {step === "amount" && recipient && (
          <div className="panel animate-rise p-5 sm:p-7">
            <button onClick={() => setStep("pick")} className="mb-4 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-3.5" /> Change recipient
            </button>
            <div className="flex items-center gap-3">
              <Avatar name={recipient.name} className="size-12" />
              <div>
                <p className="font-display text-lg font-semibold">{recipient.name}</p>
                <p className="text-xs text-muted-foreground">{recipient.handle}</p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="font-display text-4xl text-muted-foreground">₹</span>
                <input
                  aria-label="Amount"
                  inputMode="decimal"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={amount}
                  autoFocus
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError(null);
                  }}
                  className="figure w-full max-w-[16rem] bg-transparent text-center font-display text-6xl font-bold outline-none placeholder:text-muted-foreground/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              {error && <p className="mt-2 text-sm font-medium text-expense">{error}</p>}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {QUICK.map((q) => (
                  <button key={q} onClick={() => { setAmount(String(q)); setError(null); }} className="figure rounded-full border border-border px-4 py-1.5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary">
                    {formatINR(q)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-4">
              <Field label="Note (optional)">
                <Input placeholder="What's it for?" maxLength={60} value={note} onChange={(e) => setNote(e.target.value)} className="h-11" />
              </Field>
              <Field label="Pay using">
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
                  {PAY_METHODS.filter((m) => m !== "Cash").map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={cn("rounded-lg py-2 text-xs font-semibold transition-colors", method === m ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground")}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <Button variant="hero" size="lg" className="mt-6 w-full" onClick={toReview}>Review payment</Button>
          </div>
        )}

        {step === "review" && recipient && (
          <div className="panel animate-rise p-5 sm:p-7">
            <p className="text-center text-sm text-muted-foreground">You're sending</p>
            <p className="figure mt-1 text-center font-display text-5xl font-bold">{formatINR(value)}</p>
            <div className="mt-6 space-y-3 rounded-2xl bg-surface p-4 text-sm">
              <Row label="To" value={`${recipient.name}`} sub={recipient.handle} />
              <Row label="Method" value={method} />
              {note && <Row label="Note" value={note} />}
              <Row label="Fee" value="Free" />
              <Row label="Balance after" value={formatINR(balance - value)} />
            </div>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-income" /> Demo mode — no real money moves
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="soft" size="lg" onClick={() => setStep("amount")}>Edit</Button>
              <Button variant="hero" size="lg" onClick={confirm}>Confirm & send</Button>
            </div>
          </div>
        )}

        {step === "done" && recipient && (
          <div className="panel animate-rise p-8 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
              <Check className="size-8" strokeWidth={3} />
            </span>
            <h2 className="mt-5 text-2xl font-bold">Payment sent</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="figure font-semibold text-foreground">{formatINR(value)}</span> to {recipient.name}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="soft" onClick={restart}>Send another</Button>
              <Button variant="hero" asChild><Link to="/transactions">View activity</Link></Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">
        <span className="figure block font-semibold">{value}</span>
        {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
      </span>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "pick", label: "Recipient" },
    { key: "amount", label: "Amount" },
    { key: "review", label: "Confirm" },
  ];
  const idx = step === "done" ? 3 : steps.findIndex((s) => s.key === step);
  return (
    <ol className="mb-5 flex items-center gap-2">
      {steps.map((s, i) => (
        <li key={s.key} className="flex flex-1 items-center gap-2">
          <span className={cn("grid size-6 place-items-center rounded-full text-[11px] font-bold", i <= idx ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground")}>
            {i < idx ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
          </span>
          <span className={cn("text-xs font-semibold", i <= idx ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
          {i < steps.length - 1 && <span className={cn("h-px flex-1", i < idx ? "bg-primary" : "bg-border")} />}
        </li>
      ))}
    </ol>
  );
}

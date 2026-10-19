import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Copy, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, PageHeader } from "@/components/finance-ui";
import { Field } from "@/components/transaction-dialog";
import { useFinance } from "@/lib/store";
import { formatINR } from "@/lib/finance";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile & settings — CoinTrack" },
      { name: "description", content: "Manage your CoinTrack profile, UPI ID and demo data." },
      { property: "og:title", content: "Profile & settings — CoinTrack" },
      { property: "og:description", content: "Your CoinTrack account details and preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(50),
  email: z.string().trim().email("Enter a valid email"),
  handle: z.string().trim().regex(/^[\w.-]+@[\w.-]+$/, "UPI ID should look like name@bank"),
  phone: z.string().trim().min(8, "Enter a valid phone number").max(20),
});

function ProfilePage() {
  const { profile, updateProfile, resetDemo, balance, transactions, requests } = useFinance();
  const [form, setForm] = useState(profile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [prefs, setPrefs] = useState({ alerts: true, weekly: true, requests: true });

  useEffect(() => setForm(profile), [profile]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] = i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    updateProfile(parsed.data);
    toast.success("Profile saved");
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader eyebrow="Account" title="Profile & settings" />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="grain overflow-hidden rounded-3xl border border-border bg-balance p-6 shadow-card">
          <Avatar name={profile.name} className="size-16 text-xl" />
          <h2 className="mt-4 text-2xl font-bold">{profile.name}</h2>
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(profile.handle);
              toast.success("UPI ID copied");
            }}
            className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            {profile.handle} <Copy className="size-3.5" />
          </button>
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-background/40 p-3">
              <dt className="text-xs text-muted-foreground">Balance</dt>
              <dd className="figure font-display font-semibold">{formatINR(balance)}</dd>
            </div>
            <div className="rounded-2xl bg-background/40 p-3">
              <dt className="text-xs text-muted-foreground">Transactions</dt>
              <dd className="figure font-display font-semibold">{transactions.length}</dd>
            </div>
            <div className="col-span-2 rounded-2xl bg-background/40 p-3">
              <dt className="text-xs text-muted-foreground">Open requests</dt>
              <dd className="figure font-display font-semibold">{requests.filter((r) => r.status === "pending").length}</dd>
            </div>
          </dl>
        </section>

        <form onSubmit={save} className="panel grid gap-4 p-5 sm:p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold">Personal details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={errors.name}><Input className="h-11" value={form.name} onChange={set("name")} /></Field>
            <Field label="Email" error={errors.email}><Input className="h-11" type="email" value={form.email} onChange={set("email")} /></Field>
            <Field label="UPI ID" error={errors.handle}><Input className="h-11" value={form.handle} onChange={set("handle")} /></Field>
            <Field label="Phone" error={errors.phone}><Input className="h-11" value={form.phone} onChange={set("phone")} /></Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="hero">Save changes</Button>
          </div>
        </form>

        <section className="panel p-5 sm:p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <ul className="mt-4 divide-y divide-border">
            {([
              ["alerts", "Large transaction alerts", "Get notified for any spend above ₹10,000"],
              ["requests", "Payment requests", "When someone asks you for money"],
              ["weekly", "Weekly summary", "A Sunday recap of your spending"],
            ] as const).map(([k, title, text]) => (
              <li key={k} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground">{text}</p>
                </div>
                <Switch checked={prefs[k]} onCheckedChange={(v) => setPrefs({ ...prefs, [k]: v })} />
              </li>
            ))}
          </ul>
        </section>

        <section className="panel flex flex-col p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Demo data</h2>
          <p className="mt-1 flex-1 text-sm text-muted-foreground">
            <ShieldCheck className="mr-1 inline size-4 text-income" />
            Everything is saved only in this browser. Reset to start over with fresh sample data.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="mt-4"><RotateCcw /> Reset demo data</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display">Reset all data?</AlertDialogTitle>
                <AlertDialogDescription>Your transactions, requests and profile changes will be replaced with the original sample data.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    resetDemo();
                    toast.success("Demo data restored");
                  }}
                >
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </div>
    </>
  );
}

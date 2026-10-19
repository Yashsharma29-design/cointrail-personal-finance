import type { Contact, FinanceState, PayMethod, PaymentRequest, Transaction } from "./finance";

// Deterministic PRNG so server and client build the same demo data.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MERCHANTS: Record<string, { names: string[]; min: number; max: number; perMonth: number; method: PayMethod }> = {
  "Food & Dining": { names: ["Swiggy", "Zomato", "Blue Tokai Coffee", "Third Wave Coffee", "Truffles"], min: 220, max: 1450, perMonth: 8, method: "UPI" },
  Groceries: { names: ["BigBasket", "Blinkit", "Zepto", "DMart"], min: 380, max: 3200, perMonth: 5, method: "UPI" },
  Transport: { names: ["Uber", "Ola", "Namma Metro", "Indian Oil"], min: 90, max: 1800, perMonth: 6, method: "UPI" },
  Shopping: { names: ["Amazon", "Myntra", "Nykaa", "Croma"], min: 650, max: 7800, perMonth: 2, method: "Card" },
  Entertainment: { names: ["BookMyShow", "Steam", "PVR Cinemas"], min: 300, max: 1600, perMonth: 1, method: "Card" },
  Health: { names: ["Apollo Pharmacy", "Cult.fit", "Practo"], min: 250, max: 2400, perMonth: 1, method: "UPI" },
};

export const SEED_CONTACTS: Contact[] = [
  { id: "c1", name: "Aarav Mehta", handle: "aarav@okhdfc" },
  { id: "c2", name: "Priya Nair", handle: "priya.nair@oksbi" },
  { id: "c3", name: "Rohan Kapoor", handle: "rohank@ybl" },
  { id: "c4", name: "Ananya Iyer", handle: "ananya.iyer@okicici" },
  { id: "c5", name: "Kabir Singh", handle: "kabir@paytm" },
  { id: "c6", name: "Meera Joshi", handle: "meeraj@okaxis" },
];

function iso(y: number, m: number, d: number, h: number, min: number) {
  return new Date(y, m, d, h, min).toISOString();
}

export function createSeed(today: Date = new Date()): FinanceState {
  const rand = mulberry32(20261019);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)] as T;
  const between = (a: number, b: number) => Math.round(a + rand() * (b - a));
  const txs: Transaction[] = [];
  let n = 0;
  const push = (t: Omit<Transaction, "id" | "status"> & { status?: Transaction["status"] }) => {
    if (new Date(t.date) > today) return;
    txs.push({ status: "completed", ...t, id: `seed-${++n}` });
  };

  for (let back = 5; back >= 0; back--) {
    const base = new Date(today.getFullYear(), today.getMonth() - back, 1);
    const y = base.getFullYear();
    const m = base.getMonth();
    const days = new Date(y, m + 1, 0).getDate();

    push({ type: "income", amount: 145000, category: "Salary", description: "Salary — Northwind Labs", date: iso(y, m, 1, 9, 30), method: "Bank", counterparty: "Northwind Labs Pvt Ltd" });
    push({ type: "expense", amount: 32000, category: "Rent", description: "Rent — Indiranagar flat", date: iso(y, m, 3, 10, 5), method: "Bank", counterparty: "Mr. Suresh Rao" });
    push({ type: "expense", amount: 1199, category: "Bills & Utilities", description: "Airtel Xstream Fiber", date: iso(y, m, 5, 8, 0), method: "UPI" });
    push({ type: "expense", amount: between(1400, 2900), category: "Bills & Utilities", description: "BESCOM Electricity", date: iso(y, m, 9, 19, 12), method: "UPI" });
    push({ type: "expense", amount: 649, category: "Entertainment", description: "Netflix Premium", date: iso(y, m, 12, 0, 1), method: "Card" });
    push({ type: "expense", amount: 15000, category: "Transfer", description: "SIP — Nifty 50 Index Fund", date: iso(y, m, 7, 11, 0), method: "Bank" });

    if (rand() > 0.3) {
      push({ type: "income", amount: between(18, 46) * 1000, category: "Freelance", description: pick(["Logo design — Chaipoint", "Landing page — Fitbase", "UI audit — Kirana Club", "Pitch deck — Loop Health"]), date: iso(y, m, between(14, 26), 16, 20), method: "Bank" });
    }
    if (rand() > 0.6) {
      push({ type: "income", amount: between(800, 4200), category: "Investments", description: "Dividend — HDFC Bank", date: iso(y, m, between(10, 25), 12, 0), method: "Bank" });
    }

    for (const [category, cfg] of Object.entries(MERCHANTS)) {
      for (let i = 0; i < cfg.perMonth; i++) {
        const d = between(1, days);
        push({ type: "expense", amount: between(cfg.min, cfg.max), category, description: pick(cfg.names), date: iso(y, m, d, between(8, 22), between(0, 59)), method: cfg.method });
      }
    }
  }

  // A couple of pending items in the current month for realism.
  push({ type: "expense", amount: 4299, category: "Shopping", description: "Amazon — Kindle order", date: iso(today.getFullYear(), today.getMonth(), Math.max(1, today.getDate() - 1), 14, 5), method: "Card", status: "pending" });

  txs.sort((a, b) => b.date.localeCompare(a.date));

  const daysAgo = (d: number, h = 12) => {
    const x = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d, h, 15);
    return x.toISOString();
  };

  const requests: PaymentRequest[] = [
    { id: "r1", direction: "incoming", name: "Rohan Kapoor", handle: "rohank@ybl", amount: 1250, note: "Dinner at Toit 🍺", date: daysAgo(0, 9), status: "pending" },
    { id: "r2", direction: "incoming", name: "Ananya Iyer", handle: "ananya.iyer@okicici", amount: 3400, note: "Goa trip — villa share", date: daysAgo(2), status: "pending" },
    { id: "r3", direction: "incoming", name: "Kabir Singh", handle: "kabir@paytm", amount: 640, note: "Airport cab split", date: daysAgo(4), status: "pending" },
    { id: "r4", direction: "outgoing", name: "Priya Nair", handle: "priya.nair@oksbi", amount: 2200, note: "Prateek Kuhad concert tickets", date: daysAgo(1), status: "pending" },
    { id: "r5", direction: "outgoing", name: "Meera Joshi", handle: "meeraj@okaxis", amount: 900, note: "Birthday cake contribution", date: daysAgo(6), status: "paid" },
    { id: "r6", direction: "incoming", name: "Aarav Mehta", handle: "aarav@okhdfc", amount: 1800, note: "Badminton court booking", date: daysAgo(9), status: "paid" },
  ];

  return {
    profile: {
      name: "Yash Sharma",
      email: "yash.sharma@cointrack.app",
      handle: "yash@cointrack",
      phone: "+91 98450 12345",
    },
    openingBalance: 85000,
    transactions: txs,
    requests,
    contacts: SEED_CONTACTS,
  };
}

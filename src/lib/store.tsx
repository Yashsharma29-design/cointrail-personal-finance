import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  computeBalance,
  validatePayment,
  type Contact,
  type FinanceState,
  type PayMethod,
  type PaymentRequest,
  type Profile,
  type Transaction,
} from "./finance";
import { createSeed } from "./seed";

const STORAGE_KEY = "cointrack:v1";

function newId(prefix: string) {
  return `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now().toString(36)}`;
}

type Result = { ok: true } | { ok: false; error: string };

interface FinanceContextValue extends FinanceState {
  balance: number;
  hydrated: boolean;
  addTransaction: (t: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, "id">>) => void;
  deleteTransaction: (id: string) => void;
  sendMoney: (input: { name: string; handle: string; amount: number; note: string; method: PayMethod }) => Result;
  payRequest: (id: string) => Result;
  declineRequest: (id: string) => void;
  createRequest: (input: { name: string; handle: string; amount: number; note: string }) => void;
  cancelRequest: (id: string) => void;
  simulateRequestPaid: (id: string) => void;
  addContact: (c: Omit<Contact, "id">) => Contact;
  updateProfile: (p: Partial<Profile>) => void;
  resetDemo: () => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(() => createSeed());
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw) as FinanceState);
    } catch {
      /* corrupted storage: keep seed */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const balance = useMemo(() => computeBalance(state.openingBalance, state.transactions), [state]);

  const addTransaction = useCallback((t: Omit<Transaction, "id">) => {
    setState((s) => ({
      ...s,
      transactions: [{ ...t, id: newId("tx") }, ...s.transactions].sort((a, b) => b.date.localeCompare(a.date)),
    }));
  }, []);

  const updateTransaction = useCallback((id: string, patch: Partial<Omit<Transaction, "id">>) => {
    setState((s) => ({
      ...s,
      transactions: s.transactions
        .map((t) => (t.id === id ? { ...t, ...patch } : t))
        .sort((a, b) => b.date.localeCompare(a.date)),
    }));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setState((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }));
  }, []);

  const sendMoney: FinanceContextValue["sendMoney"] = useCallback((input) => {
    const s = stateRef.current;
    const err = validatePayment(input.amount, computeBalance(s.openingBalance, s.transactions));
    if (err) return { ok: false, error: err };
    const tx: Transaction = {
      id: newId("tx"),
      type: "expense",
      amount: input.amount,
      category: "Transfer",
      description: `Sent to ${input.name}`,
      date: new Date().toISOString(),
      method: input.method,
      status: "completed",
      counterparty: `${input.name} · ${input.handle}${input.note ? ` — ${input.note}` : ""}`,
    };
    setState((prev) => ({ ...prev, transactions: [tx, ...prev.transactions] }));
    return { ok: true };
  }, []);

  const payRequest: FinanceContextValue["payRequest"] = useCallback((id) => {
    const s = stateRef.current;
    const req = s.requests.find((r) => r.id === id);
    if (!req || req.status !== "pending") return { ok: false, error: "This request is no longer pending" };
    const err = validatePayment(req.amount, computeBalance(s.openingBalance, s.transactions));
    if (err) return { ok: false, error: err };
    const tx: Transaction = {
      id: newId("tx"),
      type: "expense",
      amount: req.amount,
      category: "Transfer",
      description: `Paid ${req.name}`,
      date: new Date().toISOString(),
      method: "UPI",
      status: "completed",
      counterparty: `${req.name} · ${req.handle} — ${req.note}`,
    };
    setState((prev) => ({
      ...prev,
      transactions: [tx, ...prev.transactions],
      requests: prev.requests.map((r) => (r.id === id ? { ...r, status: "paid" } : r)),
    }));
    return { ok: true };
  }, []);

  const setRequestStatus = (id: string, status: PaymentRequest["status"]) =>
    setState((prev) => ({ ...prev, requests: prev.requests.map((r) => (r.id === id ? { ...r, status } : r)) }));

  const declineRequest = useCallback((id: string) => setRequestStatus(id, "declined"), []);
  const cancelRequest = useCallback((id: string) => setRequestStatus(id, "cancelled"), []);

  const simulateRequestPaid = useCallback((id: string) => {
    setState((prev) => {
      const req = prev.requests.find((r) => r.id === id);
      if (!req || req.status !== "pending") return prev;
      const tx: Transaction = {
        id: newId("tx"),
        type: "income",
        amount: req.amount,
        category: "Transfer",
        description: `Received from ${req.name}`,
        date: new Date().toISOString(),
        method: "UPI",
        status: "completed",
        counterparty: `${req.name} · ${req.handle} — ${req.note}`,
      };
      return {
        ...prev,
        transactions: [tx, ...prev.transactions],
        requests: prev.requests.map((r) => (r.id === id ? { ...r, status: "paid" } : r)),
      };
    });
  }, []);

  const createRequest: FinanceContextValue["createRequest"] = useCallback((input) => {
    const req: PaymentRequest = {
      id: newId("req"),
      direction: "outgoing",
      status: "pending",
      date: new Date().toISOString(),
      ...input,
    };
    setState((prev) => ({ ...prev, requests: [req, ...prev.requests] }));
  }, []);

  const addContact = useCallback((c: Omit<Contact, "id">) => {
    const contact = { ...c, id: newId("c") };
    setState((prev) => ({ ...prev, contacts: [...prev.contacts, contact] }));
    return contact;
  }, []);

  const updateProfile = useCallback((p: Partial<Profile>) => {
    setState((prev) => ({ ...prev, profile: { ...prev.profile, ...p } }));
  }, []);

  const resetDemo = useCallback(() => setState(createSeed()), []);

  const value: FinanceContextValue = {
    ...state,
    balance,
    hydrated,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    sendMoney,
    payRequest,
    declineRequest,
    createRequest,
    cancelRequest,
    simulateRequestPaid,
    addContact,
    updateProfile,
    resetDemo,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used inside FinanceProvider");
  return ctx;
}

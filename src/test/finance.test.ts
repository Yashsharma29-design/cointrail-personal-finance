import { describe, expect, it } from "vitest";
import { computeBalance, validatePayment, type Transaction } from "@/lib/finance";

const tx = (p: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(),
  type: "expense",
  amount: 0,
  category: "Other",
  description: "x",
  date: "2026-10-01T10:00:00.000Z",
  method: "UPI",
  status: "completed",
  ...p,
});

describe("balance", () => {
  it("adds completed income and subtracts completed expenses from the opening balance", () => {
    const txs = [tx({ type: "income", amount: 1000 }), tx({ type: "expense", amount: 300 })];
    expect(computeBalance(5000, txs)).toBe(5700);
  });

  it("ignores pending transactions", () => {
    expect(computeBalance(5000, [tx({ amount: 2000, status: "pending" })])).toBe(5000);
  });
});

describe("sending money", () => {
  it("rejects payments larger than the balance", () => {
    expect(validatePayment(1500, 1000)).toBe("Insufficient balance for this payment");
  });

  it("rejects zero or negative amounts", () => {
    expect(validatePayment(0, 1000)).not.toBeNull();
    expect(validatePayment(-5, 1000)).not.toBeNull();
  });

  it("allows a payment equal to the balance", () => {
    expect(validatePayment(1000, 1000)).toBeNull();
  });
});

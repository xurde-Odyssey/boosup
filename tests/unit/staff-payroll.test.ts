import { recalculateStaffLedgerSnapshots } from "@/lib/staff-payroll";
import { staffLedgersFixture, staffTransactionsFixture } from "@/tests/fixtures/financial";

describe("staff payroll ledger snapshots", () => {
  it("deducts advances from salary paid and produces remaining plus carry forward", () => {
    const snapshots = recalculateStaffLedgerSnapshots(
      staffLedgersFixture,
      staffTransactionsFixture,
    );

    expect(snapshots.ledgers).toHaveLength(2);

    const firstMonth = snapshots.ledgers[0];
    expect(firstMonth.total_advance).toBe(35000);
    expect(firstMonth.salary_paid).toBe(0);
    expect(firstMonth.total_paid).toBe(35000);
    expect(firstMonth.payable_amount).toBe(30000);
    expect(firstMonth.remaining).toBe(0);
    expect(firstMonth.carry_forward).toBe(5000);
    expect(firstMonth.status).toBe("CLOSED");

    const nextMonth = snapshots.ledgers[1];
    expect(nextMonth.carry_in).toBe(5000);
    expect(nextMonth.payable_amount).toBe(25000);
    expect(nextMonth.remaining).toBe(25000);
    expect(nextMonth.carry_forward).toBe(0);
    expect(nextMonth.status).toBe("OPEN");
  });

  it("tracks per-transaction remaining balance after each payment", () => {
    const snapshots = recalculateStaffLedgerSnapshots(
      staffLedgersFixture,
      staffTransactionsFixture,
    );

    const latestTransaction = snapshots.transactions.find((transaction) => transaction.id === "txn-3");
    expect(latestTransaction).toBeDefined();
    expect(latestTransaction?.total_paid_after).toBe(35000);
    expect(latestTransaction?.remaining_after).toBe(0);
    expect(latestTransaction?.carry_forward_after).toBe(5000);
  });
});

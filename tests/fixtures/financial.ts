import type { StaffLedgerRecord, StaffSalaryTransactionRecord } from "@/lib/staff-payroll";

export const supplierAllocationPurchases = [
  {
    id: "purchase-101",
    purchase_date: "2026-01-10",
    created_at: "2026-01-10T10:00:00Z",
    total_amount: 7000,
    paid_amount: 0,
    credit_amount: 7000,
    payment_status: "PENDING",
  },
  {
    id: "purchase-200",
    purchase_date: "2026-02-15",
    created_at: "2026-02-15T10:00:00Z",
    total_amount: 17000,
    paid_amount: 0,
    credit_amount: 17000,
    payment_status: "PENDING",
  },
] as const;

export const dashboardFixture = {
  sales: [{ grand_total: 45000 }, { grand_total: 18500 }],
  purchases: [
    { total_amount: 25000, credit_amount: 10000 },
    { total_amount: 8000, credit_amount: 0 },
  ],
};

export const staffLedgersFixture: StaffLedgerRecord[] = [
  {
    id: "ledger-1",
    staff_id: "staff-1",
    month: 12,
    year: 2082,
    base_salary: 30000,
  },
  {
    id: "ledger-2",
    staff_id: "staff-1",
    month: 1,
    year: 2083,
    base_salary: 30000,
  },
];

export const staffTransactionsFixture: StaffSalaryTransactionRecord[] = [
  {
    id: "txn-1",
    staff_id: "staff-1",
    ledger_id: "ledger-1",
    transaction_date: "2026-03-01",
    type: "ADVANCE",
    amount: 10000,
    created_at: "2026-03-01T09:00:00Z",
  },
  {
    id: "txn-2",
    staff_id: "staff-1",
    ledger_id: "ledger-1",
    transaction_date: "2026-03-05",
    type: "ADVANCE",
    amount: 15000,
    created_at: "2026-03-05T09:00:00Z",
  },
  {
    id: "txn-3",
    staff_id: "staff-1",
    ledger_id: "ledger-1",
    transaction_date: "2026-03-10",
    type: "ADVANCE",
    amount: 10000,
    created_at: "2026-03-10T09:00:00Z",
  },
];

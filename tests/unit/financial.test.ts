import {
  allocateSupplierPaymentToOldestBills,
  calculateDashboardSummaryTotals,
  calculatePurchasePaymentState,
  calculateSalesPaymentState,
  calculateSupplierTotalPending,
  resolvePurchasePaymentStatus,
} from "@/lib/financial";
import { dashboardFixture, supplierAllocationPurchases } from "@/tests/fixtures/financial";

describe("financial workflows", () => {
  it("calculates the remaining sales amount after a partial payment", () => {
    const result = calculateSalesPaymentState({
      grossTotal: 25000,
      existingAmountReceived: 5000,
      requestedPaymentStatus: "PARTIAL",
      paymentIncrementInput: 7000,
    });

    expect(result.paymentIncrement).toBe(7000);
    expect(result.amountReceived).toBe(12000);
    expect(result.remainingAmount).toBe(13000);
    expect(result.paymentStatus).toBe("PARTIAL");
  });

  it("caps sales collection at the remaining balance when marked paid", () => {
    const result = calculateSalesPaymentState({
      grossTotal: 18000,
      existingAmountReceived: 8000,
      requestedPaymentStatus: "PAID",
      paymentIncrementInput: 0,
    });

    expect(result.maxCollectibleAmount).toBe(10000);
    expect(result.paymentIncrement).toBe(10000);
    expect(result.remainingAmount).toBe(0);
    expect(result.paymentStatus).toBe("PAID");
  });

  it("calculates purchase payable and status correctly for partial bills", () => {
    const result = calculatePurchasePaymentState({
      totalAmount: 25000,
      previousPaidAmount: 8000,
      paymentNow: 3000,
      requestedPaymentStatus: "PARTIAL",
      isNewRecord: false,
    });

    expect(result.paidAmount).toBe(11000);
    expect(result.remainingAmount).toBe(14000);
    expect(result.paymentStatus).toBe("PARTIAL");
    expect(result.paymentType).toBe("Credit");
  });

  it("resolves overdue purchase status without clearing overdue state on partial payment", () => {
    expect(
      resolvePurchasePaymentStatus({
        totalAmount: 12000,
        paidAmount: 5000,
        previousStatus: "OVERDUE",
      }),
    ).toBe("OVERDUE");
  });

  it("calculates supplier total pending from bill-level purchase balances", () => {
    expect(calculateSupplierTotalPending([...supplierAllocationPurchases])).toBe(24000);
  });

  it("allocates supplier payments to the oldest unpaid purchase bills first", () => {
    const allocations = allocateSupplierPaymentToOldestBills(
      [...supplierAllocationPurchases],
      10000,
    );

    expect(allocations).toHaveLength(2);
    expect(allocations[0]).toMatchObject({
      purchase: expect.objectContaining({ id: "purchase-101" }),
      allocatedAmount: 7000,
    });
    expect(allocations[1]).toMatchObject({
      purchase: expect.objectContaining({ id: "purchase-200" }),
      allocatedAmount: 3000,
    });
  });

  it("summarizes dashboard totals from sales and purchases", () => {
    const result = calculateDashboardSummaryTotals(dashboardFixture);

    expect(result.totalSales).toBe(63500);
    expect(result.totalPurchases).toBe(33000);
    expect(result.payables).toBe(10000);
    expect(result.netProfit).toBe(30500);
  });
});

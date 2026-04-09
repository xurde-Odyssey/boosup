export type PurchasePaymentStatus = "PAID" | "PARTIAL" | "PENDING" | "OVERDUE";

type NumericLike = number | null | undefined;

const toNonNegativeNumber = (value: NumericLike) => Math.max(Number(value ?? 0), 0);

export const calculateRemainingAmount = (totalAmount: NumericLike, paidAmount: NumericLike) =>
  Math.max(toNonNegativeNumber(totalAmount) - toNonNegativeNumber(paidAmount), 0);

export const resolvePurchasePaymentStatus = ({
  totalAmount,
  paidAmount,
  previousStatus,
}: {
  totalAmount: NumericLike;
  paidAmount: NumericLike;
  previousStatus: string | null | undefined;
}): PurchasePaymentStatus => {
  const remainingAmount = calculateRemainingAmount(totalAmount, paidAmount);

  if (remainingAmount <= 0) {
    return "PAID";
  }

  if (toNonNegativeNumber(paidAmount) > 0) {
    return previousStatus === "OVERDUE" ? "OVERDUE" : "PARTIAL";
  }

  return previousStatus === "OVERDUE" ? "OVERDUE" : "PENDING";
};

export const calculatePurchasePaymentState = ({
  totalAmount,
  previousPaidAmount,
  paymentNow,
  requestedPaymentStatus,
  isNewRecord,
}: {
  totalAmount: NumericLike;
  previousPaidAmount: NumericLike;
  paymentNow: NumericLike;
  requestedPaymentStatus: string | null | undefined;
  isNewRecord: boolean;
}) => {
  const normalizedTotalAmount = toNonNegativeNumber(totalAmount);
  const normalizedPaymentNow =
    requestedPaymentStatus === "PAID" && isNewRecord && toNonNegativeNumber(paymentNow) <= 0
      ? normalizedTotalAmount
      : Math.max(toNonNegativeNumber(paymentNow), 0);
  const paidAmount = Math.min(
    toNonNegativeNumber(previousPaidAmount) + normalizedPaymentNow,
    normalizedTotalAmount,
  );
  const remainingAmount = calculateRemainingAmount(normalizedTotalAmount, paidAmount);
  const paymentStatus = resolvePurchasePaymentStatus({
    totalAmount: normalizedTotalAmount,
    paidAmount,
    previousStatus: requestedPaymentStatus,
  });

  return {
    normalizedPaymentNow,
    paidAmount,
    remainingAmount,
    paymentStatus,
    paymentType: remainingAmount <= 0 ? "Cash" : "Credit",
  };
};

export const calculateSalesPaymentState = ({
  grossTotal,
  existingAmountReceived,
  requestedPaymentStatus,
  paymentIncrementInput,
}: {
  grossTotal: NumericLike;
  existingAmountReceived: NumericLike;
  requestedPaymentStatus: string | null | undefined;
  paymentIncrementInput: NumericLike;
}) => {
  const normalizedGrossTotal = toNonNegativeNumber(grossTotal);
  const normalizedExistingAmountReceived = toNonNegativeNumber(existingAmountReceived);
  const remainingBeforePayment = calculateRemainingAmount(
    normalizedGrossTotal,
    normalizedExistingAmountReceived,
  );
  const maxCollectibleAmount = remainingBeforePayment > 0 ? remainingBeforePayment : 0;

  const paymentIncrement =
    maxCollectibleAmount <= 0
      ? 0
      : requestedPaymentStatus === "PAID"
        ? Math.min(
            toNonNegativeNumber(paymentIncrementInput) > 0
              ? toNonNegativeNumber(paymentIncrementInput)
              : maxCollectibleAmount,
            maxCollectibleAmount,
          )
        : requestedPaymentStatus === "PARTIAL"
          ? Math.min(toNonNegativeNumber(paymentIncrementInput), maxCollectibleAmount)
          : 0;
  const amountReceived = Math.max(normalizedExistingAmountReceived + paymentIncrement, 0);
  const remainingAmount = calculateRemainingAmount(normalizedGrossTotal, amountReceived);
  const paymentStatus =
    amountReceived >= normalizedGrossTotal && normalizedGrossTotal > 0
      ? "PAID"
      : amountReceived > 0
        ? "PARTIAL"
        : requestedPaymentStatus === "OVERDUE"
          ? "OVERDUE"
          : "PENDING";

  return {
    remainingBeforePayment,
    maxCollectibleAmount,
    paymentIncrement,
    amountReceived,
    remainingAmount,
    paymentStatus,
  };
};

export type SupplierPayablePurchase = {
  id: string;
  purchase_date?: string | null;
  created_at?: string | null;
  total_amount?: NumericLike;
  paid_amount?: NumericLike;
  credit_amount?: NumericLike;
  payment_status?: string | null;
};

export const getPurchaseOutstandingAmount = (purchase: SupplierPayablePurchase) => {
  const totalAmount = toNonNegativeNumber(purchase.total_amount);
  const paidAmount = toNonNegativeNumber(purchase.paid_amount);
  return Math.max(toNonNegativeNumber(purchase.credit_amount ?? totalAmount - paidAmount), 0);
};

export const calculateSupplierTotalPending = (purchases: SupplierPayablePurchase[]) =>
  purchases.reduce((sum, purchase) => sum + getPurchaseOutstandingAmount(purchase), 0);

export const allocateSupplierPaymentToOldestBills = (
  purchases: SupplierPayablePurchase[],
  paymentAmount: NumericLike,
) => {
  let remainingToAllocate = toNonNegativeNumber(paymentAmount);
  const orderedPurchases = [...purchases]
    .map((purchase) => ({
      ...purchase,
      remainingAmount: getPurchaseOutstandingAmount(purchase),
    }))
    .filter((purchase) => purchase.remainingAmount > 0)
    .sort((left, right) => {
      const leftDate = `${left.purchase_date ?? ""}|${left.created_at ?? ""}`;
      const rightDate = `${right.purchase_date ?? ""}|${right.created_at ?? ""}`;
      return leftDate.localeCompare(rightDate);
    });

  return orderedPurchases
    .map((purchase) => {
      if (remainingToAllocate <= 0) {
        return null;
      }

      const allocatedAmount = Math.min(remainingToAllocate, purchase.remainingAmount);
      remainingToAllocate -= allocatedAmount;

      return {
        purchase,
        allocatedAmount,
      };
    })
    .filter(
      (
        allocation,
      ): allocation is {
        purchase: SupplierPayablePurchase & { remainingAmount: number };
        allocatedAmount: number;
      } => Boolean(allocation && allocation.allocatedAmount > 0),
    );
};

export const calculateDashboardSummaryTotals = ({
  sales,
  purchases,
}: {
  sales: Array<{ grand_total?: NumericLike }>;
  purchases: Array<{ total_amount?: NumericLike; credit_amount?: NumericLike }>;
}) => {
  const totalSales = sales.reduce((sum, sale) => sum + toNonNegativeNumber(sale.grand_total), 0);
  const totalPurchases = purchases.reduce(
    (sum, purchase) => sum + toNonNegativeNumber(purchase.total_amount),
    0,
  );
  const payables = purchases.reduce(
    (sum, purchase) => sum + toNonNegativeNumber(purchase.credit_amount),
    0,
  );

  return {
    totalSales,
    totalPurchases,
    payables,
    netProfit: totalSales - totalPurchases,
  };
};

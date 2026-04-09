export const e2eSeedData = {
  sales: {
    productRate: 1000,
    quantity: 2,
    partialReceipt: 500,
  },
  purchases: {
    firstBillAmount: {
      quantity: 10,
      rate: 1000,
      paidNow: 3000,
    },
    secondBillAmount: {
      quantity: 5,
      rate: 5000,
    },
    supplierLevelPayment: 10000,
  },
  staff: {
    baseSalary: 30000,
    advanceAmount: 10000,
    salaryPayment: 15000,
  },
} as const;

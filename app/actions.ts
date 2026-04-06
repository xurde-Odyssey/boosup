"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bsToAd } from "@/lib/nepali-date";
import { recalculateStaffLedgerSnapshots } from "@/lib/staff-payroll";
import { getSupabaseClient } from "@/lib/supabase/server";

const readText = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const readNumber = (formData: FormData, key: string) => {
  const rawValue = readText(formData, key).replace(/[^\d.-]/g, "");
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : 0;
};

const readWholeNumber = (formData: FormData, key: string) => {
  const value = readNumber(formData, key);
  return Number.isFinite(value) && value > 0 ? Math.max(Math.trunc(value), 1) : 1;
};

const generateNextCode = (
  codes: (string | null | undefined)[],
  prefix: string,
  width = 2,
) => {
  const maxSequence = codes.reduce((maxValue, code) => {
    const normalized = String(code ?? "").trim().toUpperCase();
    if (!normalized.startsWith(prefix)) return maxValue;

    const numericPart = Number(normalized.slice(prefix.length));
    return Number.isFinite(numericPart) ? Math.max(maxValue, numericPart) : maxValue;
  }, 0);

  return `${prefix}${String(maxSequence + 1).padStart(width, "0")}`;
};

const revalidateAll = (...paths: string[]) => {
  paths.forEach((path) => revalidatePath(path));
};

const redirectWithNotice = (
  fallbackPath: string,
  formData: FormData,
  entity: string,
  action: "created" | "updated" | "deleted",
) => {
  const redirectTo = readText(formData, "redirect_to") || fallbackPath;
  const separator = redirectTo.includes("?") ? "&" : "?";
  redirect(`${redirectTo}${separator}notice=${encodeURIComponent(`${entity} ${action}`)}`);
};

const redirectWithMessage = (path: string, message: string) => {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}notice=${encodeURIComponent(message)}`);
};

const resolveGregorianDate = (formData: FormData, adKey: string, bsKey: string) => {
  const adDate = readText(formData, adKey);
  if (adDate) {
    return adDate;
  }

  return bsToAd(readText(formData, bsKey));
};

const resolveStaffSalaryFormPath = (id: string, staffId: string) =>
  id ? `/staff/payment/create?edit=${id}` : `/staff/payment/create${staffId ? `?staff=${staffId}` : ""}`;

const syncStaffSalaryLedgers = async (supabase: Awaited<ReturnType<typeof getSupabaseClient>>, staffId: string) => {
  if (!staffId) return;

  const [ledgersResponse, transactionsResponse] = await Promise.all([
    supabase
      .from("staff_salary_ledgers")
      .select(
        "id, staff_id, month, year, base_salary, working_days, leave_days, total_advance, salary_paid, total_paid, remaining, carry_forward, status, created_at, updated_at",
      )
      .eq("staff_id", staffId),
    supabase
      .from("staff_salary_transactions")
      .select("id, staff_id, ledger_id, transaction_date, type, amount, note, created_at, updated_at")
      .eq("staff_id", staffId),
  ]);
  const ledgers = ledgersResponse.data ?? [];
  const transactions = transactionsResponse.data ?? [];

  const usedLedgerIds = new Set(transactions.map((transaction) => transaction.ledger_id));
  const emptyLedgerIds = ledgers
    .filter((ledger) => !usedLedgerIds.has(ledger.id))
    .map((ledger) => ledger.id);

  if (emptyLedgerIds.length > 0) {
    await supabase.from("staff_salary_ledgers").delete().in("id", emptyLedgerIds);
  }

  const activeLedgers = ledgers.filter((ledger) => usedLedgerIds.has(ledger.id));
  const snapshots = recalculateStaffLedgerSnapshots(activeLedgers, transactions);

  await Promise.all(
    snapshots.ledgers.map((ledger) =>
      supabase
        .from("staff_salary_ledgers")
        .update({
          total_advance: ledger.total_advance,
          salary_paid: ledger.salary_paid,
          total_paid: ledger.total_paid,
          remaining: ledger.remaining,
          carry_forward: ledger.carry_forward,
          status: ledger.status,
        })
        .eq("id", ledger.id),
    ),
  );
};

const upsertStaffSalaryLedger = async ({
  supabase,
  staffId,
  month,
  year,
  baseSalary,
  workingDays,
  leaveDays,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>;
  staffId: string;
  month: number;
  year: number;
  baseSalary: number;
  workingDays: number;
  leaveDays: number;
}) => {
  const { data: existingLedger } = await supabase
    .from("staff_salary_ledgers")
    .select(
      "id, staff_id, month, year, base_salary, working_days, leave_days, total_advance, salary_paid, total_paid, remaining, carry_forward, status, created_at, updated_at",
    )
    .eq("staff_id", staffId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  const payload = {
    staff_id: staffId,
    month,
    year,
    base_salary: baseSalary,
    working_days: workingDays,
    leave_days: Math.min(leaveDays, workingDays),
  };

  if (existingLedger?.id) {
    const { data: updatedLedger } = await supabase
      .from("staff_salary_ledgers")
      .update(payload)
      .eq("id", existingLedger.id)
      .select(
        "id, staff_id, month, year, base_salary, working_days, leave_days, total_advance, salary_paid, total_paid, remaining, carry_forward, status, created_at, updated_at",
      )
      .single();

    return updatedLedger ?? existingLedger;
  }

  const { data: createdLedger } = await supabase
    .from("staff_salary_ledgers")
    .insert({
      ...payload,
      total_advance: 0,
      salary_paid: 0,
      total_paid: 0,
      remaining: baseSalary,
      carry_forward: 0,
      status: "OPEN",
    })
    .select(
      "id, staff_id, month, year, base_salary, working_days, leave_days, total_advance, salary_paid, total_paid, remaining, carry_forward, status, created_at, updated_at",
    )
    .single();

  return createdLedger;
};

export async function logoutAdmin() {
  const supabase = await getSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function upsertProduct(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const actionType = id ? "updated" : "created";
  let productCode = readText(formData, "code");

  if (!productCode) {
    const productsResponse = await supabase.from("products").select("code");
    const existingProducts = productsResponse.data ?? [];
    productCode = generateNextCode(
      existingProducts.map((product) => product.code),
      "DS",
    );
  }

  const payload = {
    code: productCode,
    name: readText(formData, "name"),
    category: readText(formData, "category") || "General",
    sales_rate: readNumber(formData, "sales_rate"),
    unit: readText(formData, "unit") || "Piece",
    status: readText(formData, "status") || "ACTIVE",
    notes: readText(formData, "notes") || null,
  };

  if (id) {
    await supabase.from("products").update(payload).eq("id", id);
  } else {
    await supabase.from("products").insert(payload);
  }

  revalidateAll("/products", "/sales/create", "/purchases");
  redirectWithNotice("/products", formData, "Product", actionType);
}

export async function deleteProduct(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  await supabase.from("products").delete().eq("id", id);
  revalidateAll("/products", "/sales/create", "/purchases");
  redirectWithNotice("/products", formData, "Product", "deleted");
}

export async function upsertVendor(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const actionType = id ? "updated" : "created";

  const payload = {
    vendor_code: readText(formData, "vendor_code"),
    name: readText(formData, "name"),
    contact_person: readText(formData, "contact_person") || null,
    phone: readText(formData, "phone") || null,
    address: readText(formData, "address") || null,
    payment_terms: readText(formData, "payment_terms") || "Cash",
    status: readText(formData, "status") || "ACTIVE",
    notes: readText(formData, "notes") || null,
  };

  if (id) {
    await supabase.from("vendors").update(payload).eq("id", id);
  } else {
    await supabase.from("vendors").insert(payload);
  }

  revalidateAll("/purchases", "/vendors");
  redirectWithNotice("/vendors", formData, "Supplier", actionType);
}

export async function deleteVendor(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  await supabase.from("vendors").delete().eq("id", id);
  revalidateAll("/purchases", "/vendors");
  redirectWithNotice("/vendors", formData, "Supplier", "deleted");
}

export async function upsertCompanySettings(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const successMessage = id
    ? "Company profile updated successfully"
    : "Company profile saved successfully";

  const payload = {
    business_name: readText(formData, "business_name"),
    address: readText(formData, "address") || null,
    phone: readText(formData, "phone") || null,
    email: readText(formData, "email") || null,
    website: readText(formData, "website") || null,
    logo_path: readText(formData, "logo_path") || null,
    favicon_path: readText(formData, "favicon_path") || null,
  };

  if (id) {
    await supabase.from("company_settings").update(payload).eq("id", id);
  } else {
    await supabase.from("company_settings").insert(payload);
  }

  revalidateAll("/settings");
  redirectWithMessage("/settings", successMessage);
}

export async function upsertStaffProfile(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const actionType = id ? "updated" : "created";
  let staffCode = readText(formData, "staff_code");

  if (!staffCode) {
    const staffResponse = await supabase.from("staff_profiles").select("staff_code");
    const existingStaff = staffResponse.data ?? [];
    staffCode = generateNextCode(
      existingStaff.map((staff) => staff.staff_code),
      "DS-S",
      2,
    );
  }

  const payload = {
    staff_code: staffCode,
    name: readText(formData, "name"),
    address: readText(formData, "address") || null,
    phone: readText(formData, "phone") || null,
    total_salary: readNumber(formData, "total_salary"),
    status: readText(formData, "status") || "ACTIVE",
  };

  if (id) {
    await supabase.from("staff_profiles").update(payload).eq("id", id);
  } else {
    await supabase.from("staff_profiles").insert(payload);
  }

  revalidateAll("/staff");
  redirectWithNotice("/staff", formData, "Staff profile", actionType);
}

export async function deleteStaffProfile(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  await supabase.from("staff_profiles").delete().eq("id", id);
  revalidateAll("/staff");
  redirectWithNotice("/staff", formData, "Staff profile", "deleted");
}

export async function upsertStaffSalaryPayment(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const actionType = id ? "updated" : "created";
  const staffId = readText(formData, "staff_id");
  const month = Math.max(Math.min(Math.trunc(readNumber(formData, "month")), 12), 1);
  const year = Math.max(Math.trunc(readNumber(formData, "year")), 2000);
  const paymentDate = resolveGregorianDate(formData, "payment_date", "payment_date_bs");
  const workingDays = readWholeNumber(formData, "working_days");
  const leaveDays = Math.max(Math.trunc(readNumber(formData, "leave_days")), 0);
  const baseSalary = readNumber(formData, "base_salary");
  const amount = readNumber(formData, "amount");
  const paymentType = readText(formData, "payment_type") || "ADVANCE";
  const staffFormPath = resolveStaffSalaryFormPath(id, staffId);
  const existingTransaction = id
    ? await supabase
        .from("staff_salary_transactions")
        .select("id, staff_id, ledger_id")
        .eq("id", id)
        .single()
    : null;

  if (!staffId) {
    redirect(`${staffFormPath}${staffFormPath.includes("?") ? "&" : "?"}notice=Select%20staff%20member`);
  }

  if (!month || !year) {
    redirect(
      `${staffFormPath}${staffFormPath.includes("?") ? "&" : "?"}notice=Month%20and%20year%20are%20required`,
    );
  }

  if (!paymentDate) {
    redirect(
      `${staffFormPath}${staffFormPath.includes("?") ? "&" : "?"}notice=Valid%20payment%20date%20is%20required`,
    );
  }

  if (amount <= 0) {
    redirect(
      `${staffFormPath}${staffFormPath.includes("?") ? "&" : "?"}notice=Payment%20amount%20must%20be%20greater%20than%20zero`,
    );
  }

  const ledger = await upsertStaffSalaryLedger({
    supabase,
    staffId,
    month,
    year,
    baseSalary,
    workingDays,
    leaveDays,
  });

  const payload = {
    staff_id: staffId,
    ledger_id: ledger?.id,
    transaction_date: paymentDate,
    type: paymentType === "SALARY" ? "SALARY" : "ADVANCE",
    amount,
    note: readText(formData, "note") || null,
  };

  if (!payload.ledger_id) {
    redirectWithMessage(staffFormPath, "Failed to create monthly salary ledger");
  }

  if (id) {
    await supabase.from("staff_salary_transactions").update(payload).eq("id", id);
  } else {
    await supabase.from("staff_salary_transactions").insert(payload);
  }

  const previousStaffId = existingTransaction?.data?.staff_id ?? "";
  if (previousStaffId && previousStaffId !== staffId) {
    await syncStaffSalaryLedgers(supabase, previousStaffId);
  }
  await syncStaffSalaryLedgers(supabase, staffId);

  revalidateAll("/staff", "/staff/payment/create", "/");
  redirectWithNotice("/staff", formData, "Staff salary transaction", actionType);
}

export async function deleteStaffSalaryPayment(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const { data: existingTransaction } = await supabase
    .from("staff_salary_transactions")
    .select("staff_id")
    .eq("id", id)
    .maybeSingle();
  await supabase.from("staff_salary_transactions").delete().eq("id", id);
  if (existingTransaction?.staff_id) {
    await syncStaffSalaryLedgers(supabase, existingTransaction.staff_id);
  }
  revalidateAll("/staff", "/staff/payment/create", "/");
  redirectWithNotice("/staff", formData, "Staff salary transaction", "deleted");
}

export async function upsertPurchase(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const actionType = id ? "updated" : "created";
  const purchaseFormPath = id ? `/purchases/create?edit=${id}` : "/purchases/create";
  const quantity = readWholeNumber(formData, "quantity");
  const rate = readNumber(formData, "rate");
  const totalAmount = quantity * rate;
  const vendorId = readText(formData, "vendor_id");
  const vendorName = readText(formData, "vendor_name");
  const requestedPaymentStatus = readText(formData, "payment_status") || "PENDING";
  const paymentMethod = readText(formData, "payment_method") || "Cash";
  const paymentNow = readNumber(formData, "payment_now");
  const purchaseDate = resolveGregorianDate(formData, "purchase_date", "purchase_date_bs");
  const paymentDate = resolveGregorianDate(formData, "payment_date", "payment_date_bs");

  if (!purchaseDate) {
    redirect(
      `${purchaseFormPath}${purchaseFormPath.includes("?") ? "&" : "?"}notice=Valid%20purchase%20date%20is%20required`,
    );
  }

  let previousPaidAmount = 0;
  if (id) {
    const { data: existingPurchase } = await supabase
      .from("purchases")
      .select("paid_amount")
      .eq("id", id)
      .single();
    previousPaidAmount = Number(existingPurchase?.paid_amount ?? 0);
  }

  const normalizedPaymentNow =
    requestedPaymentStatus === "PAID" && !id && paymentNow <= 0
      ? totalAmount
      : Math.max(paymentNow, 0);
  const paidAmount = Math.min(previousPaidAmount + normalizedPaymentNow, totalAmount);
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);
  const paymentStatus =
    remainingAmount <= 0
      ? "PAID"
      : paidAmount > 0
        ? requestedPaymentStatus === "OVERDUE"
          ? "OVERDUE"
          : "PARTIAL"
        : requestedPaymentStatus === "OVERDUE"
          ? "OVERDUE"
          : "PENDING";

  const purchasePayload = {
    purchase_number: readText(formData, "purchase_number"),
    vendor_id: vendorId || null,
    vendor_name: vendorId ? null : vendorName || null,
    purchase_date: purchaseDate,
    payment_status: paymentStatus,
    payment_type: remainingAmount <= 0 ? "Cash" : "Credit",
    payment_method: paymentMethod,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    notes: readText(formData, "notes") || null,
  };

  const itemPayload = {
    product_id: null,
    product_name: readText(formData, "product_name"),
    quantity,
    rate,
  };

  if (!vendorId && !vendorName) {
    redirect("/purchases/create?notice=Select%20or%20type%20a%20supplier");
  }

  if (id) {
    await supabase.from("purchases").update(purchasePayload).eq("id", id);
    await supabase.from("purchase_items").delete().eq("purchase_id", id);
    await supabase.from("purchase_items").insert({
      ...itemPayload,
      purchase_id: id,
    });
    if (normalizedPaymentNow > 0) {
      await supabase.from("purchase_payments").insert({
        purchase_id: id,
        payment_date: paymentDate || purchaseDate,
        amount: normalizedPaymentNow,
        payment_method: paymentMethod,
        notes: readText(formData, "notes") || null,
      });
    }
  } else {
    const { data } = await supabase
      .from("purchases")
      .insert(purchasePayload)
      .select("id")
      .single();

    if (data?.id) {
      await supabase.from("purchase_items").insert({
        ...itemPayload,
        purchase_id: data.id,
      });
      if (normalizedPaymentNow > 0) {
        await supabase.from("purchase_payments").insert({
          purchase_id: data.id,
          payment_date: paymentDate || purchaseDate,
          amount: normalizedPaymentNow,
          payment_method: paymentMethod,
          notes: readText(formData, "notes") || null,
        });
      }
    }
  }

  revalidateAll("/purchases", "/products", "/vendors");
  if (vendorId) {
    revalidatePath(`/vendors/${vendorId}`);
  }
  redirectWithNotice("/purchases", formData, "Purchase", actionType);
}

export async function upsertPurchaseExpense(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const actionType = id ? "updated" : "created";
  const expenseDate = resolveGregorianDate(formData, "expense_date", "expense_date_bs");

  if (!expenseDate) {
    const expenseFormPath = id
      ? `/purchases/expense/create?edit=${id}`
      : "/purchases/expense/create";
    redirect(
      `${expenseFormPath}${expenseFormPath.includes("?") ? "&" : "?"}notice=Valid%20expense%20date%20is%20required`,
    );
  }

  const payload = {
    expense_date: expenseDate,
    expense_title: readText(formData, "expense_title"),
    amount: readNumber(formData, "amount"),
    notes: readText(formData, "notes") || null,
  };

  if (id) {
    await supabase.from("purchase_expenses").update(payload).eq("id", id);
  } else {
    await supabase.from("purchase_expenses").insert(payload);
  }

  revalidateAll("/purchases", "/purchases/expense/create");
  redirectWithNotice("/purchases", formData, "Expense", actionType);
}

export async function deletePurchaseExpense(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  await supabase.from("purchase_expenses").delete().eq("id", id);
  revalidateAll("/purchases");
  redirectWithNotice("/purchases", formData, "Expense", "deleted");
}

export async function deletePurchase(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  await supabase.from("purchases").delete().eq("id", id);
  revalidateAll("/purchases");
  redirectWithNotice("/purchases", formData, "Purchase", "deleted");
}

export async function upsertSale(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const actionType = id ? "updated" : "created";
  const invoiceNumber = readText(formData, "invoice_number");
  const customerName = readText(formData, "customer_name");
  const salesDate = resolveGregorianDate(formData, "sales_date", "sales_date_bs");
  const paymentDate = resolveGregorianDate(formData, "payment_date", "payment_date_bs");
  const productIds = formData.getAll("product_id").map((value) => String(value ?? "").trim());
  const productNames = formData
    .getAll("product_name")
    .map((value) => String(value ?? "").trim());
  const taxableFlags = formData
    .getAll("taxable")
    .map((value) => String(value ?? "").trim() === "true");
  const quantities = formData.getAll("quantity").map((value) => {
    const numericValue = Number(String(value ?? "").trim());
    return Number.isFinite(numericValue) && numericValue > 0
      ? Math.max(Math.trunc(numericValue), 1)
      : 1;
  });
  const rates = formData.getAll("rate").map((value) => {
    const numericValue = Number(String(value ?? "").trim());
    return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
  });

  const salesFormPath = id ? `/sales/create?edit=${id}` : "/sales/create";

  if (!invoiceNumber) {
    redirect(`${salesFormPath}${salesFormPath.includes("?") ? "&" : "?"}notice=Bill%20number%20is%20required`);
  }

  if (!customerName) {
    redirect(`${salesFormPath}${salesFormPath.includes("?") ? "&" : "?"}notice=Customer%20name%20is%20required`);
  }

  if (!salesDate) {
    redirect(`${salesFormPath}${salesFormPath.includes("?") ? "&" : "?"}notice=Valid%20sales%20date%20is%20required`);
  }

  if (!productIds.length || productIds.some((productId) => !productId)) {
    redirect(`${salesFormPath}${salesFormPath.includes("?") ? "&" : "?"}notice=Select%20product%20for%20each%20sales%20item`);
  }

  const saleItems = await Promise.all(
    productNames.map(async (productName, index) => {
      const productId = productIds[index] || null;
      let resolvedProductName = productName;

      if (productId) {
        const { data: product } = await supabase
          .from("products")
          .select("name")
          .eq("id", productId)
          .single();
        resolvedProductName = product?.name ?? resolvedProductName;
      }

      return {
        product_id: productId,
        product_name: resolvedProductName,
        quantity: quantities[index] ?? 1,
        rate: rates[index] ?? 0,
        taxable: taxableFlags[index] ?? false,
      };
    }),
  );
  const normalizedSaleItems = saleItems.filter(
    (item) => item.product_id || item.product_name.trim(),
  );
  if (!normalizedSaleItems.length) {
    redirectWithMessage(salesFormPath, "Add at least one sales item");
  }
  const subtotal = normalizedSaleItems.reduce(
    (sum, item) => sum + item.quantity * item.rate,
    0,
  );
  const discount = readNumber(formData, "discount");
  const tax = readNumber(formData, "tax");
  const requestedPaymentStatus = readText(formData, "payment_status") || "PENDING";
  const grossTotal = Math.max(subtotal - discount + tax, 0);
  const paymentIncrementInput = readNumber(formData, "payment_increment");
  const existingAmountReceived = id
    ? Number(
        (
          await supabase
            .from("sales")
            .select("amount_received")
            .eq("id", id)
            .single()
        ).data?.amount_received ?? 0,
      )
    : 0;
  const remainingBeforePayment = Math.max(grossTotal - existingAmountReceived, 0);
  const maxCollectibleAmount = remainingBeforePayment > 0 ? remainingBeforePayment : 0;

  if (
    paymentIncrementInput > 0 &&
    (requestedPaymentStatus === "PAID" || requestedPaymentStatus === "PARTIAL") &&
    paymentIncrementInput > maxCollectibleAmount
  ) {
    redirectWithMessage(
      salesFormPath,
      maxCollectibleAmount > 0
        ? `Amount received now cannot exceed the remaining amount of ${maxCollectibleAmount.toFixed(2)}`
        : "This invoice is already fully paid",
    );
  }

  const paymentIncrement =
    maxCollectibleAmount <= 0
      ? 0
      : requestedPaymentStatus === "PAID"
      ? Math.min(
          paymentIncrementInput > 0 ? paymentIncrementInput : maxCollectibleAmount,
          maxCollectibleAmount,
        )
      : requestedPaymentStatus === "PARTIAL"
        ? Math.min(paymentIncrementInput, maxCollectibleAmount)
        : 0;
  const amountReceived = Math.max(existingAmountReceived + paymentIncrement, 0);
  const paymentStatus =
    amountReceived >= grossTotal && grossTotal > 0
      ? "PAID"
      : amountReceived > 0
        ? "PARTIAL"
        : requestedPaymentStatus === "OVERDUE"
          ? "OVERDUE"
          : "PENDING";
  const salesPayload = {
    invoice_number: invoiceNumber,
    customer_name: customerName,
    sales_date: salesDate,
    payment_status: paymentStatus,
    subtotal,
    discount,
    tax,
    amount_received: amountReceived,
    notes: readText(formData, "notes") || null,
  };

  if (id) {
    const { error: saleUpdateError } = await supabase.from("sales").update(salesPayload).eq("id", id);
    if (saleUpdateError) {
      redirectWithMessage(salesFormPath, saleUpdateError.message || "Failed to update sale");
    }

    const { error: deleteItemsError } = await supabase.from("sales_items").delete().eq("sale_id", id);
    if (deleteItemsError) {
      redirectWithMessage(salesFormPath, deleteItemsError.message || "Failed to refresh sales items");
    }

    if (normalizedSaleItems.length) {
      const { error: insertItemsError } = await supabase.from("sales_items").insert(
        normalizedSaleItems.map((item) => ({
          ...item,
          sale_id: id,
        })),
      );
      if (insertItemsError) {
        redirectWithMessage(salesFormPath, insertItemsError.message || "Failed to save sales items");
      }
    }
    if (paymentIncrement > 0) {
      const { error: insertPaymentError } = await supabase.from("sales_payments").insert({
        sale_id: id,
        payment_date: paymentDate || salesDate,
        amount: paymentIncrement,
      });
      if (insertPaymentError) {
        redirectWithMessage(salesFormPath, insertPaymentError.message || "Failed to save sales payment");
      }
    }
  } else {
    const { data, error: saleInsertError } = await supabase
      .from("sales")
      .insert(salesPayload)
      .select("id")
      .single();
    if (saleInsertError || !data?.id) {
      redirectWithMessage(
        salesFormPath,
        saleInsertError?.message || "Failed to create sale",
      );
    }

    if (data?.id && normalizedSaleItems.length) {
      const { error: insertItemsError } = await supabase.from("sales_items").insert(
        normalizedSaleItems.map((item) => ({
          ...item,
          sale_id: data.id,
        })),
      );
      if (insertItemsError) {
        redirectWithMessage(salesFormPath, insertItemsError.message || "Failed to save sales items");
      }
    }
    if (data?.id && paymentIncrement > 0) {
      const { error: insertPaymentError } = await supabase.from("sales_payments").insert({
        sale_id: data.id,
        payment_date: paymentDate || salesDate,
        amount: paymentIncrement,
      });
      if (insertPaymentError) {
        redirectWithMessage(salesFormPath, insertPaymentError.message || "Failed to save sales payment");
      }
    }
  }

  revalidateAll("/", "/sales", "/sales/create");
  redirectWithNotice("/sales", formData, "Sale", actionType);
}

export async function deleteSale(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  await supabase.from("sales").delete().eq("id", id);
  revalidateAll("/", "/sales");
  redirectWithNotice("/sales", formData, "Sale", "deleted");
}

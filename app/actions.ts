"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  allocateSupplierPaymentToOldestBills,
  calculatePurchasePaymentState,
  calculateSalesPaymentState,
  calculateSupplierTotalPending,
  getPurchaseOutstandingAmount,
  resolvePurchasePaymentStatus,
} from "@/lib/financial";
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
): never => {
  const redirectTo = readText(formData, "redirect_to") || fallbackPath;
  const separator = redirectTo.includes("?") ? "&" : "?";
  redirect(`${redirectTo}${separator}notice=${encodeURIComponent(`${entity} ${action}`)}`);
};

const redirectWithMessage = (path: string, message: string): never => {
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

const MAX_COMPANY_LOGO_BYTES = 200 * 1024;

const getDataUrlByteSize = (value: string) => {
  const [, encoded = ""] = value.split(",", 2);
  if (!encoded) return 0;

  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  return Math.floor((encoded.length * 3) / 4) - padding;
};

const validateCompanyLogo = (value: string) => {
  if (!value) return { valid: true as const };
  if (!value.startsWith("data:image/")) {
    return { valid: true as const };
  }

  if (getDataUrlByteSize(value) > MAX_COMPANY_LOGO_BYTES) {
    return { valid: false as const, message: "Logo must be 200 KB or smaller" };
  }

  return { valid: true as const };
};

const recordActivity = async (
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  payload: {
    module: string;
    action: string;
    title: string;
    description?: string | null;
    amount?: number | null;
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Record<string, string | number | boolean | null>;
  },
) => {
  const { error } = await supabase.from("activity_logs").insert({
    module: payload.module,
    action: payload.action,
    title: payload.title,
    description: payload.description ?? null,
    amount: payload.amount ?? null,
    entity_type: payload.entityType ?? null,
    entity_id: payload.entityId || null,
    metadata: payload.metadata ?? {},
  });

  if (error) {
    console.warn("Failed to record activity", error.message);
  }
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

  await recordActivity(supabase, {
    module: "products",
    action: actionType,
    title: `Product ${actionType}`,
    description: payload.name,
    amount: payload.sales_rate,
    entityType: "product",
    entityId: id || null,
  });
  revalidateAll("/products", "/sales/create", "/purchases");
  redirectWithNotice("/products", formData, "Product", actionType);
}

export async function deleteProduct(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const { data: product } = await supabase.from("products").select("name").eq("id", id).maybeSingle();
  await supabase.from("products").delete().eq("id", id);
  await recordActivity(supabase, {
    module: "products",
    action: "deleted",
    title: "Product deleted",
    description: product?.name ?? "Product",
    entityType: "product",
    entityId: id,
  });
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

  await recordActivity(supabase, {
    module: "suppliers",
    action: actionType,
    title: `Supplier ${actionType}`,
    description: payload.name,
    entityType: "vendor",
    entityId: id || null,
  });
  revalidateAll("/purchases", "/vendors");
  redirectWithNotice("/vendors", formData, "Supplier", actionType);
}

export async function deleteVendor(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const { data: vendor } = await supabase.from("vendors").select("name").eq("id", id).maybeSingle();
  await supabase.from("vendors").delete().eq("id", id);
  await recordActivity(supabase, {
    module: "suppliers",
    action: "deleted",
    title: "Supplier deleted",
    description: vendor?.name ?? "Supplier",
    entityType: "vendor",
    entityId: id,
  });
  revalidateAll("/purchases", "/vendors");
  redirectWithNotice("/vendors", formData, "Supplier", "deleted");
}

export async function upsertCustomer(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const actionType = id ? "updated" : "created";
  const customerFormPath = id ? `/customers/create?edit=${id}` : "/customers/create";
  const name = readText(formData, "name");

  if (!name) {
    redirectWithMessage(customerFormPath, "Customer name is required");
  }

  const payload = {
    name,
    phone: readText(formData, "phone") || null,
    address: readText(formData, "address") || null,
    email: readText(formData, "email") || null,
    status: readText(formData, "status") || "ACTIVE",
    notes: readText(formData, "notes") || null,
  };

  if (id) {
    const { error } = await supabase.from("customers").update(payload).eq("id", id);
    if (error) {
      redirectWithMessage(customerFormPath, error.message || "Failed to update customer");
    }
  } else {
    const { error } = await supabase.from("customers").insert(payload);
    if (error) {
      redirectWithMessage(customerFormPath, error.message || "Failed to create customer");
    }
  }

  await recordActivity(supabase, {
    module: "customers",
    action: actionType,
    title: `Customer ${actionType}`,
    description: name,
    entityType: "customer",
    entityId: id || null,
  });
  revalidateAll("/customers", "/sales", "/sales/create");
  redirectWithNotice("/customers", formData, "Customer", actionType);
}

export async function deleteCustomer(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");

  if (!id) {
    redirectWithMessage("/customers", "Customer is required");
  }

  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) {
    redirectWithMessage("/customers", error.message || "Failed to delete customer");
  }

  await recordActivity(supabase, {
    module: "customers",
    action: "deleted",
    title: "Customer deleted",
    description: "Customer profile removed",
    entityType: "customer",
    entityId: id,
  });
  revalidateAll("/customers", "/sales", "/sales/create");
  redirectWithNotice("/customers", formData, "Customer", "deleted");
}

export async function createCustomerPayment(formData: FormData) {
  const supabase = await getSupabaseClient();
  const customerId = readText(formData, "customer_id");
  const paymentAmount = readNumber(formData, "amount");
  const paymentMethod = readText(formData, "payment_method") || "Cash";
  const paymentDate = resolveGregorianDate(formData, "payment_date", "payment_date_bs");
  const note = readText(formData, "note");
  const redirectPath = customerId ? `/customers/${customerId}` : "/customers";

  if (!customerId) {
    redirectWithMessage("/customers", "Customer profile is required");
  }

  if (paymentAmount <= 0) {
    redirectWithMessage(redirectPath, "Payment amount must be greater than 0");
  }

  if (!paymentDate) {
    redirectWithMessage(redirectPath, "Valid payment date is required");
  }

  const { data, error } = await supabase.rpc("record_customer_payment_with_allocations", {
    p_customer_id: customerId,
    p_payment_date: paymentDate,
    p_amount: paymentAmount,
    p_payment_method: paymentMethod,
    p_note: note || null,
  });

  if (error) {
    redirectWithMessage(redirectPath, error.message || "Failed to record customer payment");
  }

  const result = Array.isArray(data) ? data[0] : data;
  const allocatedInvoiceCount = Number(result?.allocated_invoice_count ?? 0);
  const customerPaymentId = String(result?.customer_payment_id ?? "");

  await recordActivity(supabase, {
    module: "customers",
    action: "payment",
    title: "Customer payment recorded",
    description: `${allocatedInvoiceCount} invoice${allocatedInvoiceCount === 1 ? "" : "s"} allocated`,
    amount: paymentAmount,
    entityType: "customer_payment",
    entityId: customerPaymentId || null,
    metadata: {
      customer_id: customerId,
      payment_method: paymentMethod,
      payment_date: paymentDate,
    },
  });
  revalidateAll("/", "/sales", "/sales/view", "/customers", redirectPath);
  redirectWithMessage(redirectPath, "Customer payment allocated to oldest unpaid invoices");
}

export async function createSupplierPayment(formData: FormData) {
  const supabase = await getSupabaseClient();
  const vendorId = readText(formData, "vendor_id");
  const paymentAmount = readNumber(formData, "amount");
  const paymentMethod = readText(formData, "payment_method") || "Cash";
  const paymentDate = resolveGregorianDate(formData, "payment_date", "payment_date_bs");
  const note = readText(formData, "note") || null;
  const redirectPath = vendorId ? `/vendors/${vendorId}` : "/vendors";

  if (!vendorId) {
    redirectWithMessage("/vendors", "Supplier is required");
  }

  if (!paymentDate) {
    redirectWithMessage(redirectPath, "Valid payment date is required");
  }

  if (paymentAmount <= 0) {
    redirectWithMessage(redirectPath, "Enter a valid supplier payment amount");
  }

  const { data: unpaidPurchases, error: purchasesError } = await supabase
    .from("purchases")
    .select(
      "id, purchase_number, purchase_date, total_amount, paid_amount, credit_amount, payment_status, payment_method",
    )
    .eq("vendor_id", vendorId)
    .in("payment_status", ["PENDING", "PARTIAL", "OVERDUE"])
    .order("purchase_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (purchasesError) {
    redirectWithMessage(redirectPath, purchasesError.message || "Failed to load supplier bills");
  }

  const payablePurchases = (unpaidPurchases ?? [])
    .map((purchase) => ({
      ...purchase,
      totalAmount: Number(purchase.total_amount ?? 0),
      paidAmount: Number(purchase.paid_amount ?? 0),
      remainingAmount: getPurchaseOutstandingAmount(purchase),
    }))
    .filter((purchase) => purchase.remainingAmount > 0);

  if (payablePurchases.length === 0) {
    redirectWithMessage(redirectPath, "No unpaid purchase bills available for this supplier");
  }

  const totalOutstanding = calculateSupplierTotalPending(payablePurchases);

  if (paymentAmount > totalOutstanding) {
    redirectWithMessage(redirectPath, "Payment exceeds this supplier's total payable balance.");
  }

  const allocations = allocateSupplierPaymentToOldestBills(payablePurchases, paymentAmount);

  if (allocations.length === 0) {
    redirectWithMessage(redirectPath, "Unable to allocate this payment to supplier bills");
  }

  const { data: supplierPayment, error: supplierPaymentError } = await supabase
    .from("supplier_payments")
    .insert({
      vendor_id: vendorId,
      payment_date: paymentDate,
      amount: paymentAmount,
      payment_method: paymentMethod,
      note,
    })
    .select("id")
    .single();

  const supplierPaymentId = supplierPayment?.id;

  if (supplierPaymentError || !supplierPaymentId) {
    redirectWithMessage(
      redirectPath,
      supplierPaymentError?.message || "Failed to save supplier payment",
    );
  }

  const { error: allocationInsertError } = await supabase
    .from("supplier_payment_allocations")
    .insert(
      allocations.map((allocation) => ({
        supplier_payment_id: supplierPaymentId,
        purchase_id: allocation.purchase.id,
        amount: allocation.allocatedAmount,
      })),
    );

  if (allocationInsertError) {
    redirectWithMessage(
      redirectPath,
      allocationInsertError.message || "Failed to save supplier payment allocations",
    );
  }

  for (const allocation of allocations) {
    const purchaseTotalAmount = Number(allocation.purchase.total_amount ?? 0);
    const purchasePaidAmount = Number(allocation.purchase.paid_amount ?? 0);
    const nextPaidAmount = Math.min(
      purchasePaidAmount + allocation.allocatedAmount,
      purchaseTotalAmount,
    );
    const nextStatus = resolvePurchasePaymentStatus({
      totalAmount: purchaseTotalAmount,
      paidAmount: nextPaidAmount,
      previousStatus: allocation.purchase.payment_status,
    });

    const { error: purchaseUpdateError } = await supabase
      .from("purchases")
      .update({
        paid_amount: nextPaidAmount,
        payment_status: nextStatus,
        payment_type: nextStatus === "PAID" ? "Cash" : "Credit",
        payment_method: paymentMethod,
      })
      .eq("id", allocation.purchase.id);

    if (purchaseUpdateError) {
      redirectWithMessage(
        redirectPath,
        purchaseUpdateError.message || "Failed to update supplier bill balance",
      );
    }

    const paymentNote = note ? `${note} (supplier payment allocation)` : "Supplier payment allocation";
    const { error: purchasePaymentError } = await supabase.from("purchase_payments").insert({
      purchase_id: allocation.purchase.id,
      payment_date: paymentDate,
      amount: allocation.allocatedAmount,
      payment_method: paymentMethod,
      notes: paymentNote,
    });

    if (purchasePaymentError) {
      redirectWithMessage(
        redirectPath,
        purchasePaymentError.message || "Failed to record allocated purchase payment",
      );
    }
  }

  await recordActivity(supabase, {
    module: "suppliers",
    action: "payment",
    title: "Supplier payment recorded",
    description: `${allocations.length} bill${allocations.length === 1 ? "" : "s"} allocated`,
    amount: paymentAmount,
    entityType: "vendor",
    entityId: vendorId,
    metadata: {
      payment_method: paymentMethod,
      payment_date: paymentDate,
    },
  });
  revalidateAll("/purchases", "/vendors", redirectPath);
  redirectWithNotice(redirectPath, formData, "Supplier payment", "created");
}

export async function upsertCompanySettings(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const redirectTo = readText(formData, "redirect_to") || "/settings";
  const logoPath = readText(formData, "logo_path");
  const successMessage = id
    ? "Company profile updated successfully"
    : "Company profile saved successfully";
  const logoValidation = validateCompanyLogo(logoPath);

  if (!logoValidation.valid) {
    redirectWithMessage(redirectTo, logoValidation.message);
  }

  const payload = {
    business_name: readText(formData, "business_name"),
    address: readText(formData, "address") || null,
    phone: readText(formData, "phone") || null,
    email: readText(formData, "email") || null,
    website: readText(formData, "website") || null,
    logo_path: logoPath || null,
  };

  if (id) {
    await supabase.from("company_settings").update(payload).eq("id", id);
  } else {
    await supabase.from("company_settings").insert(payload);
  }

  revalidateAll("/settings", "/", "/sales", "/vendors", "/customers");
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

  await recordActivity(supabase, {
    module: "staff",
    action: actionType,
    title: `Staff profile ${actionType}`,
    description: payload.name,
    amount: payload.total_salary,
    entityType: "staff_profile",
    entityId: id || null,
  });
  revalidateAll("/staff");
  redirectWithNotice("/staff", formData, "Staff profile", actionType);
}

export async function deleteStaffProfile(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const { data: staff } = await supabase.from("staff_profiles").select("name").eq("id", id).maybeSingle();
  await supabase.from("staff_profiles").delete().eq("id", id);
  await recordActivity(supabase, {
    module: "staff",
    action: "deleted",
    title: "Staff profile deleted",
    description: staff?.name ?? "Staff profile",
    entityType: "staff_profile",
    entityId: id,
  });
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

  await recordActivity(supabase, {
    module: "staff",
    action: actionType,
    title: `Staff salary transaction ${actionType}`,
    description: payload.type,
    amount,
    entityType: "staff_salary_transaction",
    entityId: id || null,
    metadata: {
      staff_id: staffId,
      month,
      year,
    },
  });
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
  await recordActivity(supabase, {
    module: "staff",
    action: "deleted",
    title: "Staff salary transaction deleted",
    description: "Salary ledger recalculated",
    entityType: "staff_salary_transaction",
    entityId: id,
  });
  revalidateAll("/staff", "/staff/payment/create", "/");
  redirectWithNotice("/staff", formData, "Staff salary transaction", "deleted");
}

export async function upsertPurchase(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const actionType = id ? "updated" : "created";
  const purchaseFormPath = id ? `/purchases/create?edit=${id}` : "/purchases/create";
  const vendorId = readText(formData, "vendor_id");
  const vendorName = readText(formData, "vendor_name");
  const requestedPaymentStatus = readText(formData, "payment_status") || "PENDING";
  const paymentMethod = readText(formData, "payment_method") || "Cash";
  const paymentNow = readNumber(formData, "payment_now");
  const purchaseDate = resolveGregorianDate(formData, "purchase_date", "purchase_date_bs");
  const paymentDate = resolveGregorianDate(formData, "payment_date", "payment_date_bs");
  const productNames = formData
    .getAll("product_name")
    .map((value) => String(value ?? "").trim());
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
  const purchaseItems = productNames
    .map((productName, index) => ({
      product_id: null,
      product_name: productName,
      quantity: quantities[index] ?? 1,
      rate: rates[index] ?? 0,
    }))
    .filter((item) => item.product_name || item.quantity > 0 || item.rate > 0);
  const normalizedPurchaseItems = purchaseItems.filter((item) => item.product_name.trim());
  const totalAmount = normalizedPurchaseItems.reduce(
    (sum, item) => sum + item.quantity * item.rate,
    0,
  );

  if (!purchaseDate) {
    redirect(
      `${purchaseFormPath}${purchaseFormPath.includes("?") ? "&" : "?"}notice=Valid%20purchase%20date%20is%20required`,
    );
  }

  if (!normalizedPurchaseItems.length) {
    redirectWithMessage(purchaseFormPath, "Add at least one purchase item.");
  }

  if (totalAmount <= 0) {
    redirectWithMessage(purchaseFormPath, "Purchase amount must be greater than 0.");
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

  const currentPayableAmount = Math.max(totalAmount - previousPaidAmount, 0);

  if (paymentNow > currentPayableAmount) {
    redirectWithMessage(purchaseFormPath, "Payment exceeds this bill's payable amount.");
  }

  const {
    normalizedPaymentNow,
    paidAmount,
    paymentStatus,
    paymentType,
  } = calculatePurchasePaymentState({
    totalAmount,
    previousPaidAmount,
    paymentNow,
    requestedPaymentStatus,
    isNewRecord: !id,
  });

  const purchasePayload = {
    purchase_number: readText(formData, "purchase_number"),
    vendor_id: vendorId || null,
    vendor_name: vendorId ? null : vendorName || null,
    purchase_date: purchaseDate,
    payment_status: paymentStatus,
    payment_type: paymentType,
    payment_method: paymentMethod,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    notes: readText(formData, "notes") || null,
  };

  if (!vendorId && !vendorName) {
    redirect("/purchases/create?notice=Select%20or%20type%20a%20supplier");
  }

  let savedPurchaseId = id;
  if (id) {
    await supabase.from("purchases").update(purchasePayload).eq("id", id);
    await supabase.from("purchase_items").delete().eq("purchase_id", id);
    await supabase.from("purchase_items").insert(
      normalizedPurchaseItems.map((item) => ({
        ...item,
        purchase_id: id,
      })),
    );
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
      savedPurchaseId = data.id;
      await supabase.from("purchase_items").insert(
        normalizedPurchaseItems.map((item) => ({
          ...item,
          purchase_id: data.id,
        })),
      );
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

  await recordActivity(supabase, {
    module: "purchases",
    action: actionType,
    title: `Purchase ${actionType}`,
    description: purchasePayload.purchase_number,
    amount: totalAmount,
    entityType: "purchase",
    entityId: savedPurchaseId || null,
    metadata: {
      payment_status: paymentStatus,
      paid_amount: paidAmount,
    },
  });
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

  await recordActivity(supabase, {
    module: "expenses",
    action: actionType,
    title: `Expense ${actionType}`,
    description: payload.expense_title,
    amount: payload.amount,
    entityType: "purchase_expense",
    entityId: id || null,
  });
  revalidateAll("/purchases", "/purchases/expense/create");
  redirectWithNotice("/purchases", formData, "Expense", actionType);
}

export async function deletePurchaseExpense(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const { data: expense } = await supabase
    .from("purchase_expenses")
    .select("expense_title, amount")
    .eq("id", id)
    .maybeSingle();
  await supabase.from("purchase_expenses").delete().eq("id", id);
  await recordActivity(supabase, {
    module: "expenses",
    action: "deleted",
    title: "Expense deleted",
    description: expense?.expense_title ?? "Purchase expense",
    amount: Number(expense?.amount ?? 0),
    entityType: "purchase_expense",
    entityId: id,
  });
  revalidateAll("/purchases");
  redirectWithNotice("/purchases", formData, "Expense", "deleted");
}

export async function deletePurchase(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const { data: purchase } = await supabase
    .from("purchases")
    .select("purchase_number, total_amount")
    .eq("id", id)
    .maybeSingle();
  await supabase.from("purchases").delete().eq("id", id);
  await recordActivity(supabase, {
    module: "purchases",
    action: "deleted",
    title: "Purchase deleted",
    description: purchase?.purchase_number ?? "Purchase",
    amount: Number(purchase?.total_amount ?? 0),
    entityType: "purchase",
    entityId: id,
  });
  revalidateAll("/purchases");
  redirectWithNotice("/purchases", formData, "Purchase", "deleted");
}

export async function upsertSale(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const actionType = id ? "updated" : "created";
  const invoiceNumber = readText(formData, "invoice_number");
  const customerId = readText(formData, "customer_id");
  let customerName = readText(formData, "customer_name");
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

  if (/^SA-\d{4}\/\d{2}\/\d{2}-$/.test(invoiceNumber)) {
    redirect(`${salesFormPath}${salesFormPath.includes("?") ? "&" : "?"}notice=Bill%20number%20is%20required`);
  }

  if (customerId) {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("name")
      .eq("id", customerId)
      .single();
    const linkedCustomerName = customer?.name;

    if (customerError || !linkedCustomerName) {
      redirectWithMessage(salesFormPath, "Selected customer profile was not found");
    }

    customerName = linkedCustomerName;
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
  const previousCustomerId = id
    ? String(
        (
          await supabase
            .from("sales")
            .select("customer_id")
            .eq("id", id)
            .single()
        ).data?.customer_id ?? "",
      )
    : "";
  const { maxCollectibleAmount, paymentIncrement, amountReceived, paymentStatus } =
    calculateSalesPaymentState({
      grossTotal,
      existingAmountReceived,
      requestedPaymentStatus,
      paymentIncrementInput,
    });

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

  const salesPayload = {
    invoice_number: invoiceNumber,
    customer_name: customerName,
    customer_id: customerId || null,
    sales_date: salesDate,
    payment_status: paymentStatus,
    subtotal,
    discount,
    tax,
    amount_received: amountReceived,
    notes: readText(formData, "notes") || null,
  };

  let savedSaleId = id;
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
      savedSaleId = data.id;
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

  await recordActivity(supabase, {
    module: "sales",
    action: actionType,
    title: `Sale ${actionType}`,
    description: `${invoiceNumber} - ${customerName}`,
    amount: grossTotal,
    entityType: "sale",
    entityId: savedSaleId || null,
    metadata: {
      payment_status: paymentStatus,
      amount_received: amountReceived,
    },
  });
  revalidateAll("/", "/sales", "/sales/create", "/customers");
  if (customerId) {
    revalidatePath(`/customers/${customerId}`);
  }
  if (previousCustomerId && previousCustomerId !== customerId) {
    revalidatePath(`/customers/${previousCustomerId}`);
  }
  redirectWithNotice("/sales", formData, "Sale", actionType);
}

export async function deleteSale(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const { data: sale } = await supabase
    .from("sales")
    .select("customer_id, invoice_number, grand_total")
    .eq("id", id)
    .single();

  await supabase.from("sales").delete().eq("id", id);
  await recordActivity(supabase, {
    module: "sales",
    action: "deleted",
    title: "Sale deleted",
    description: sale?.invoice_number ?? "Sale",
    amount: Number(sale?.grand_total ?? 0),
    entityType: "sale",
    entityId: id,
  });
  revalidateAll("/", "/sales", "/customers");
  if (sale?.customer_id) {
    revalidatePath(`/customers/${sale.customer_id}`);
  }
  redirectWithNotice("/sales", formData, "Sale", "deleted");
}

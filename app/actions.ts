"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  calculatePurchasePaymentState,
  calculateSalesPaymentState,
} from "@/lib/financial";
import { bsToAd } from "@/lib/nepali-date";
import { calculateSaleTotals } from "@/lib/sales";
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

const readWholeNumberFromValue = (value: FormDataEntryValue | null | undefined) => {
  const numericValue = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(numericValue) && numericValue > 0
    ? Math.max(Math.trunc(numericValue), 1)
    : 1;
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

const requireActionReason = (formData: FormData, path: string, actionLabel: string) => {
  const reason = readText(formData, "change_reason");
  if (reason.length < 5) {
    redirectWithMessage(path, `${actionLabel} reason is required`);
  }

  return reason;
};

const resolveGregorianDate = (formData: FormData, adKey: string, bsKey: string) => {
  const adDate = readText(formData, adKey);
  if (adDate) {
    return adDate;
  }

  return bsToAd(readText(formData, bsKey));
};

const getTodayDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
  }).format(new Date());

const normalizePhone = (value: string | null | undefined) => String(value ?? "").replace(/\D/g, "");

const concatWs = (separator: string, parts: Array<string | null | undefined>) =>
  parts.map((part) => String(part ?? "").trim()).filter(Boolean).join(separator);

const resolveSalesStatus = ({
  grandTotal,
  amountReceived,
  dueDate,
  todayDate,
}: {
  grandTotal: number;
  amountReceived: number;
  dueDate: string | null | undefined;
  todayDate: string;
}) => {
  const normalizedGrandTotal = Math.max(Number(grandTotal ?? 0), 0);
  const normalizedAmountReceived = Math.max(Number(amountReceived ?? 0), 0);
  const normalizedDueDate = String(dueDate ?? "").trim();

  if (normalizedGrandTotal > 0 && normalizedAmountReceived >= normalizedGrandTotal) {
    return "PAID";
  }

  if (normalizedAmountReceived > 0) {
    return "PARTIAL";
  }

  if (normalizedDueDate && normalizedDueDate < todayDate) {
    return "OVERDUE";
  }

  return "PENDING";
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
    reason?: string | null;
    metadata?: Record<string, unknown>;
  },
) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("activity_logs").insert({
    module: payload.module,
    action: payload.action,
    title: payload.title,
    description: payload.description ?? null,
    amount: payload.amount ?? null,
    entity_type: payload.entityType ?? null,
    entity_id: payload.entityId || null,
    actor_user_id: user?.id ?? null,
    actor_email: user?.email ?? null,
    reason: payload.reason ?? null,
    metadata: payload.metadata ?? {},
  });

  if (error) {
    console.warn("Failed to record activity", error.message);
  }
};

const resolveStaffSalaryFormPath = (id: string, staffId: string) =>
  id ? `/staff/payment/create?edit=${id}` : `/staff/payment/create${staffId ? `?staff=${staffId}` : ""}`;

const SETTLED_SALE_LOCK_MESSAGE =
  "This sales record is fully settled. Use an adjustment, reversal, or cancellation with reason instead of editing it directly.";

const SETTLED_PURCHASE_LOCK_MESSAGE =
  "This purchase record is fully settled. Use an adjustment, reversal, or cancellation with reason instead of editing it directly.";

const CLOSED_SALARY_LEDGER_LOCK_MESSAGE =
  "This salary period is already closed. Use an adjustment or reversal with reason instead of editing it directly.";

export async function archiveSaleAndRecreate(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const redirectTo = readText(formData, "redirect_to") || "/sales";
  const changeReason = requireActionReason(formData, redirectTo, "Archive");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: sale } = await supabase
    .from("sales")
    .select(
      "id, customer_id, invoice_number, customer_name, grand_total, payment_status, record_status",
    )
    .eq("id", id)
    .maybeSingle();

  if (!sale) {
    redirectWithMessage(redirectTo, "Sales record was not found");
  }

  const existingSale = sale!;

  if (existingSale.record_status !== "ACTIVE") {
    redirectWithMessage(redirectTo, "Only active sales records can be archived");
  }

  if (existingSale.payment_status !== "PAID") {
    redirectWithMessage(
      redirectTo,
      "Only settled sales records can use Archive & Recreate",
    );
  }

  const { error } = await supabase
    .from("sales")
    .update({
      record_status: "ARCHIVED",
      archived_at: new Date().toISOString(),
      archived_by: user?.id ?? null,
      archive_reason: changeReason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingSale.id);

  if (error) {
    redirectWithMessage(redirectTo, error.message || "Failed to archive sales record");
  }

  await recordActivity(supabase, {
    module: "sales",
    action: "sale_archived",
    title: "Sale archived",
    description: existingSale.invoice_number,
    amount: Number(existingSale.grand_total ?? 0),
    entityType: "sale",
    entityId: existingSale.id,
    reason: changeReason,
    metadata: {
      customer_id: existingSale.customer_id,
      customer_name: existingSale.customer_name,
      record_status: "ARCHIVED",
    },
  });

  revalidateAll("/", "/dashboard", "/sales", "/sales/view", "/sales/archived", "/customers");
  if (existingSale.customer_id) {
    revalidatePath(`/customers/${existingSale.customer_id}`);
  }
  redirect(`/sales/create?fromArchived=${existingSale.id}`);
}

export async function archiveSale(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const redirectTo = readText(formData, "redirect_to") || "/sales";
  const changeReason = requireActionReason(formData, redirectTo, "Archive");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: sale } = await supabase
    .from("sales")
    .select(
      "id, customer_id, invoice_number, customer_name, grand_total, payment_status, record_status",
    )
    .eq("id", id)
    .maybeSingle();

  if (!sale) {
    redirectWithMessage(redirectTo, "Sales record was not found");
  }

  const existingSale = sale!;

  if (existingSale.record_status !== "ACTIVE") {
    redirectWithMessage(redirectTo, "Only active sales records can be archived");
  }

  if (existingSale.payment_status !== "PAID") {
    redirectWithMessage(redirectTo, "Only settled sales records can be archived");
  }

  const { error } = await supabase
    .from("sales")
    .update({
      record_status: "ARCHIVED",
      archived_at: new Date().toISOString(),
      archived_by: user?.id ?? null,
      archive_reason: changeReason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingSale.id);

  if (error) {
    redirectWithMessage(redirectTo, error.message || "Failed to archive sales record");
  }

  await recordActivity(supabase, {
    module: "sales",
    action: "sale_archived",
    title: "Sale archived",
    description: existingSale.invoice_number,
    amount: Number(existingSale.grand_total ?? 0),
    entityType: "sale",
    entityId: existingSale.id,
    reason: changeReason,
    metadata: {
      customer_id: existingSale.customer_id,
      customer_name: existingSale.customer_name,
      record_status: "ARCHIVED",
    },
  });

  revalidateAll("/", "/dashboard", "/sales", "/sales/view", "/sales/archived", "/customers");
  if (existingSale.customer_id) {
    revalidatePath(`/customers/${existingSale.customer_id}`);
  }
  redirectWithNotice("/sales", formData, "Sale", "updated");
}

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

export async function upsertOrder(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const actionType = id ? "updated" : "created";
  const orderFormPath = id ? `/orders/create?edit=${id}` : "/orders/create";
  const customerName = readText(formData, "customer_name");
  const orderDate = readText(formData, "order_date") || getTodayDate();
  const productIds = formData.getAll("product_id").map((value) => String(value ?? "").trim());
  const productNames = formData
    .getAll("product_name")
    .map((value) => String(value ?? "").trim());
  const quantities = formData.getAll("quantity").map((value) => readWholeNumberFromValue(value));
  const unitSnapshots = formData
    .getAll("unit_snapshot")
    .map((value) => String(value ?? "").trim() || null);
  const rateSnapshots = formData.getAll("rate_snapshot").map((value) => {
    const numericValue = Number(String(value ?? "").trim());
    return Number.isFinite(numericValue) ? numericValue : null;
  });
  const orderItems = productNames
    .map((productName, index) => ({
      product_id: productIds[index] || null,
      product_name: productName,
      quantity: quantities[index] ?? 1,
      unit_snapshot: unitSnapshots[index] ?? null,
      rate_snapshot: rateSnapshots[index] ?? null,
    }))
    .filter((item) => item.product_name);
  const itemsSummary = orderItems
    .map((item) => `${item.quantity}${item.unit_snapshot ? ` ${item.unit_snapshot}` : ""} x ${item.product_name}`)
    .join("\n");

  if (!customerName) {
    redirectWithMessage(orderFormPath, "Customer name is required");
  }

  if (orderItems.length === 0) {
    redirectWithMessage(orderFormPath, "Order items are required");
  }

  if (!orderDate) {
    redirectWithMessage(orderFormPath, "Valid order date is required");
  }

  const payload = {
    customer_name: customerName,
    customer_phone: readText(formData, "customer_phone") || null,
    items_summary: itemsSummary,
    order_date: orderDate,
    status: readText(formData, "status") || "NEW",
    notes: readText(formData, "notes") || null,
  };

  let savedOrderId = id;

  if (id) {
    const { error } = await supabase.from("orders").update(payload).eq("id", id);
    if (error) {
      redirectWithMessage(orderFormPath, error.message || "Failed to update order");
    }
  } else {
    const { data, error } = await supabase
      .from("orders")
      .insert(payload)
      .select("id")
      .single();
    if (error) {
      redirectWithMessage(orderFormPath, error.message || "Failed to create order");
    }
    savedOrderId = data?.id ?? "";
  }

  if (!savedOrderId) {
    redirectWithMessage(orderFormPath, "Failed to save order");
  }

  const { error: deleteItemsError } = await supabase
    .from("order_items")
    .delete()
    .eq("order_id", savedOrderId);
  if (deleteItemsError) {
    redirectWithMessage(orderFormPath, deleteItemsError.message || "Failed to update order items");
  }

  const { error: insertItemsError } = await supabase.from("order_items").insert(
    orderItems.map((item) => ({
      order_id: savedOrderId,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_snapshot: item.unit_snapshot,
      rate_snapshot: item.rate_snapshot,
    })),
  );
  if (insertItemsError) {
    redirectWithMessage(orderFormPath, insertItemsError.message || "Failed to save order items");
  }

  await recordActivity(supabase, {
    module: "orders",
    action: actionType,
    title: `Order ${actionType}`,
    description: `${customerName} - ${payload.status}`,
    entityType: "order",
    entityId: savedOrderId || null,
    metadata: {
      order_date: payload.order_date,
      status: payload.status,
      customer_phone: payload.customer_phone,
      item_count: orderItems.length,
    },
  });

  revalidateAll("/orders", "/orders/create", "/dashboard", "/activity");
  redirectWithNotice("/orders", formData, "Order", actionType);
}

export async function deleteOrder(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const fallbackName = readText(formData, "customer_name");

  if (!id) {
    redirectWithMessage("/orders", "Order is required");
  }

  const { data: order } = await supabase
    .from("orders")
    .select("customer_name, status")
    .eq("id", id)
    .maybeSingle();
  const customerName = String(order?.customer_name ?? fallbackName).trim();

  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) {
    redirectWithMessage("/orders", error.message || "Failed to delete order");
  }

  await recordActivity(supabase, {
    module: "orders",
    action: "deleted",
    title: "Order deleted",
    description: customerName ? `${customerName} order removed` : "Order removed",
    entityType: "order",
    entityId: id,
    metadata: {
      status: order?.status ?? null,
    },
  });

  revalidateAll("/orders", "/orders/create", "/dashboard", "/activity");
  redirectWithNotice("/orders", formData, "Order", "deleted");
}

export async function deleteCustomer(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const fallbackName = readText(formData, "customer_name");

  if (!id) {
    redirectWithMessage("/customers", "Customer is required");
  }

  const { data: customer } = await supabase.from("customers").select("name").eq("id", id).maybeSingle();
  const customerName = String(customer?.name ?? fallbackName).trim();

  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) {
    redirectWithMessage("/customers", error.message || "Failed to delete customer");
  }

  await recordActivity(supabase, {
    module: "customers",
    action: "deleted",
    title: "Customer deleted",
    description: customerName ? `${customerName} profile removed` : "Customer profile removed",
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
  redirectWithMessage(
    redirectPath,
    "Payment recorded and applied to the oldest unpaid invoices first",
  );
}

export async function recordManualSalesLedgerPayment(formData: FormData) {
  const supabase = await getSupabaseClient();
  const saleId = readText(formData, "sale_id");
  const customerName = readText(formData, "customer_name");
  const customerPhone = normalizePhone(readText(formData, "customer_phone"));
  const paymentAmount = readNumber(formData, "amount");
  const paymentMethod = readText(formData, "payment_method") || "Cash";
  const paymentDate = resolveGregorianDate(formData, "payment_date", "payment_date_bs");
  const note = readText(formData, "note");
  const redirectPath =
    readText(formData, "redirect_to") || `/sales/customer/${encodeURIComponent(customerName)}`;
  const todayDate = getTodayDate();

  if (paymentAmount <= 0) {
    redirectWithMessage(redirectPath, "Payment amount must be greater than 0");
  }

  if (!paymentDate) {
    redirectWithMessage(redirectPath, "Valid payment date is required");
  }

  if (saleId) {
    const { data: sale } = await supabase
      .from("sales")
      .select(
        "id, invoice_number, customer_id, customer_name, customer_phone, grand_total, amount_received, remaining_amount, due_date, record_status",
      )
      .eq("id", saleId)
      .maybeSingle();

    if (!sale) {
      redirectWithMessage(redirectPath, "Sales invoice was not found");
    }

    const saleRecord = sale!;

    if (saleRecord.record_status !== "ACTIVE") {
      redirectWithMessage(redirectPath, "Only active sales invoices can receive payment");
    }

    if (saleRecord.customer_id) {
      redirectWithMessage(redirectPath, "Saved customer invoices must use the customer payment flow");
    }

    if (saleRecord.customer_name !== customerName) {
      redirectWithMessage(redirectPath, "Invoice does not belong to this ledger");
    }

    const remainingAmount = Number(saleRecord.remaining_amount ?? 0);
    if (remainingAmount <= 0) {
      redirectWithMessage(redirectPath, "This invoice is already fully paid");
    }

    if (paymentAmount > remainingAmount) {
      redirectWithMessage(
        redirectPath,
        `Payment exceeds invoice remaining amount of ${remainingAmount.toFixed(2)}`,
      );
    }

    const nextAmountReceived = Math.min(
      Number(saleRecord.grand_total ?? 0),
      Number(saleRecord.amount_received ?? 0) + paymentAmount,
    );
    const nextStatus = resolveSalesStatus({
      grandTotal: Number(saleRecord.grand_total ?? 0),
      amountReceived: nextAmountReceived,
      dueDate: saleRecord.due_date,
      todayDate,
    });

    const paymentNote = concatWs(" | ", [
      note || null,
      "Manual ledger invoice payment",
      `Method: ${paymentMethod}`,
    ]);

    const { error: updateError } = await supabase
      .from("sales")
      .update({
        amount_received: nextAmountReceived,
        payment_status: nextStatus,
      })
      .eq("id", saleRecord.id);

    if (updateError) {
      redirectWithMessage(redirectPath, updateError.message || "Failed to update invoice");
    }

    const { error: paymentError } = await supabase.from("sales_payments").insert({
      sale_id: saleRecord.id,
      payment_date: paymentDate,
      amount: paymentAmount,
      notes: paymentNote,
    });

    if (paymentError) {
      redirectWithMessage(redirectPath, paymentError.message || "Failed to record invoice payment");
    }

    await recordActivity(supabase, {
      module: "sales",
      action: "payment",
      title: "Manual invoice payment recorded",
      description: saleRecord.invoice_number,
      amount: paymentAmount,
      entityType: "sale",
      entityId: saleRecord.id,
      metadata: {
        payment_method: paymentMethod,
        payment_date: paymentDate,
        ledger_type: "manual_customer",
      },
    });

    revalidateAll("/sales", "/sales/view", redirectPath);
    redirectWithMessage(redirectPath, `Payment recorded for invoice ${saleRecord.invoice_number}`);
  }

  if (!customerName) {
    redirectWithMessage(redirectPath, "Customer name is required");
  }

  if (!customerPhone || customerPhone.length !== 10) {
    redirectWithMessage(
      redirectPath,
      "Grouped payment is allowed only when this ledger has one valid 10-digit phone number",
    );
  }

  const { data: unpaidSales = [] } = await supabase
    .from("sales")
    .select(
      "id, invoice_number, customer_id, customer_name, customer_phone, sales_date, due_date, grand_total, amount_received, remaining_amount, record_status, created_at",
    )
    .eq("record_status", "ACTIVE")
    .is("customer_id", null)
    .eq("customer_name", customerName)
    .gt("remaining_amount", 0)
    .order("sales_date", { ascending: true })
    .order("created_at", { ascending: true });

  const safeSales = (unpaidSales ?? []).filter(
    (sale) => normalizePhone(sale.customer_phone) === customerPhone,
  );

  if (!safeSales.length) {
    redirectWithMessage(redirectPath, "No unpaid invoices with a safe shared phone were found");
  }

  if (safeSales.length !== (unpaidSales ?? []).length) {
    redirectWithMessage(
      redirectPath,
      "Grouped payment is blocked because this ledger has mixed or missing phone numbers on unpaid invoices",
    );
  }

  const totalDue = safeSales.reduce((sum, sale) => sum + Number(sale.remaining_amount ?? 0), 0);
  if (paymentAmount > totalDue) {
    redirectWithMessage(redirectPath, "Payment exceeds this ledger's safe pending balance");
  }

  let remainingPayment = paymentAmount;
  let allocatedCount = 0;
  const paymentNote = concatWs(" | ", [
    note || null,
    "Manual ledger grouped payment",
    `Method: ${paymentMethod}`,
  ]);

  for (const sale of safeSales) {
    if (remainingPayment <= 0) break;

    const remainingAmount = Number(sale.remaining_amount ?? 0);
    if (remainingAmount <= 0) continue;

    const allocatedAmount = Math.min(remainingPayment, remainingAmount);
    const nextAmountReceived = Math.min(
      Number(sale.grand_total ?? 0),
      Number(sale.amount_received ?? 0) + allocatedAmount,
    );
    const nextStatus = resolveSalesStatus({
      grandTotal: Number(sale.grand_total ?? 0),
      amountReceived: nextAmountReceived,
      dueDate: sale.due_date,
      todayDate,
    });

    const { error: updateError } = await supabase
      .from("sales")
      .update({
        amount_received: nextAmountReceived,
        payment_status: nextStatus,
      })
      .eq("id", sale.id);

    if (updateError) {
      redirectWithMessage(redirectPath, updateError.message || "Failed to update ledger invoice");
    }

    const { error: paymentError } = await supabase.from("sales_payments").insert({
      sale_id: sale.id,
      payment_date: paymentDate,
      amount: allocatedAmount,
      notes: paymentNote,
    });

    if (paymentError) {
      redirectWithMessage(redirectPath, paymentError.message || "Failed to record grouped payment");
    }

    remainingPayment -= allocatedAmount;
    allocatedCount += 1;
  }

  if (remainingPayment > 0) {
    redirectWithMessage(redirectPath, "Unable to allocate the full payment to safe ledger invoices");
  }

  await recordActivity(supabase, {
    module: "sales",
    action: "payment",
    title: "Manual grouped payment recorded",
    description: `${allocatedCount} invoice${allocatedCount === 1 ? "" : "s"} allocated`,
    amount: paymentAmount,
    entityType: "sale",
    entityId: null,
    metadata: {
      customer_name: customerName,
      customer_phone: customerPhone,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      allocated_invoice_count: allocatedCount,
      ledger_type: "manual_customer",
    },
  });

  revalidateAll("/sales", "/sales/view", redirectPath);
  redirectWithMessage(
    redirectPath,
    `Grouped payment allocated to ${allocatedCount} invoice${allocatedCount === 1 ? "" : "s"}`,
  );
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

  const { data, error } = await supabase.rpc("record_supplier_payment_with_allocations", {
    p_vendor_id: vendorId,
    p_payment_date: paymentDate,
    p_amount: paymentAmount,
    p_payment_method: paymentMethod,
    p_note: note,
  });

  if (error) {
    redirectWithMessage(redirectPath, error.message || "Failed to record supplier payment");
  }

  const result = Array.isArray(data) ? data[0] : data;
  const allocatedBillCount = Number(result?.allocated_bill_count ?? 0);

  revalidateAll("/purchases", "/vendors", redirectPath);
  redirectWithMessage(
    redirectPath,
    `Supplier payment allocated to ${allocatedBillCount} bill${allocatedBillCount === 1 ? "" : "s"}`,
  );
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

  const changeReason = id
    ? requireActionReason(formData, staffFormPath, "Update")
    : null;

  if (id) {
    const { data: existingTransaction } = await supabase
      .from("staff_salary_transactions")
      .select("ledger_id")
      .eq("id", id)
      .maybeSingle();
    const existingLedgerId = existingTransaction?.ledger_id;

    if (!existingLedgerId) {
      redirectWithMessage(staffFormPath, "Salary transaction was not found");
    }

    const { data: existingLedger } = await supabase
      .from("staff_salary_ledgers")
      .select("status")
      .eq("id", existingLedgerId)
      .maybeSingle();

    if (existingLedger?.status === "CLOSED") {
      redirectWithMessage(staffFormPath, CLOSED_SALARY_LEDGER_LOCK_MESSAGE);
    }
  } else {
    const { data: existingLedger } = await supabase
      .from("staff_salary_ledgers")
      .select("status")
      .eq("staff_id", staffId)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle();

    if (existingLedger?.status === "CLOSED") {
      redirectWithMessage(staffFormPath, CLOSED_SALARY_LEDGER_LOCK_MESSAGE);
    }
  }

  const { error } = await supabase.rpc("upsert_staff_salary_transaction", {
    p_id: id || null,
    p_staff_id: staffId,
    p_month: month,
    p_year: year,
    p_payment_date: paymentDate,
    p_working_days: workingDays,
    p_leave_days: leaveDays,
    p_base_salary: baseSalary,
    p_amount: amount,
    p_payment_type: paymentType === "SALARY" ? "SALARY" : "ADVANCE",
    p_note: readText(formData, "note") || null,
    p_reason: changeReason,
  });

  if (error) {
    redirectWithMessage(
      staffFormPath,
      error.message || `Failed to ${id ? "update" : "create"} staff salary transaction`,
    );
  }

  revalidateAll("/staff", "/staff/payment/create", "/");
  redirectWithNotice("/staff", formData, "Staff salary transaction", id ? "updated" : "created");
}

export async function deleteStaffSalaryPayment(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const redirectTo = readText(formData, "redirect_to") || "/staff";
  const changeReason = requireActionReason(formData, redirectTo, "Delete");

  const { data: existingTransaction } = await supabase
    .from("staff_salary_transactions")
    .select("ledger_id")
    .eq("id", id)
    .maybeSingle();
  const existingLedgerId = existingTransaction?.ledger_id;

  if (!existingLedgerId) {
    redirectWithMessage(redirectTo, "Salary transaction was not found");
  }

  const { data: existingLedger } = await supabase
    .from("staff_salary_ledgers")
    .select("status")
    .eq("id", existingLedgerId)
    .maybeSingle();

  if (existingLedger?.status === "CLOSED") {
    redirectWithMessage(redirectTo, CLOSED_SALARY_LEDGER_LOCK_MESSAGE);
  }

  const { error } = await supabase.rpc("delete_staff_salary_transaction", {
    p_transaction_id: id,
    p_reason: changeReason,
  });

  if (error) {
    redirectWithMessage(redirectTo, error.message || "Failed to delete staff salary transaction");
  }

  revalidateAll("/staff", "/staff/payment/create", "/");
  redirectWithNotice("/staff", formData, "Staff salary transaction", "deleted");
}

export async function upsertPurchase(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const adjustedFromId = readText(formData, "adjusted_from_id");
  const actionType = id ? "updated" : "created";
  const purchaseFormPath = id
    ? `/purchases/create?edit=${id}`
    : adjustedFromId
      ? `/purchases/create?adjust=${adjustedFromId}`
      : "/purchases/create";
  const vendorId = readText(formData, "vendor_id");
  const vendorName = readText(formData, "vendor_name");
  const requestedPaymentStatus = readText(formData, "payment_status") || "PENDING";
  const paymentMethod = readText(formData, "payment_method") || "Cash";
  const paymentNow = readNumber(formData, "payment_now");
  const purchaseDate = resolveGregorianDate(formData, "purchase_date", "purchase_date_bs");
  const paymentDate = resolveGregorianDate(formData, "payment_date", "payment_date_bs");
  const changeReason = id || adjustedFromId
    ? requireActionReason(formData, purchaseFormPath, "Update")
    : null;
  if (id) {
    const { data: existingPurchase } = await supabase
      .from("purchases")
      .select("payment_status, record_status")
      .eq("id", id)
      .maybeSingle();
    const existingPurchaseStatus = existingPurchase?.payment_status;
    const existingPurchaseRecordStatus = existingPurchase?.record_status;

    if (!existingPurchase) {
      redirectWithMessage(purchaseFormPath, "Purchase record was not found");
    }

    if (existingPurchaseRecordStatus !== "ACTIVE") {
      redirectWithMessage(purchaseFormPath, "Only active purchase records can be updated");
    }

    if (existingPurchaseStatus === "PAID") {
      redirectWithMessage(purchaseFormPath, SETTLED_PURCHASE_LOCK_MESSAGE);
    }
  }
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
  if (id || adjustedFromId) {
    const { data: existingPurchase } = await supabase
      .from("purchases")
      .select("paid_amount")
      .eq("id", id || adjustedFromId)
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
  const { data: savedPurchase, error: purchaseRpcError } = await supabase.rpc(
    adjustedFromId ? "adjust_purchase_transaction" : "upsert_purchase_transaction",
    adjustedFromId
      ? {
          p_adjusted_from_id: adjustedFromId,
          p_purchase_number: purchasePayload.purchase_number,
          p_vendor_id: purchasePayload.vendor_id,
          p_vendor_name: purchasePayload.vendor_name,
          p_purchase_date: purchasePayload.purchase_date,
          p_payment_status: purchasePayload.payment_status,
          p_payment_type: purchasePayload.payment_type,
          p_payment_method: purchasePayload.payment_method,
          p_total_amount: purchasePayload.total_amount,
          p_paid_amount: purchasePayload.paid_amount,
          p_notes: purchasePayload.notes,
          p_items: normalizedPurchaseItems,
          p_payment_now: normalizedPaymentNow,
          p_payment_date: paymentDate || purchaseDate,
          p_change_reason: changeReason,
        }
      : {
          p_id: id || null,
          p_purchase_number: purchasePayload.purchase_number,
          p_vendor_id: purchasePayload.vendor_id,
          p_vendor_name: purchasePayload.vendor_name,
          p_purchase_date: purchasePayload.purchase_date,
          p_payment_status: purchasePayload.payment_status,
          p_payment_type: purchasePayload.payment_type,
          p_payment_method: purchasePayload.payment_method,
          p_total_amount: purchasePayload.total_amount,
          p_paid_amount: purchasePayload.paid_amount,
          p_notes: purchasePayload.notes,
          p_items: normalizedPurchaseItems,
          p_payment_now: normalizedPaymentNow,
          p_payment_date: paymentDate || purchaseDate,
          p_change_reason: changeReason,
        },
  );

  if (purchaseRpcError) {
    redirectWithMessage(
      purchaseFormPath,
      purchaseRpcError.message || `Failed to ${id ? "update" : "create"} purchase`,
    );
  }

  if (savedPurchase) {
    savedPurchaseId = String(savedPurchase);
  }

  revalidateAll("/dashboard", "/purchases", "/products", "/vendors");
  if (savedPurchaseId) {
    revalidatePath(`/purchases/create?edit=${savedPurchaseId}`);
  }
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
  const redirectTo = readText(formData, "redirect_to") || "/purchases";
  const changeReason = requireActionReason(formData, redirectTo, "Delete");
  const { data: purchase } = await supabase
    .from("purchases")
    .select("purchase_number, total_amount, payment_status, record_status")
    .eq("id", id)
    .maybeSingle();

  if (purchase?.record_status !== "ACTIVE") {
    redirectWithMessage(redirectTo, "Only active purchase records can be deleted");
  }

  if (purchase?.payment_status === "PAID") {
    redirectWithMessage(redirectTo, SETTLED_PURCHASE_LOCK_MESSAGE);
  }

  await supabase.from("purchases").delete().eq("id", id);
  await recordActivity(supabase, {
    module: "purchases",
    action: "deleted",
    title: "Purchase deleted",
    description: purchase?.purchase_number ?? "Purchase",
    amount: Number(purchase?.total_amount ?? 0),
    entityType: "purchase",
    entityId: id,
    reason: changeReason,
    metadata: {
      before: purchase ?? null,
    },
  });
  revalidateAll("/purchases");
  redirectWithNotice("/purchases", formData, "Purchase", "deleted");
}

export async function upsertSale(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const recreatedFromSaleId = readText(formData, "recreated_from_sale_id");
  const actionType = id ? "updated" : "created";
  const invoiceNumber = readText(formData, "invoice_number");
  const customerId = readText(formData, "customer_id");
  let customerName = readText(formData, "customer_name");
  let customerPhone = readText(formData, "customer_phone") || null;
  const salesDate = resolveGregorianDate(formData, "sales_date", "sales_date_bs");
  const dueDate = resolveGregorianDate(formData, "due_date", "due_date_bs") || salesDate;
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
  const normalizedCustomerPhone = customerPhone ? customerPhone.replace(/\D/g, "") : "";
  const salesFormPath = id
    ? `/sales/create?edit=${id}`
    : recreatedFromSaleId
      ? `/sales/create?fromArchived=${recreatedFromSaleId}`
      : "/sales/create";
  const changeReason = id ? requireActionReason(formData, salesFormPath, "Update") : null;
  if (id) {
    const { data: existingSale } = await supabase
      .from("sales")
      .select("payment_status, record_status")
      .eq("id", id)
      .maybeSingle();
    const existingSaleStatus = existingSale?.payment_status;
    const existingSaleRecordStatus = existingSale?.record_status;

    if (!existingSale) {
      redirectWithMessage(salesFormPath, "Sales record was not found");
    }

    if (existingSaleRecordStatus !== "ACTIVE") {
      redirectWithMessage(salesFormPath, "Only active sales records can be updated");
    }

    if (existingSaleStatus === "PAID") {
      redirectWithMessage(salesFormPath, SETTLED_SALE_LOCK_MESSAGE);
    }
  }

  if (!invoiceNumber) {
    redirect(`${salesFormPath}${salesFormPath.includes("?") ? "&" : "?"}notice=Bill%20number%20is%20required`);
  }

  if (/^SA-\d{4}\/\d{2}\/\d{2}-$/.test(invoiceNumber)) {
    redirect(`${salesFormPath}${salesFormPath.includes("?") ? "&" : "?"}notice=Bill%20number%20is%20required`);
  }

  if (customerId) {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("name, phone")
      .eq("id", customerId)
      .single();
    const linkedCustomerName = customer?.name;

    if (customerError || !linkedCustomerName) {
      redirectWithMessage(salesFormPath, "Selected customer profile was not found");
    }

    customerName = linkedCustomerName;
    customerPhone = customer?.phone ?? null;
  }

  if (!customerName) {
    redirect(`${salesFormPath}${salesFormPath.includes("?") ? "&" : "?"}notice=Customer%20name%20is%20required`);
  }

  if (normalizedCustomerPhone && normalizedCustomerPhone.length !== 10) {
    redirectWithMessage(salesFormPath, "Customer number must be 10 digits");
  }

  if (!salesDate) {
    redirect(`${salesFormPath}${salesFormPath.includes("?") ? "&" : "?"}notice=Valid%20sales%20date%20is%20required`);
  }

  if (!dueDate) {
    redirectWithMessage(salesFormPath, "Valid due date is required");
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
  const discountInput = readNumber(formData, "discount");
  const { subtotal, discount, tax, grandTotal: grossTotal } = calculateSaleTotals(
    normalizedSaleItems,
    discountInput,
  );

  if (discountInput > subtotal) {
    redirectWithMessage(salesFormPath, "Discount cannot be greater than the subtotal");
  }
  const paymentIncrementInput = readNumber(formData, "payment_increment");
  const todayDate = getTodayDate();
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
      paymentIncrementInput,
      dueDate,
      todayDate,
    });

  if (
    paymentIncrementInput > 0 &&
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
    customer_phone: normalizedCustomerPhone || null,
    customer_id: customerId || null,
    sales_date: salesDate,
    due_date: dueDate,
    payment_status: paymentStatus,
    subtotal,
    discount,
    tax,
    amount_received: amountReceived,
    notes: readText(formData, "notes") || null,
  };

  let savedSaleId = id;
  const { data: savedSale, error: saleRpcError } = await supabase.rpc(
    "upsert_sale_transaction",
    {
      p_id: id || null,
      p_invoice_number: salesPayload.invoice_number,
      p_customer_id: salesPayload.customer_id,
      p_customer_name: salesPayload.customer_name,
      p_customer_phone: salesPayload.customer_phone,
      p_sales_date: salesPayload.sales_date,
      p_due_date: salesPayload.due_date,
      p_payment_status: salesPayload.payment_status,
      p_subtotal: salesPayload.subtotal,
      p_discount: salesPayload.discount,
      p_tax: salesPayload.tax,
      p_amount_received: salesPayload.amount_received,
      p_notes: salesPayload.notes,
      p_items: normalizedSaleItems,
      p_payment_increment: paymentIncrement,
      p_payment_date: paymentDate || salesDate,
      p_change_reason: changeReason,
    },
  );

  if (saleRpcError) {
    redirectWithMessage(
      salesFormPath,
      saleRpcError.message || `Failed to ${id ? "update" : "create"} sale`,
    );
  }

  if (savedSale) {
    savedSaleId = String(savedSale);
  }

  if (savedSaleId && recreatedFromSaleId) {
    const { data: archivedSource } = await supabase
      .from("sales")
      .select("invoice_number, customer_id")
      .eq("id", recreatedFromSaleId)
      .maybeSingle();
    await recordActivity(supabase, {
      module: "sales",
      action: "sale_recreated",
      title: "Sale recreated",
      description: invoiceNumber,
      amount: grossTotal,
      entityType: "sale",
      entityId: savedSaleId,
      metadata: {
        recreated_from_sale_id: recreatedFromSaleId,
        archived_invoice_number: archivedSource?.invoice_number ?? null,
      },
    });
    if (archivedSource?.customer_id) {
      revalidatePath(`/customers/${archivedSource.customer_id}`);
    }
  }

  revalidateAll("/", "/dashboard", "/sales", "/sales/view", "/sales/create", "/sales/archived", "/customers");
  if (savedSaleId) {
    revalidatePath(`/sales/create?edit=${savedSaleId}`);
  }
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
  const redirectTo = readText(formData, "redirect_to") || "/sales";
  const changeReason = requireActionReason(formData, redirectTo, "Delete");
  const { data: sale } = await supabase
    .from("sales")
    .select("customer_id, invoice_number, grand_total, payment_status, record_status")
    .eq("id", id)
    .single();

  if (sale?.record_status !== "ACTIVE") {
    redirectWithMessage(redirectTo, "Only active sales records can be deleted");
  }

  if (sale?.payment_status === "PAID") {
    redirectWithMessage(redirectTo, SETTLED_SALE_LOCK_MESSAGE);
  }

  await supabase.from("sales").delete().eq("id", id);
  await recordActivity(supabase, {
    module: "sales",
    action: "deleted",
    title: "Sale deleted",
    description: sale?.invoice_number ?? "Sale",
    amount: Number(sale?.grand_total ?? 0),
    entityType: "sale",
    entityId: id,
    reason: changeReason,
    metadata: {
      before: sale ?? null,
    },
  });
  revalidateAll("/", "/sales", "/customers");
  if (sale?.customer_id) {
    revalidatePath(`/customers/${sale.customer_id}`);
  }
  redirectWithNotice("/sales", formData, "Sale", "deleted");
}

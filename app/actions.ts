"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/server";

const readText = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const readNumber = (formData: FormData, key: string) => {
  const rawValue = readText(formData, key).replace(/[^\d.-]/g, "");
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : 0;
};

const generateNextCode = (codes: (string | null | undefined)[], prefix: string) => {
  const maxSequence = codes.reduce((maxValue, code) => {
    const normalized = String(code ?? "").trim().toUpperCase();
    if (!normalized.startsWith(prefix)) return maxValue;

    const numericPart = Number(normalized.slice(prefix.length));
    return Number.isFinite(numericPart) ? Math.max(maxValue, numericPart) : maxValue;
  }, 0);

  return `${prefix}${String(maxSequence + 1).padStart(2, "0")}`;
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
  redirect(`${redirectTo}${separator}notice=${entity} ${action}`);
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
    const { data: existingProducts = [] } = await supabase.from("products").select("code");
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
  redirectWithNotice("/vendors", formData, "Vendor", actionType);
}

export async function deleteVendor(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  await supabase.from("vendors").delete().eq("id", id);
  revalidateAll("/purchases", "/vendors");
  redirectWithNotice("/vendors", formData, "Vendor", "deleted");
}

export async function upsertStaffProfile(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const actionType = id ? "updated" : "created";

  const payload = {
    staff_code: readText(formData, "staff_code"),
    name: readText(formData, "name"),
    address: readText(formData, "address") || null,
    phone: readText(formData, "phone") || null,
    total_salary: readNumber(formData, "total_salary"),
    advance_salary: readNumber(formData, "advance_salary"),
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

export async function upsertPurchase(formData: FormData) {
  const supabase = await getSupabaseClient();
  const id = readText(formData, "id");
  const actionType = id ? "updated" : "created";
  const quantity = readNumber(formData, "quantity") || 1;
  const rate = readNumber(formData, "rate");
  const totalAmount = quantity * rate;
  const vendorId = readText(formData, "vendor_id");
  const vendorName = readText(formData, "vendor_name");
  const requestedPaymentStatus = readText(formData, "payment_status") || "PENDING";
  const paymentMethod = readText(formData, "payment_method") || "Cash";
  const paymentNow = readNumber(formData, "payment_now");
  const paymentDate = readText(formData, "payment_date");

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
    purchase_date: readText(formData, "purchase_date"),
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
    redirect("/purchases/create?notice=Select%20or%20type%20a%20vendor");
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
        payment_date: paymentDate || readText(formData, "purchase_date"),
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
          payment_date: paymentDate || readText(formData, "purchase_date"),
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

  const payload = {
    expense_date: readText(formData, "expense_date"),
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
  const productIds = formData.getAll("product_id").map((value) => String(value ?? "").trim());
  const productNames = formData
    .getAll("product_name")
    .map((value) => String(value ?? "").trim());
  const taxableFlags = formData
    .getAll("taxable")
    .map((value) => String(value ?? "").trim() === "true");
  const quantities = formData.getAll("quantity").map((value) => {
    const numericValue = Number(String(value ?? "").trim());
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1;
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
  const paymentIncrement =
    requestedPaymentStatus === "PAID"
      ? Math.min(
          paymentIncrementInput > 0 ? paymentIncrementInput : remainingBeforePayment || grossTotal,
          remainingBeforePayment || grossTotal,
        )
      : requestedPaymentStatus === "PARTIAL"
        ? Math.min(paymentIncrementInput, remainingBeforePayment || grossTotal)
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
    sales_date: readText(formData, "sales_date"),
    payment_status: paymentStatus,
    subtotal,
    discount,
    tax,
    amount_received: amountReceived,
    notes: readText(formData, "notes") || null,
  };

  if (id) {
    await supabase.from("sales").update(salesPayload).eq("id", id);
    await supabase.from("sales_items").delete().eq("sale_id", id);
    if (normalizedSaleItems.length) {
      await supabase.from("sales_items").insert(
        normalizedSaleItems.map((item) => ({
          ...item,
          sale_id: id,
        })),
      );
    }
    if (paymentIncrement > 0) {
      await supabase.from("sales_payments").insert({
        sale_id: id,
        payment_date: readText(formData, "payment_date") || readText(formData, "sales_date"),
        amount: paymentIncrement,
      });
    }
  } else {
    const { data } = await supabase
      .from("sales")
      .insert(salesPayload)
      .select("id")
      .single();

    if (data?.id && normalizedSaleItems.length) {
      await supabase.from("sales_items").insert(
        normalizedSaleItems.map((item) => ({
          ...item,
          sale_id: data.id,
        })),
      );
    }
    if (data?.id && paymentIncrement > 0) {
      await supabase.from("sales_payments").insert({
        sale_id: data.id,
        payment_date: readText(formData, "payment_date") || readText(formData, "sales_date"),
        amount: paymentIncrement,
      });
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

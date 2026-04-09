"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { upsertSale } from "@/app/actions";
import { FieldHint } from "@/components/shared/FieldHint";
import { FormSectionHeader } from "@/components/shared/FormSectionHeader";
import { NepaliDateInput } from "@/components/shared/NepaliDateInput";
import { FormStickyActions } from "@/components/shared/FormStickyActions";
import { type AppLocale, getMessages, getStatusLabel } from "@/lib/i18n";
import { adToBs, bsToAd } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";

type ProductOption = {
  id: string;
  name: string;
  sales_rate: number | null;
};

type EditingSale = {
  id: string;
  invoice_number: string;
  customer_name: string;
  sales_date: string;
  payment_status: string;
  subtotal: number | null;
  discount: number | null;
  tax: number | null;
  amount_received: number | null;
  remaining_amount?: number | null;
  notes: string | null;
  sales_items:
    | {
        product_id: string | null;
        product_name: string;
        quantity: number | null;
        rate: number | null;
        taxable?: boolean | null;
        tax_amount?: number | null;
      }[]
    | null;
};

type SaleItemRow = {
  productId: string;
  productName: string;
  quantity: string;
  rate: string;
  taxable: boolean;
};

const toNumber = (value: string) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const toWholeNumber = (value: string) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "1";
  }

  return String(Math.max(Math.trunc(numericValue), 1));
};

const createEmptyRow = (): SaleItemRow => ({
  productId: "",
  productName: "",
  quantity: "1",
  rate: "0",
  taxable: false,
});

const normalizeSaleItems = (items: SaleItemRow[]) =>
  items.map((item) => ({
    productId: item.productId.trim(),
    productName: item.productName.trim(),
    quantity: toWholeNumber(item.quantity),
    rate: toNumber(item.rate).toFixed(2),
    taxable: Boolean(item.taxable),
  }));

export function SalesForm({
  products,
  editingSale,
  defaultDate,
  locale = "en",
}: {
  products: ProductOption[];
  editingSale: EditingSale | null;
  defaultDate: string;
  locale?: AppLocale;
}) {
  const messages = getMessages(locale);
  const salesMessages = messages.salesEntry;
  const [invoiceNumber, setInvoiceNumber] = useState(editingSale?.invoice_number ?? "");
  const [salesDateBs, setSalesDateBs] = useState(adToBs(editingSale?.sales_date ?? defaultDate));
  const [customerName, setCustomerName] = useState(editingSale?.customer_name ?? "");
  const [paymentStatus, setPaymentStatus] = useState(
    editingSale?.payment_status ?? "PENDING",
  );
  const [items, setItems] = useState<SaleItemRow[]>(
    editingSale?.sales_items?.length
      ? editingSale.sales_items.map((item) => ({
          productId: item.product_id ?? "",
          productName: item.product_name ?? "",
          quantity: String(item.quantity ?? 1),
          rate: String(item.rate ?? 0),
          taxable: Boolean(item.taxable),
        }))
      : editingSale
        ? [
            {
              productId: "",
              productName: "Saved sales item",
              quantity: "1",
              rate: String(editingSale.subtotal ?? 0),
              taxable: Number(editingSale.tax ?? 0) > 0,
            },
          ]
      : [createEmptyRow()],
  );
  const [discount, setDiscount] = useState(String(editingSale?.discount ?? 0));
  const [paymentIncrement, setPaymentIncrement] = useState("");
  const [paymentDateBs, setPaymentDateBs] = useState(adToBs(defaultDate));
  const salesDate = bsToAd(salesDateBs);
  const paymentDate = bsToAd(paymentDateBs);
  const isEditingSettledBill = Boolean(editingSale && editingSale.payment_status === "PAID");

  const subtotal = items.reduce((sum, item) => {
    return sum + Math.max(toNumber(item.quantity) * toNumber(item.rate), 0);
  }, 0);
  const tax = items.reduce((sum, item) => {
    if (!item.taxable) {
      return sum;
    }

    return sum + Math.max(toNumber(item.quantity) * toNumber(item.rate), 0) * 0.13;
  }, 0);
  const grandTotal = Math.max(subtotal - toNumber(discount) + tax, 0);
  const previousAmountReceived = Number(editingSale?.amount_received ?? 0);
  const enteredPaymentAmount = toNumber(paymentIncrement);
  const remainingBeforePayment = Math.max(grandTotal - previousAmountReceived, 0);
  const isFullyPaid = remainingBeforePayment <= 0 && grandTotal > 0;
  const effectivePaymentIncrement =
    isFullyPaid
      ? 0
      : paymentStatus === "PAID"
      ? Math.min(
          enteredPaymentAmount > 0 ? enteredPaymentAmount : remainingBeforePayment,
          remainingBeforePayment,
        )
      : paymentStatus === "PARTIAL"
        ? Math.min(enteredPaymentAmount, remainingBeforePayment)
        : 0;
  const effectiveAmountReceived = previousAmountReceived + effectivePaymentIncrement;
  const remainingAmount = Math.max(grandTotal - effectiveAmountReceived, 0);
  const initialFinancialSnapshot = useMemo(
    () =>
      editingSale && editingSale.payment_status === "PAID"
        ? JSON.stringify({
            invoiceNumber: editingSale.invoice_number.trim(),
            customerName: editingSale.customer_name.trim(),
            salesDateBs: adToBs(editingSale.sales_date),
            paymentStatus: editingSale.payment_status,
            discount: toNumber(String(editingSale.discount ?? 0)).toFixed(2),
            items: normalizeSaleItems(
              editingSale.sales_items?.length
                ? editingSale.sales_items.map((item) => ({
                    productId: item.product_id ?? "",
                    productName: item.product_name ?? "",
                    quantity: String(item.quantity ?? 1),
                    rate: String(item.rate ?? 0),
                    taxable: Boolean(item.taxable),
                  }))
                : [
                    {
                      productId: "",
                      productName: "Saved sales item",
                      quantity: "1",
                      rate: String(editingSale.subtotal ?? 0),
                      taxable: Number(editingSale.tax ?? 0) > 0,
                    },
                  ],
            ),
          })
        : "",
    [editingSale],
  );
  const currentFinancialSnapshot = useMemo(
    () =>
      JSON.stringify({
        invoiceNumber: invoiceNumber.trim(),
        customerName: customerName.trim(),
        salesDateBs,
        paymentStatus,
        discount: toNumber(discount).toFixed(2),
        items: normalizeSaleItems(items),
      }),
    [customerName, discount, invoiceNumber, items, paymentStatus, salesDateBs],
  );

  const updateItem = (index: number, nextValues: Partial<SaleItemRow>) => {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...nextValues } : item,
      ),
    );
  };

  const addItem = () => {
    setItems((currentItems) => [...currentItems, createEmptyRow()]);
  };

  const removeItem = (index: number) => {
    setItems((currentItems) =>
      currentItems.length === 1
        ? [createEmptyRow()]
        : currentItems.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  return (
    <form
      action={upsertSale}
      autoComplete="off"
      className="space-y-6"
      onSubmit={(event) => {
        if (!isEditingSettledBill) return;
        if (initialFinancialSnapshot === currentFinancialSnapshot) return;

        const shouldContinue = window.confirm(
          salesMessages.settledConfirm,
        );

        if (!shouldContinue) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" defaultValue={editingSale?.id ?? ""} />
      <input type="hidden" name="redirect_to" value="/sales" />
      <input type="hidden" name="tax" value={tax.toFixed(2)} />
      <input type="hidden" name="sales_date" value={salesDate} />

      {isEditingSettledBill ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="font-semibold">{salesMessages.settledWarningTitle}</div>
          <div className="mt-1">{salesMessages.settledWarningBody}</div>
        </div>
      ) : null}

      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <FormSectionHeader
          eyebrow={salesMessages.partyEyebrow}
          title={salesMessages.partyTitle}
          description={salesMessages.partyDescription}
        />
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {salesMessages.billNumber}
            </label>
            <input
              suppressHydrationWarning
              name="invoice_number"
              required
              autoFocus
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.target.value)}
              placeholder="55"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
            <FieldHint>{salesMessages.billNumberHint}</FieldHint>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {salesMessages.salesDateBs}
            </label>
            <NepaliDateInput value={salesDateBs} onChange={setSalesDateBs} />
            <input type="hidden" name="sales_date_bs" value={salesDateBs} />
            <FieldHint>{salesMessages.bsDateHint}</FieldHint>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {salesMessages.customerName}
            </label>
            <input
              suppressHydrationWarning
              name="customer_name"
              required
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder={salesMessages.customerPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
            <FieldHint>{salesMessages.customerHint}</FieldHint>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {salesMessages.paymentStatus}
            </label>
            <select
              suppressHydrationWarning
              name="payment_status"
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="PAID">{getStatusLabel("PAID", locale)}</option>
              <option value="PENDING">{getStatusLabel("PENDING", locale)}</option>
              <option value="PARTIAL">{getStatusLabel("PARTIAL", locale)}</option>
              <option value="OVERDUE">{getStatusLabel("OVERDUE", locale)}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <FormSectionHeader
          eyebrow={salesMessages.itemsEyebrow}
          title={salesMessages.itemsTitle}
          description={salesMessages.itemsDescription}
          action={
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              {salesMessages.addItem}
            </button>
          }
        />

        <div className="mt-5 space-y-4">
          {items.map((item, index) => (
            <div
              key={`${index}-${item.productId}-${item.productName}`}
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h5 className="text-sm font-semibold text-slate-900">
                  {salesMessages.itemLabel} {index + 1}
                </h5>
                <button
                  type="button"
                  onClick={() => {
                    const shouldDelete = window.confirm(salesMessages.deleteItemConfirm);

                    if (shouldDelete) {
                      removeItem(index);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  {salesMessages.remove}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-7">
                <input type="hidden" name="taxable" value={item.taxable ? "true" : "false"} />
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {salesMessages.productItem}
                  </label>
                  <select
                    suppressHydrationWarning
                    name="product_id"
                    required
                    value={item.productId}
                    onChange={(event) => {
                      const nextProductId = event.target.value;
                      const nextProduct =
                        products.find((product) => product.id === nextProductId) ?? null;

                      updateItem(index, {
                        productId: nextProductId,
                        productName: nextProduct?.name ?? item.productName,
                        rate: nextProduct ? String(nextProduct.sales_rate ?? 0) : item.rate,
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">{salesMessages.selectProductItem}</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <FieldHint>{salesMessages.productHint}</FieldHint>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {salesMessages.itemName}
                  </label>
                  <input
                    suppressHydrationWarning
                    name="product_name"
                    required
                    value={item.productName}
                    onChange={(event) => updateItem(index, { productName: event.target.value })}
                    placeholder={salesMessages.itemNamePlaceholder}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {salesMessages.quantity}
                  </label>
                  <input
                    suppressHydrationWarning
                    name="quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(index, { quantity: toWholeNumber(event.target.value) })
                    }
                    placeholder={salesMessages.quantityPlaceholder}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {salesMessages.rate}
                  </label>
                  <input
                    suppressHydrationWarning
                    name="rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.rate}
                    onChange={(event) => updateItem(index, { rate: event.target.value })}
                    placeholder={salesMessages.ratePlaceholder}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {salesMessages.taxOption}
                  </label>
                  <label className="flex h-[42px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
                    <input
                      suppressHydrationWarning
                      type="checkbox"
                      checked={item.taxable}
                      onChange={(event) => updateItem(index, { taxable: event.target.checked })}
                      className="h-4 w-4"
                    />
                    13% VAT
                  </label>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {salesMessages.itemAmount}
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={formatCurrency(toNumber(item.quantity) * toNumber(item.rate))}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {salesMessages.itemTax}
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={formatCurrency(
                      item.taxable
                        ? Math.max(toNumber(item.quantity) * toNumber(item.rate), 0) * 0.13
                        : 0,
                    )}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    {salesMessages.lineAmount}
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {formatCurrency(toNumber(item.quantity) * toNumber(item.rate))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    {salesMessages.vatOnThisLine}
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {formatCurrency(
                      item.taxable
                        ? Math.max(toNumber(item.quantity) * toNumber(item.rate), 0) * 0.13
                        : 0,
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <FormSectionHeader
          eyebrow={salesMessages.paymentEyebrow}
          title={salesMessages.paymentTitle}
          description={salesMessages.paymentDescription}
        />
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                {salesMessages.currentInvoiceTotal}
              </div>
              <div className="mt-2 text-lg font-bold text-slate-900">{formatCurrency(grandTotal)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                {salesMessages.previouslyReceived}
              </div>
              <div className="mt-2 text-lg font-bold text-green-700">
                {formatCurrency(previousAmountReceived)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                {salesMessages.remainingBalance}
              </div>
              <div className="mt-2 text-lg font-bold text-amber-700">
                {formatCurrency(remainingAmount)}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {salesMessages.discountAmount}
            </label>
            <input
              suppressHydrationWarning
              name="discount"
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
              placeholder={salesMessages.discountPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {salesMessages.totalTaxAmount}
              </label>
              <input
                suppressHydrationWarning
                type="text"
                value={formatCurrency(tax)}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {salesMessages.totalAmount}
              </label>
              <input
                suppressHydrationWarning
                type="text"
                value={formatCurrency(grandTotal)}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {salesMessages.previouslyReceivedAmount}
              </label>
              <input
                suppressHydrationWarning
                type="text"
                value={formatCurrency(previousAmountReceived)}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {salesMessages.remainingAmount}
              </label>
              <input
                suppressHydrationWarning
                type="text"
                value={formatCurrency(remainingAmount)}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none"
              />
            </div>
          </div>

          {(paymentStatus === "PARTIAL" || paymentStatus === "PAID") && !isFullyPaid && (
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {salesMessages.amountReceivedNow}
                </label>
                <input
                  suppressHydrationWarning
                  name="payment_increment"
                  type="number"
                  min="0"
                  max={remainingBeforePayment}
                  step="0.01"
                  value={paymentIncrement}
                  onChange={(event) => setPaymentIncrement(event.target.value)}
                  placeholder={
                    paymentStatus === "PAID"
                      ? salesMessages.collectFullRemaining
                      : salesMessages.receivedAmountPlaceholder
                  }
                  className="[appearance:textfield] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:border-blue-500"
                />
                <FieldHint>{salesMessages.receivedAmountHint}</FieldHint>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {salesMessages.paymentDate}
                </label>
                <NepaliDateInput value={paymentDateBs} onChange={setPaymentDateBs} />
                <input type="hidden" name="payment_date_bs" value={paymentDateBs} />
                <input type="hidden" name="payment_date" value={paymentDate} />
              </div>
            </div>
          )}

          {(paymentStatus === "PARTIAL" || paymentStatus === "PAID") && isFullyPaid && (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              {salesMessages.fullyPaidNotice}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <FormSectionHeader
          eyebrow={salesMessages.notesEyebrow}
          title={salesMessages.notesTitle}
          description={salesMessages.notesDescription}
        />
        <div className="mt-5">
          <textarea
            suppressHydrationWarning
            name="notes"
            rows={4}
            defaultValue={editingSale?.notes ?? ""}
            placeholder={salesMessages.notesPlaceholder}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <FormStickyActions
        submitLabel={editingSale ? salesMessages.updateAction : salesMessages.saveAction}
        cancelHref="/sales"
        helperText={salesMessages.stickyHelper}
      />
    </form>
  );
}

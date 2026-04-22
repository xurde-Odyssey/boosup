"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { upsertPurchase } from "@/app/actions";
import { FieldHint } from "@/components/shared/FieldHint";
import { FormSectionHeader } from "@/components/shared/FormSectionHeader";
import { NepaliDateInput } from "@/components/shared/NepaliDateInput";
import { FormStickyActions } from "@/components/shared/FormStickyActions";
import { type AppLocale, getMessages, getStatusLabel } from "@/lib/i18n";
import { adToBs, bsToAd } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";

type VendorOption = {
  id: string;
  name: string;
};

type PurchasePayment = {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
};

type EditingPurchase = {
  id: string;
  purchase_number: string;
  purchase_date: string;
  payment_status: string;
  payment_method: string;
  paid_amount: number | null;
  total_amount: number | null;
  credit_amount: number | null;
  notes: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  purchase_items:
    | {
        product_name: string | null;
        quantity: number | null;
        rate: number | null;
      }[]
    | null;
};

type PurchaseItemRow = {
  id: string;
  productName: string;
  quantity: string;
  rate: string;
};

let purchaseItemRowCounter = 0;

const createPurchaseItemRowId = () => {
  purchaseItemRowCounter += 1;
  return `purchase-item-${purchaseItemRowCounter}`;
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

const createEmptyRow = (): PurchaseItemRow => ({
  id: createPurchaseItemRowId(),
  productName: "",
  quantity: "1",
  rate: "0",
});

const normalizePurchaseItems = (items: PurchaseItemRow[]) =>
  items.map((item) => ({
    productName: item.productName.trim(),
    quantity: toWholeNumber(item.quantity),
    rate: toNumber(item.rate).toFixed(2),
  }));

const normalizePurchaseSnapshot = (values: {
  purchaseNumber: string;
  purchaseDateBs: string;
  vendorId: string;
  vendorName: string;
  items: PurchaseItemRow[];
  paymentStatus: string;
  paymentMethod: string;
}) => ({
  purchaseNumber: values.purchaseNumber.trim(),
  purchaseDateBs: values.purchaseDateBs,
  vendorId: values.vendorId,
  vendorName: values.vendorName.trim(),
  items: normalizePurchaseItems(values.items),
  paymentStatus: values.paymentStatus,
  paymentMethod: values.paymentMethod,
});

export function PurchaseForm({
  vendors,
  editingPurchase,
  purchasePayments,
  defaultDate,
  locale = "en",
}: {
  vendors: VendorOption[];
  editingPurchase: EditingPurchase | null;
  purchasePayments: PurchasePayment[];
  defaultDate: string;
  locale?: AppLocale;
}) {
  const messages = getMessages(locale);
  const purchaseMessages = messages.purchaseEntry;
  const [purchaseDateBs, setPurchaseDateBs] = useState(
    adToBs(editingPurchase?.purchase_date ?? defaultDate),
  );
  const purchaseNumberPrefix = useMemo(
    () => `PUR-${purchaseDateBs || adToBs(defaultDate)}-`,
    [defaultDate, purchaseDateBs],
  );
  const [purchaseNumber, setPurchaseNumber] = useState(
    editingPurchase?.purchase_number ?? purchaseNumberPrefix,
  );
  const [vendorId, setVendorId] = useState(editingPurchase?.vendor_id ?? "");
  const [vendorName, setVendorName] = useState(editingPurchase?.vendor_name ?? "");
  const [items, setItems] = useState<PurchaseItemRow[]>(
    editingPurchase?.purchase_items?.length
      ? editingPurchase.purchase_items.map((item) => ({
          id: createPurchaseItemRowId(),
          productName: item.product_name ?? "",
          quantity: String(item.quantity ?? 1),
          rate: String(item.rate ?? 0),
        }))
      : [createEmptyRow()],
  );
  const [paymentStatus, setPaymentStatus] = useState(editingPurchase?.payment_status ?? "PENDING");
  const [paymentMethod, setPaymentMethod] = useState(editingPurchase?.payment_method ?? "Cash");
  const [paymentNow, setPaymentNow] = useState("0");
  const [paymentDateBs, setPaymentDateBs] = useState(adToBs(defaultDate));
  const [notes, setNotes] = useState(editingPurchase?.notes ?? "");
  const previousPrefixRef = useRef(purchaseNumberPrefix);
  const purchaseDate = bsToAd(purchaseDateBs);
  const paymentDate = bsToAd(paymentDateBs);
  const showPaymentMethod = paymentStatus === "PAID" || paymentStatus === "PARTIAL";
  const isEditingSettledBill = Boolean(editingPurchase && editingPurchase.payment_status === "PAID");

  const previousPaidAmount = Number(editingPurchase?.paid_amount ?? 0);
  const itemAmount = items.reduce((sum, item) => {
    return sum + Math.max(toNumber(item.quantity) * toNumber(item.rate), 0);
  }, 0);
  const payableAmount = Math.max(itemAmount - previousPaidAmount, 0);
  const enteredPaymentNow = Math.max(toNumber(paymentNow), 0);
  const normalizedPaymentNow =
    paymentStatus === "PAID" && !editingPurchase && toNumber(paymentNow) <= 0
      ? itemAmount
      : enteredPaymentNow;
  const nextPaidAmount = Math.min(previousPaidAmount + normalizedPaymentNow, itemAmount);
  const remainingAmount = Math.max(itemAmount - nextPaidAmount, 0);
  const activeVendorLabel =
    vendorId
      ? vendors.find((vendor) => vendor.id === vendorId)?.name ?? purchaseMessages.savedSupplierFallback
      : vendorName || purchaseMessages.noSupplierSelected;
  const initialFinancialSnapshot = useMemo(
    () =>
      editingPurchase && editingPurchase.payment_status === "PAID"
        ? JSON.stringify(
            normalizePurchaseSnapshot({
              purchaseNumber: editingPurchase.purchase_number,
              purchaseDateBs: adToBs(editingPurchase.purchase_date),
              vendorId: editingPurchase.vendor_id ?? "",
              vendorName: editingPurchase.vendor_name ?? "",
              items:
                editingPurchase.purchase_items?.length
                  ? editingPurchase.purchase_items.map((item) => ({
                      id: createPurchaseItemRowId(),
                      productName: item.product_name ?? "",
                      quantity: String(item.quantity ?? 1),
                      rate: String(item.rate ?? 0),
                    }))
                  : [createEmptyRow()],
              paymentStatus: editingPurchase.payment_status,
              paymentMethod: editingPurchase.payment_method ?? "Cash",
            }),
          )
        : "",
    [editingPurchase],
  );
  const updateItem = (index: number, nextValues: Partial<PurchaseItemRow>) => {
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

  useEffect(() => {
    if (editingPurchase) return;

    const previousPrefix = previousPrefixRef.current;
    if (purchaseNumber === previousPrefix || purchaseNumber.startsWith(previousPrefix)) {
      const suffix = purchaseNumber.slice(previousPrefix.length);
      setPurchaseNumber(`${purchaseNumberPrefix}${suffix}`);
    } else if (!purchaseNumber.trim()) {
      setPurchaseNumber(purchaseNumberPrefix);
    }

    previousPrefixRef.current = purchaseNumberPrefix;
  }, [editingPurchase, purchaseNumber, purchaseNumberPrefix]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-900">
            {editingPurchase ? purchaseMessages.sectionEditTitle : purchaseMessages.sectionCreateTitle}
          </h3>
          <p className="text-sm text-slate-500">
            {purchaseMessages.sectionSubtitle}
          </p>
        </div>

        <form
          action={upsertPurchase}
          autoComplete="off"
          className="space-y-5"
          onSubmit={(event) => {
            if (!isEditingSettledBill) return;
            const currentFinancialSnapshot = JSON.stringify(
              normalizePurchaseSnapshot({
                purchaseNumber,
                purchaseDateBs,
                vendorId,
                vendorName,
                items,
                paymentStatus,
                paymentMethod,
              }),
            );
            if (initialFinancialSnapshot === currentFinancialSnapshot) return;

            const shouldContinue = window.confirm(
              purchaseMessages.settledConfirm,
            );

            if (!shouldContinue) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" defaultValue={editingPurchase?.id ?? ""} />
          <input type="hidden" name="redirect_to" value="/purchases" />
          <input type="hidden" name="purchase_date" value={purchaseDate} />

          {isEditingSettledBill ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="font-semibold">{purchaseMessages.settledWarningTitle}</div>
              <div className="mt-1">{purchaseMessages.settledWarningBody}</div>
            </div>
          ) : null}

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <FormSectionHeader
              eyebrow={purchaseMessages.partyEyebrow}
              title={purchaseMessages.partyTitle}
              description={purchaseMessages.partyDescription}
            />
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {purchaseMessages.purchaseNumber}
                </label>
                <input
                  name="purchase_number"
                  required
                  autoFocus
                  value={purchaseNumber}
                  onChange={(event) => setPurchaseNumber(event.target.value)}
                  placeholder={`${purchaseNumberPrefix}001`}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
                <FieldHint>
                  {editingPurchase
                    ? purchaseMessages.purchaseNumberHint
                    : `Prefix follows Nepal date. Add your bill no after ${purchaseNumberPrefix}`}
                </FieldHint>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {purchaseMessages.purchaseDateBs}
                </label>
                <NepaliDateInput value={purchaseDateBs} onChange={setPurchaseDateBs} />
                <input type="hidden" name="purchase_date_bs" value={purchaseDateBs} />
                <FieldHint>{purchaseMessages.bsDateHint}</FieldHint>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {purchaseMessages.savedSupplier}
                </label>
                <select
                  name="vendor_id"
                  value={vendorId}
                  onChange={(event) => setVendorId(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">{purchaseMessages.selectSavedSupplier}</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
                <FieldHint>{purchaseMessages.savedSupplierHint}</FieldHint>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {purchaseMessages.oneTimeSupplierName}
                </label>
                <input
                  name="vendor_name"
                  value={vendorName}
                  onChange={(event) => setVendorName(event.target.value)}
                  placeholder={purchaseMessages.oneTimeSupplierPlaceholder}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <FormSectionHeader
              eyebrow={purchaseMessages.itemsEyebrow}
              title={purchaseMessages.itemsTitle}
              description={purchaseMessages.itemsDescription}
              action={
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  {purchaseMessages.addItem}
                </button>
              }
            />
            <div className="mt-5 space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h5 className="text-sm font-semibold text-slate-900">
                      {purchaseMessages.itemLabel} {index + 1}
                    </h5>
                    <button
                      type="button"
                      onClick={() => {
                        const shouldDelete = window.confirm(purchaseMessages.deleteItemConfirm);
                        if (shouldDelete) {
                          removeItem(index);
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      {purchaseMessages.remove}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.4fr)_140px_160px]">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        {purchaseMessages.rawMaterialName}
                      </label>
                      <input
                        name="product_name"
                        value={item.productName}
                        onChange={(event) => updateItem(index, { productName: event.target.value })}
                        placeholder={purchaseMessages.rawMaterialPlaceholder}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        {purchaseMessages.quantity}
                      </label>
                      <input
                        name="quantity"
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, { quantity: toWholeNumber(event.target.value) })
                        }
                        placeholder="1"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        {purchaseMessages.rate}
                      </label>
                      <input
                        name="rate"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.rate}
                        onChange={(event) => updateItem(index, { rate: event.target.value })}
                        placeholder={purchaseMessages.ratePlaceholder}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                          {purchaseMessages.materialAmount}
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatCurrency(toNumber(item.quantity) * toNumber(item.rate))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                          {purchaseMessages.quantityTimesRate}
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {item.quantity || "0"} x {formatCurrency(toNumber(item.rate))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                          {purchaseMessages.lineAmount}
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatCurrency(toNumber(item.quantity) * toNumber(item.rate))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    {purchaseMessages.materialAmount}
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">{formatCurrency(itemAmount)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    {purchaseMessages.totalItems}
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">{items.length}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    {purchaseMessages.activeSupplier}
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">{activeVendorLabel}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <FormSectionHeader
              eyebrow={purchaseMessages.paymentEyebrow}
              title={purchaseMessages.paymentTitle}
              description={purchaseMessages.paymentDescription}
            />
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2 xl:col-span-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                      {purchaseMessages.billAmount}
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900">
                      {formatCurrency(itemAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                      {purchaseMessages.previouslyPaid}
                    </div>
                    <div className="mt-1 text-lg font-bold text-green-700">
                      {formatCurrency(previousPaidAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                      {purchaseMessages.remainingAmount}
                    </div>
                    <div className="mt-1 text-lg font-bold text-amber-700">
                      {formatCurrency(remainingAmount)}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {purchaseMessages.paymentStatus}
                </label>
                <select
                  name="payment_status"
                  value={paymentStatus}
                  onChange={(event) => setPaymentStatus(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="PAID">{getStatusLabel("PAID", locale)}</option>
                  <option value="PARTIAL">{getStatusLabel("PARTIAL", locale)}</option>
                  <option value="OVERDUE">{getStatusLabel("OVERDUE", locale)}</option>
                  <option value="PENDING">{getStatusLabel("PENDING", locale)}</option>
                </select>
              </div>
              {showPaymentMethod ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {purchaseMessages.paymentMethod}
                  </label>
                  <select
                    name="payment_method"
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="Cash">{purchaseMessages.cash}</option>
                    <option value="Mobile">{purchaseMessages.mobile}</option>
                  </select>
                </div>
              ) : (
                <input type="hidden" name="payment_method" value={paymentMethod} />
              )}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {purchaseMessages.paymentDate}
                </label>
                <NepaliDateInput value={paymentDateBs} onChange={setPaymentDateBs} />
                <input type="hidden" name="payment_date_bs" value={paymentDateBs} />
                <input type="hidden" name="payment_date" value={paymentDate} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {purchaseMessages.previousPaidAmount}
                </label>
                <input
                  type="text"
                  readOnly
                  value={formatCurrency(previousPaidAmount)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {purchaseMessages.amountPaidNow}
                </label>
                <input
                  name="payment_now"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]*"
                  value={paymentNow}
                  onChange={(event) => setPaymentNow(event.target.value)}
                  placeholder={purchaseMessages.amountPaidNowPlaceholder}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
                <FieldHint tone={enteredPaymentNow > payableAmount ? "danger" : "default"}>
                  {enteredPaymentNow > payableAmount
                    ? "Payment exceeds this bill's payable amount."
                    : `Maximum payable: ${formatCurrency(payableAmount)}`}
                </FieldHint>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {purchaseMessages.remainingAmount}
                </label>
                <input
                  type="text"
                  readOnly
                  value={formatCurrency(remainingAmount)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <FormSectionHeader
              eyebrow={purchaseMessages.notesEyebrow}
              title={purchaseMessages.notesTitle}
              description={purchaseMessages.notesDescription}
            />
            <div className="mt-5">
              <textarea
                name="notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={purchaseMessages.notesPlaceholder}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <FormStickyActions
            submitLabel={editingPurchase ? purchaseMessages.updateAction : purchaseMessages.saveAction}
            cancelHref="/purchases"
            helperText={purchaseMessages.stickyHelper}
          />
        </form>
      </section>

      <aside className="space-y-6">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
            {purchaseMessages.liveSummary}
          </div>
          <h3 className="mt-2 text-lg font-bold text-slate-900">{purchaseMessages.snapshotTitle}</h3>
          <p className="mt-1 text-sm text-slate-500">{purchaseMessages.snapshotSubtitle}</p>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {purchaseMessages.supplier}
              </div>
              <div className="mt-2 text-base font-semibold text-slate-900">{activeVendorLabel}</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {purchaseMessages.rawMaterials}
              </div>
              <div className="mt-2 space-y-1 text-base font-semibold text-slate-900">
                {items.some((item) => item.productName.trim()) ? (
                  items
                    .filter((item) => item.productName.trim())
                    .slice(0, 3)
                    .map((item, index) => (
                      <div key={`${item.productName}-${index}`}>{item.productName}</div>
                    ))
                ) : (
                  <div>{purchaseMessages.noMaterialEntered}</div>
                )}
                {items.filter((item) => item.productName.trim()).length > 3 ? (
                  <div className="text-sm font-medium text-slate-500">
                    +{items.filter((item) => item.productName.trim()).length - 3} more
                  </div>
                ) : null}
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{purchaseMessages.materialAmount}</span>
                <span className="font-semibold text-slate-900">{formatCurrency(itemAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{purchaseMessages.previouslyPaid}</span>
                <span className="font-semibold text-green-700">
                  {formatCurrency(previousPaidAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{purchaseMessages.payingNow}</span>
                <span className="font-semibold text-blue-600">
                  {formatCurrency(normalizedPaymentNow)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="font-semibold text-slate-900">{purchaseMessages.remainingAmount}</span>
                <span className="text-lg font-bold text-amber-700">
                  {formatCurrency(remainingAmount)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {editingPurchase && (
          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-50 p-6">
              <h3 className="text-lg font-bold text-slate-900">{purchaseMessages.paymentHistoryTitle}</h3>
              <p className="mt-1 text-xs text-slate-500">{purchaseMessages.paymentHistorySubtitle}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">{purchaseMessages.paymentDate}</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">{messages.print.method}</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">{messages.print.amount}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {purchasePayments.map((payment, index) => (
                    <tr
                      key={payment.id}
                      className={`transition-colors hover:bg-blue-50/40 ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      }`}
                    >
                      <td className="px-6 py-4 text-sm text-slate-600">{payment.payment_date}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{payment.payment_method}</td>
                      <td className="px-6 py-4 text-sm font-bold text-green-700">
                        {formatCurrency(payment.amount)}
                      </td>
                    </tr>
                  ))}
                  {purchasePayments.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-sm text-slate-500">
                        {purchaseMessages.noPaymentsYet}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}

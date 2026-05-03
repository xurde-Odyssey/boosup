"use client";

import { Package2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type ProductOption = {
  id: string;
  name: string;
  unit: string | null;
  sales_rate: number | null;
};

type ExistingOrderItem = {
  id?: string;
  product_id: string | null;
  product_name: string;
  quantity: number | null;
  unit_snapshot?: string | null;
  rate_snapshot?: number | null;
};

export type OrderItemRow = {
  productId: string;
  productName: string;
  quantity: string;
  unitSnapshot: string;
  rateSnapshot: string;
};

const createEmptyRow = (): OrderItemRow => ({
  productId: "",
  productName: "",
  quantity: "1",
  unitSnapshot: "",
  rateSnapshot: "",
});

const normalizeQuantity = (value: string) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "1";
  }

  return String(Math.max(Math.trunc(numericValue), 1));
};

const mapExistingItem = (item: ExistingOrderItem): OrderItemRow => ({
  productId: item.product_id ?? "",
  productName: item.product_name ?? "",
  quantity: String(item.quantity ?? 1),
  unitSnapshot: item.unit_snapshot?.trim() ?? "",
  rateSnapshot:
    item.rate_snapshot == null || Number.isNaN(Number(item.rate_snapshot))
      ? ""
      : String(item.rate_snapshot),
});

export function OrderItemsPicker({
  products,
  initialItems,
  onItemsChange,
  title,
  description,
  addLabel,
  removeLabel,
  emptyTitle,
  emptyDescription,
  itemLabel,
  productLabel,
  quantityLabel,
  unitLabel,
  rateLabel,
  selectPlaceholder,
}: {
  products: ProductOption[];
  initialItems: ExistingOrderItem[];
  onItemsChange?: (items: OrderItemRow[]) => void;
  title: string;
  description: string;
  addLabel: string;
  removeLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  itemLabel: string;
  productLabel: string;
  quantityLabel: string;
  unitLabel: string;
  rateLabel: string;
  selectPlaceholder: string;
}) {
  const [items, setItems] = useState<OrderItemRow[]>(
    initialItems.length > 0 ? initialItems.map(mapExistingItem) : [createEmptyRow()],
  );

  const activeRows = useMemo(
    () => items.filter((item) => item.productId.trim() || item.productName.trim()),
    [items],
  );

  const updateItem = (index: number, nextValue: Partial<OrderItemRow>) => {
    setItems((currentItems) => {
      const nextItems = currentItems.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...nextValue,
            }
          : item,
      );
      onItemsChange?.(nextItems);
      return nextItems;
    });
  };

  const addItem = () => {
    setItems((currentItems) => {
      const nextItems = [...currentItems, createEmptyRow()];
      onItemsChange?.(nextItems);
      return nextItems;
    });
  };

  const removeItem = (index: number) => {
    setItems((currentItems) => {
      const nextItems =
        currentItems.length === 1
          ? [createEmptyRow()]
          : currentItems.filter((_, itemIndex) => itemIndex !== index);
      onItemsChange?.(nextItems);
      return nextItems;
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          {addLabel}
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={`${index}-${item.productId}-${item.productName}`} className="rounded-2xl border border-slate-200 bg-white p-4">
            <input type="hidden" name="product_id" value={item.productId} />
            <input type="hidden" name="product_name" value={item.productName} />
            <input type="hidden" name="unit_snapshot" value={item.unitSnapshot} />
            <input type="hidden" name="rate_snapshot" value={item.rateSnapshot} />

            <div className="mb-4 flex items-center justify-between gap-3">
              <h5 className="text-sm font-semibold text-slate-900">
                {itemLabel} {index + 1}
              </h5>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
                {removeLabel}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.6fr)_140px_140px_160px]">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  {productLabel}
                </label>
                <select
                  name="product_select"
                  value={item.productId}
                  onChange={(event) => {
                    const nextProductId = event.target.value;
                    const nextProduct =
                      products.find((product) => product.id === nextProductId) ?? null;

                    updateItem(index, {
                      productId: nextProductId,
                      productName: nextProduct?.name ?? "",
                      unitSnapshot: nextProduct?.unit?.trim() ?? "",
                      rateSnapshot:
                        nextProduct?.sales_rate == null ? "" : String(nextProduct.sales_rate),
                    });
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  <option value="">{selectPlaceholder}</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  {quantityLabel}
                </label>
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(event) =>
                    updateItem(index, { quantity: normalizeQuantity(event.target.value) })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  {unitLabel}
                </label>
                <input
                  type="text"
                  readOnly
                  value={item.unitSnapshot || "-"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  {rateLabel}
                </label>
                <input
                  type="text"
                  readOnly
                  value={item.rateSnapshot || "-"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700 outline-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeRows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Package2 className="h-5 w-5" />
          </div>
          <div className="mt-3 text-sm font-semibold text-slate-900">{emptyTitle}</div>
          <p className="mt-1 text-sm text-slate-500">{emptyDescription}</p>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { ReceiptText, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { upsertOrder } from "@/app/actions";
import { OrderItemsPicker, type OrderItemRow } from "@/components/orders/OrderItemsPicker";
import { Card } from "@/components/shared/Card";
import { SectionCard } from "@/components/shared/SectionCard";

type ProductOption = {
  id: string;
  name: string;
  unit: string | null;
  sales_rate: number | null;
};

type EditingOrder = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  order_date: string;
  status: string;
  notes: string | null;
  order_items: {
    id?: string;
    product_id: string | null;
    product_name: string;
    quantity: number | null;
    unit_snapshot?: string | null;
    rate_snapshot?: number | null;
  }[];
};

type OrdersMessages = {
  editFormTitle: string;
  formTitle: string;
  formSubtitle: string;
  fields: {
    customerName: string;
    phone: string;
    orderDate: string;
    status: string;
    notes: string;
  };
  placeholders: {
    customerName: string;
    phone: string;
    notes: string;
  };
  itemCard: {
    title: string;
    description: string;
    add: string;
    remove: string;
    emptyTitle: string;
    emptyDescription: string;
    itemLabel: string;
    product: string;
    quantity: string;
    unit: string;
    rate: string;
    selectPlaceholder: string;
  };
  updateOrder: string;
  saveOrder: string;
  backToOrders: string;
  snapshot: {
    title: string;
    customer: string;
    phone: string;
    itemCount: string;
    totalQuantity: string;
    emptyCustomer: string;
    emptyPhone: string;
    createBillTitle: string;
    createBillDescription: string;
    createBillButton: string;
  };
};

export function OrderEntryWorkspace({
  editingOrder,
  products,
  todayDate,
  ordersMessages,
  statusLabels,
}: {
  editingOrder: EditingOrder | null;
  products: ProductOption[];
  todayDate: string;
  ordersMessages: OrdersMessages;
  statusLabels: Record<string, string>;
}) {
  const [customerName, setCustomerName] = useState(editingOrder?.customer_name ?? "");
  const [customerPhone, setCustomerPhone] = useState(editingOrder?.customer_phone ?? "");
  const [items, setItems] = useState<OrderItemRow[]>(
    editingOrder?.order_items?.length
      ? editingOrder.order_items.map((item) => ({
          productId: item.product_id ?? "",
          productName: item.product_name ?? "",
          quantity: String(item.quantity ?? 1),
          unitSnapshot: item.unit_snapshot?.trim() ?? "",
          rateSnapshot:
            item.rate_snapshot == null || Number.isNaN(Number(item.rate_snapshot))
              ? ""
              : String(item.rate_snapshot),
        }))
      : [],
  );

  const activeItems = useMemo(
    () => items.filter((item) => item.productName.trim() || item.productId.trim()),
    [items],
  );
  const totalQuantity = useMemo(
    () =>
      activeItems.reduce((sum, item) => {
        const quantity = Number(item.quantity);
        return sum + (Number.isFinite(quantity) ? quantity : 0);
      }, 0),
    [activeItems],
  );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <SectionCard>
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-900">
            {editingOrder ? ordersMessages.editFormTitle : ordersMessages.formTitle}
          </h3>
          <p className="text-sm text-slate-500">{ordersMessages.formSubtitle}</p>
        </div>

        <form action={upsertOrder} className="space-y-4">
          <input type="hidden" name="id" value={editingOrder?.id ?? ""} readOnly />
          <input type="hidden" name="redirect_to" value="/orders" readOnly />

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {ordersMessages.fields.customerName}
            </label>
            <input
              name="customer_name"
              type="text"
              required
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder={ordersMessages.placeholders.customerName}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {ordersMessages.fields.phone}
              </label>
              <input
                name="customer_phone"
                type="text"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder={ordersMessages.placeholders.phone}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {ordersMessages.fields.orderDate}
              </label>
              <input
                name="order_date"
                type="date"
                required
                defaultValue={editingOrder?.order_date ?? todayDate}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <OrderItemsPicker
            products={products}
            initialItems={editingOrder?.order_items ?? []}
            onItemsChange={setItems}
            title={ordersMessages.itemCard.title}
            description={ordersMessages.itemCard.description}
            addLabel={ordersMessages.itemCard.add}
            removeLabel={ordersMessages.itemCard.remove}
            emptyTitle={ordersMessages.itemCard.emptyTitle}
            emptyDescription={ordersMessages.itemCard.emptyDescription}
            itemLabel={ordersMessages.itemCard.itemLabel}
            productLabel={ordersMessages.itemCard.product}
            quantityLabel={ordersMessages.itemCard.quantity}
            unitLabel={ordersMessages.itemCard.unit}
            rateLabel={ordersMessages.itemCard.rate}
            selectPlaceholder={ordersMessages.itemCard.selectPlaceholder}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {ordersMessages.fields.status}
              </label>
              <select
                name="status"
                defaultValue={editingOrder?.status ?? "NEW"}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="NEW">{statusLabels.NEW}</option>
                <option value="PREPARING">{statusLabels.PREPARING}</option>
                <option value="DELIVERED">{statusLabels.DELIVERED}</option>
                <option value="CANCELLED">{statusLabels.CANCELLED}</option>
                <option value="CONVERTED">{statusLabels.CONVERTED}</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {ordersMessages.fields.notes}
              </label>
              <textarea
                name="notes"
                rows={3}
                defaultValue={editingOrder?.notes ?? ""}
                placeholder={ordersMessages.placeholders.notes}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row">
            <button className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
              {editingOrder ? ordersMessages.updateOrder : ordersMessages.saveOrder}
            </button>
            <Link
              href="/orders"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              {ordersMessages.backToOrders}
            </Link>
          </div>
        </form>
      </SectionCard>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{ordersMessages.snapshot.title}</h3>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {ordersMessages.snapshot.customer}
              </div>
              <div className="mt-2 font-semibold text-slate-900">
                {customerName.trim() || ordersMessages.snapshot.emptyCustomer}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {ordersMessages.snapshot.phone}
              </div>
              <div className="mt-2 font-semibold text-slate-900">
                {customerPhone.trim() || ordersMessages.snapshot.emptyPhone}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {ordersMessages.snapshot.itemCount}
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{activeItems.length}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {ordersMessages.snapshot.totalQuantity}
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{totalQuantity}</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {ordersMessages.snapshot.createBillTitle}
              </h3>
              <p className="text-sm text-slate-500">{ordersMessages.snapshot.createBillDescription}</p>
            </div>
          </div>

          <button
            type="button"
            disabled
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-500"
          >
            {ordersMessages.snapshot.createBillButton}
          </button>
        </Card>
      </div>
    </div>
  );
}

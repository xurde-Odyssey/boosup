type PurchaseItem = {
  name: string;
  quantityBought: string;
  purchaseAmount: string;
  billCount: number;
  lastBought: string;
};

export function TopPurchaseItemsTable({ items }: { items: PurchaseItem[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-50 p-6">
        <h3 className="text-lg font-bold text-slate-900">Top Purchase Items</h3>
        <div className="text-sm font-semibold text-amber-600">{items.length} items</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">Item Name</th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">Quantity Bought</th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">Purchase Amount</th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">Bills</th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">Last Bought</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item, index) => (
              <tr
                key={item.name}
                className={`transition-colors hover:bg-blue-50/25 ${
                  index % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                }`}
              >
                <td className="px-6 py-3.5 text-sm font-semibold text-slate-900">{item.name}</td>
                <td className="px-6 py-3.5 text-sm text-slate-600">{item.quantityBought}</td>
                <td className="px-6 py-3.5 text-sm font-bold text-slate-900">{item.purchaseAmount}</td>
                <td className="px-6 py-3.5 text-sm text-slate-600">{item.billCount}</td>
                <td className="px-6 py-3.5 text-sm text-slate-500">{item.lastBought}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                  No purchase items yet. This table will fill from real purchase item data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

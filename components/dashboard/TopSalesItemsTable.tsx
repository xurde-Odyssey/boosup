type SalesItem = {
  name: string;
  quantitySold: string;
  salesAmount: string;
  invoiceCount: number;
  lastSold: string;
};

export function TopSalesItemsTable({ items }: { items: SalesItem[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-50 p-6">
        <h3 className="text-lg font-bold text-slate-900">Top Sales Items</h3>
        <div className="text-sm font-semibold text-blue-600">{items.length} items</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">Item Name</th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">Quantity Sold</th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">Sales Amount</th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">Invoices</th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">Last Sold</th>
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
                <td className="px-6 py-3.5 text-sm text-slate-600">{item.quantitySold}</td>
                <td className="px-6 py-3.5 text-sm font-bold text-slate-900">{item.salesAmount}</td>
                <td className="px-6 py-3.5 text-sm text-slate-600">{item.invoiceCount}</td>
                <td className="px-6 py-3.5 text-sm text-slate-500">{item.lastSold}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                  No sales items yet. This table will fill from real sales item data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

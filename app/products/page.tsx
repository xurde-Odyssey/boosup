import Link from "next/link";
import { Boxes, PackagePlus, Pencil, RefreshCcw, ShoppingBag, Tag, Trash2 } from "lucide-react";
import { deleteProduct, upsertProduct } from "@/app/actions";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ActionNotice } from "@/components/shared/ActionNotice";
import { ConfirmActionForm } from "@/components/shared/ConfirmActionForm";
import { getSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/presentation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = getSupabaseClient();
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : "";
  const notice = typeof params.notice === "string" ? params.notice : "";

  const { data: products = [] } = await supabase
    .from("products")
    .select("id, code, name, category, sales_rate, unit, status, notes")
    .order("created_at", { ascending: false });

  const editingProduct = products.find((product) => product.id === editId) ?? null;
  const activeProducts = products.filter((product) => product.status === "ACTIVE").length;
  const draftProducts = products.filter((product) => product.status === "DRAFT").length;

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <Header
          title="Your Products"
          description="Create and manage products stored in Supabase for sales and purchases."
        />
        {notice && <ActionNotice message={notice} />}

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-500">Total Products</h3>
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <Boxes className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{products.length}</div>
            <p className="text-xs font-semibold text-blue-600">Products added manually</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-500">Sales Ready</h3>
              <div className="rounded-lg bg-green-50 p-2 text-green-600">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{activeProducts}</div>
            <p className="text-xs font-semibold text-green-600">Active for sales use</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-500">Draft Setup</h3>
              <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                <PackagePlus className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{draftProducts}</div>
            <p className="text-xs font-semibold text-slate-500">Draft products</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                {editingProduct ? "Update Product" : "Create Product"}
              </h3>
              <p className="text-sm text-slate-500">
                Product master setup persisted in Supabase.
              </p>
            </div>

            <form action={upsertProduct} className="space-y-4">
              <input type="hidden" name="id" defaultValue={editingProduct?.id ?? ""} />

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Product Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingProduct?.name ?? ""}
                  placeholder="Enter product name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Product Code</label>
                <input
                  name="code"
                  type="text"
                  required
                  defaultValue={editingProduct?.code ?? ""}
                  placeholder="PRD-001"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Sales Rate</label>
                <input
                  name="sales_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={editingProduct?.sales_rate ?? 0}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Category</label>
                  <input
                    name="category"
                    type="text"
                    defaultValue={editingProduct?.category ?? ""}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Unit</label>
                  <input
                    name="unit"
                    type="text"
                    defaultValue={editingProduct?.unit ?? "Piece"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
                <select
                  name="status"
                  defaultValue={editingProduct?.status ?? "ACTIVE"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Notes</label>
                <textarea
                  name="notes"
                  rows={4}
                  defaultValue={editingProduct?.notes ?? ""}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  <PackagePlus className="h-4 w-4" />
                  {editingProduct ? "Update Product" : "Save Product"}
                </button>
                {editingProduct && (
                  <Link
                    href="/products"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700"
                  >
                    Cancel
                  </Link>
                )}
              </div>
            </form>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-50 p-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Product Table</h3>
                <p className="mt-1 text-xs text-slate-500">Live product list from Supabase.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                <Tag className="h-4 w-4 text-slate-400" />
                {products.length} items
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Code</th>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Sales Rate</th>
                    <th className="px-6 py-4">Unit</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {products.map((product) => (
                    <tr key={product.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{product.code}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{product.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{product.category}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                        {formatCurrency(product.sales_rate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{product.unit}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold tracking-wider bg-slate-50 text-slate-700">
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/products?edit=${product.id}`}
                            className="rounded-lg p-2 text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/products?edit=${product.id}`}
                            className="rounded-lg p-2 text-slate-400 transition-all hover:bg-amber-50 hover:text-amber-600"
                            title="Update"
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </Link>
                          <ConfirmActionForm
                            action={deleteProduct}
                            confirmMessage="Are you sure you want to delete this product?"
                            hiddenFields={[{ name: "id", value: product.id }]}
                          >
                            <button
                              type="submit"
                              className="rounded-lg p-2 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </ConfirmActionForm>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                        No products added yet. Use the form to create your first product.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

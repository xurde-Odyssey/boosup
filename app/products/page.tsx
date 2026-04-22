import Link from "next/link";
import { Boxes, PackagePlus, Pencil, RefreshCcw, ShoppingBag, Tag, Trash2 } from "lucide-react";
import { deleteProduct, upsertProduct } from "@/app/actions";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ActionNotice } from "@/components/shared/ActionNotice";
import { ActionIconButton } from "@/components/shared/ActionIconButton";
import { ConfirmActionForm } from "@/components/shared/ConfirmActionForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { FieldHint } from "@/components/shared/FieldHint";
import { PageActionStrip } from "@/components/shared/PageActionStrip";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { SectionCard } from "@/components/shared/SectionCard";
import { LocalizedStatusBadge } from "@/components/shared/StatusBadge";
import { getMessages } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { getSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/presentation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const parsePage = (value: string | string[] | undefined) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};
const DEFAULT_PER_PAGE = 10;

const generateNextProductCode = (codes: string[]) => {
  const maxSequence = codes.reduce((maxValue, code) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized.startsWith("DS")) return maxValue;

    const numericPart = Number(normalized.slice(2));
    return Number.isFinite(numericPart) ? Math.max(maxValue, numericPart) : maxValue;
  }, 0);

  return `DS${String(maxSequence + 1).padStart(2, "0")}`;
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await getSupabaseClient();
  const params = await searchParams;
  const locale = await getServerLocale(params.lang);
  const messages = getMessages(locale);
  const productsMessages = messages.productsPage;
  const editId = typeof params.edit === "string" ? params.edit : "";
  const notice = typeof params.notice === "string" ? params.notice : "";
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status : "ALL";
  const sort = typeof params.sort === "string" ? params.sort : "code_asc";
  const currentPage = parsePage(params.page);
  const perPage = (() => {
    const rawValue =
      typeof params.perPage === "string" ? Number(params.perPage) : DEFAULT_PER_PAGE;
    return [10, 25, 50].includes(rawValue) ? rawValue : DEFAULT_PER_PAGE;
  })();

  const { data: products = [] } = await supabase
    .from("products")
    .select("id, code, name, category, sales_rate, unit, status, notes")
    .order("code", { ascending: true });

  const productRows = products ?? [];
  const editingProduct = productRows.find((product) => product.id === editId) ?? null;
  const nextProductCode = generateNextProductCode(productRows.map((product) => product.code));
  const activeProducts = productRows.filter((product) => product.status === "ACTIVE").length;
  const draftProducts = productRows.filter((product) => product.status === "DRAFT").length;
  const searchedProducts = search
    ? productRows.filter((product) => {
        const haystack = `${product.code} ${product.name} ${product.category} ${product.unit}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
    : productRows;
  const filteredProducts =
    status === "ALL"
      ? searchedProducts
      : searchedProducts.filter((product) => product.status === status);
  const sortedProducts = [...filteredProducts].sort((left, right) => {
    if (sort === "name_asc") {
      return left.name.localeCompare(right.name);
    }

    if (sort === "rate_desc") {
      return Number(right.sales_rate ?? 0) - Number(left.sales_rate ?? 0);
    }

    if (sort === "rate_asc") {
      return Number(left.sales_rate ?? 0) - Number(right.sales_rate ?? 0);
    }

    if (sort === "status_asc") {
      return left.status.localeCompare(right.status);
    }

    return left.code.localeCompare(right.code);
  });
  const totalPages = Math.max(Math.ceil(sortedProducts.length / perPage), 1);
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const visibleProducts = sortedProducts.slice(
    (safeCurrentPage - 1) * perPage,
    safeCurrentPage * perPage,
  );

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header
          title={productsMessages.title}
          description={productsMessages.subtitle}
        />
        {notice && <ActionNotice message={notice} />}
        <PageActionStrip
          actions={[
            {
              label: editingProduct ? productsMessages.updateProduct : productsMessages.createProduct,
              href: "#product-form",
            },
            { label: productsMessages.browseProductTable, href: "#product-table", variant: "secondary" },
          ]}
        />

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-500">{productsMessages.totalProducts}</h3>
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <Boxes className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{productRows.length}</div>
            <p className="text-xs font-semibold text-blue-600">{productsMessages.productsAddedManually}</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-500">{productsMessages.salesReady}</h3>
              <div className="rounded-lg bg-green-50 p-2 text-green-600">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{activeProducts}</div>
            <p className="text-xs font-semibold text-green-600">{productsMessages.activeForSalesUse}</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-500">{productsMessages.draftSetup}</h3>
              <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                <PackagePlus className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{draftProducts}</div>
            <p className="text-xs font-semibold text-slate-500">{productsMessages.draftProducts}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <SectionCard id="product-form">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                {editingProduct ? productsMessages.updateProduct : productsMessages.createProduct}
              </h3>
              <p className="text-sm text-slate-500">
                {productsMessages.formSubtitle}
              </p>
            </div>

            <form key={editingProduct?.id ?? "new-product"} action={upsertProduct} className="space-y-4">
              <input type="hidden" name="id" defaultValue={editingProduct?.id ?? ""} />
              <input
                type="hidden"
                name="code"
                value={editingProduct?.code ?? nextProductCode}
                readOnly
              />

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {productsMessages.productName}
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingProduct?.name ?? ""}
                  placeholder={productsMessages.productNamePlaceholder}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {productsMessages.productCode}
                </label>
                <input
                  type="text"
                  readOnly
                  value={editingProduct?.code ?? nextProductCode}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
                />
                <FieldHint>
                  {productsMessages.productCodeHint}
                </FieldHint>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {productsMessages.salesRate}
                </label>
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
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {productsMessages.category}
                  </label>
                  <input
                    name="category"
                    type="text"
                    defaultValue={editingProduct?.category ?? ""}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {productsMessages.unit}
                  </label>
                  <input
                    name="unit"
                    type="text"
                    defaultValue={editingProduct?.unit ?? "Piece"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {productsMessages.status}
                </label>
                <select
                  name="status"
                  defaultValue={editingProduct?.status ?? "ACTIVE"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  <option value="ACTIVE">{messages.status.ACTIVE}</option>
                  <option value="DRAFT">{messages.status.DRAFT}</option>
                  <option value="INACTIVE">{messages.status.INACTIVE}</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {productsMessages.notes}
                </label>
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
                  {editingProduct ? productsMessages.updateProduct : productsMessages.saveProduct}
                </button>
                {editingProduct && (
                  <Link
                    href="/products"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700"
                  >
                    {productsMessages.cancel}
                  </Link>
                )}
              </div>
            </form>
          </SectionCard>

          <SectionCard id="product-table" className="overflow-hidden" padded={false}>
            <div className="flex items-center justify-between border-b border-slate-50 p-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{productsMessages.productTable}</h3>
                <p className="mt-1 text-xs text-slate-500">{productsMessages.tableSubtitle}</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                <Tag className="h-4 w-4 text-slate-400" />
                {productRows.length} {productsMessages.items}
              </div>
            </div>

            <div className="border-b border-slate-50 p-6">
              <form action="/products" className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.7fr)_220px_220px_220px]">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                      {productsMessages.search}
                    </label>
                    <input
                      type="text"
                      name="q"
                      defaultValue={search}
                      placeholder={productsMessages.searchPlaceholder}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                      {productsMessages.status}
                    </label>
                    <select
                      name="status"
                      defaultValue={status}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    >
                      <option value="ALL">{productsMessages.all}</option>
                      <option value="ACTIVE">{messages.status.ACTIVE}</option>
                      <option value="DRAFT">{messages.status.DRAFT}</option>
                      <option value="INACTIVE">{messages.status.INACTIVE}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                      {productsMessages.sort}
                    </label>
                    <select
                      name="sort"
                      defaultValue={sort}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    >
                      <option value="code_asc">{productsMessages.code}</option>
                      <option value="name_asc">{productsMessages.name}</option>
                      <option value="rate_desc">{productsMessages.rateHighLow}</option>
                      <option value="rate_asc">{productsMessages.rateLowHigh}</option>
                      <option value="status_asc">{productsMessages.status}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                      {productsMessages.perPage}
                    </label>
                    <select
                      name="perPage"
                      defaultValue={String(perPage)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
                  >
                    {productsMessages.apply}
                  </button>
                  <Link
                    href="/products"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
                  >
                    {productsMessages.reset}
                  </Link>
                </div>
              </form>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">{productsMessages.code}</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">{productsMessages.product}</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">{productsMessages.category}</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">{productsMessages.salesRate}</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">{productsMessages.unit}</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">{productsMessages.status}</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4 text-right">
                      {productsMessages.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visibleProducts.map((product, index) => (
                    <tr
                      key={product.id}
                      className={`transition-colors hover:bg-blue-50/40 ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      }`}
                    >
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{product.code}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{product.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{product.category}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">
                        {formatCurrency(product.sales_rate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{product.unit}</td>
                      <td className="px-6 py-4">
                        <LocalizedStatusBadge
                          status={product.status}
                          locale={locale}
                          tone={
                            product.status === "ACTIVE"
                              ? "success"
                              : product.status === "DRAFT"
                                ? "warning"
                                : "neutral"
                          }
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <ActionIconButton
                            href={`/products?edit=${product.id}`}
                            label={`${productsMessages.editProduct} ${product.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </ActionIconButton>
                          <ActionIconButton
                            href={`/products?edit=${product.id}`}
                            label={`${productsMessages.openUpdateView} ${product.name}`}
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </ActionIconButton>
                          <ConfirmActionForm
                            action={deleteProduct}
                            confirmMessage={productsMessages.deleteConfirm}
                            hiddenFields={[{ name: "id", value: product.id }]}
                          >
                            <ActionIconButton type="submit" label={`${productsMessages.deleteProduct} ${product.name}`}>
                              <Trash2 className="h-4 w-4" />
                            </ActionIconButton>
                          </ConfirmActionForm>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10">
                        <EmptyState
                          icon={PackagePlus}
                          title={productsMessages.emptyTitle}
                          description={productsMessages.emptyDescription}
                          actionLabel={productsMessages.createProduct}
                          actionHref="#product-form"
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationControls
              basePath="/products"
              pageParam="page"
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={sortedProducts.length}
              pageSize={perPage}
              searchParams={params}
            />
          </SectionCard>
        </div>
      </main>
    </div>
  );
}

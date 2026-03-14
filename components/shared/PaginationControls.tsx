import Link from "next/link";

type QueryValue = string | string[] | undefined;

const buildHref = ({
  basePath,
  pageParam,
  page,
  searchParams,
}: {
  basePath: string;
  pageParam: string;
  page: number;
  searchParams?: Record<string, QueryValue>;
}) => {
  const query = new URLSearchParams();

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value === undefined || key === pageParam) return;

    if (Array.isArray(value)) {
      value.forEach((entry) => query.append(key, entry));
      return;
    }

    query.set(key, value);
  });

  if (page > 1) {
    query.set(pageParam, String(page));
  }

  const queryString = query.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
};

export function PaginationControls({
  basePath,
  pageParam,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  searchParams,
}: {
  basePath: string;
  pageParam: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  searchParams?: Record<string, QueryValue>;
}) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
      <div className="text-sm text-slate-500">
        Showing {startItem}-{endItem} of {totalItems}
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={buildHref({
            basePath,
            pageParam,
            page: Math.max(currentPage - 1, 1),
            searchParams,
          })}
          aria-disabled={currentPage === 1}
          className={`inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold ${
            currentPage === 1
              ? "pointer-events-none border-slate-100 text-slate-300"
              : "border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          Previous
        </Link>
        <div className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
          Page {currentPage} / {totalPages}
        </div>
        <Link
          href={buildHref({
            basePath,
            pageParam,
            page: Math.min(currentPage + 1, totalPages),
            searchParams,
          })}
          aria-disabled={currentPage === totalPages}
          className={`inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold ${
            currentPage === totalPages
              ? "pointer-events-none border-slate-100 text-slate-300"
              : "border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          Next
        </Link>
      </div>
    </div>
  );
}

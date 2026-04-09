"use client";

import { createPortal } from "react-dom";
import { useCallback, useSyncExternalStore } from "react";
import { Printer } from "lucide-react";
import {
  PrintDocument,
  PrintHeader,
  PrintSectionTitle,
  PRINT_TABLE_BODY_CLASS,
  PRINT_TABLE_HEAD_ROW_CLASS,
  PRINT_TABLE_WRAP_CLASS,
} from "@/components/shared/PrintDocument";
import { CompanySettings, DEFAULT_COMPANY_SETTINGS } from "@/lib/company-settings";
import { type AppLocale, getMessages } from "@/lib/i18n";
import { formatBsDisplayDate } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";
import { cn } from "@/lib/utils";

type VendorPayment = {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  purchases?: {
    purchase_number?: string | null;
  } | null;
};

type PrintableVendor = {
  name: string;
  vendor_code: string | null;
  contact_person: string | null;
  phone: string | null;
  address: string | null;
  totalPurchase: number;
  totalPaid: number;
  totalPayable: number;
  totalBills: number;
  lastPurchaseDate: string | null;
  payments: VendorPayment[];
};

export function VendorPrintPreview({
  vendor,
  label = "Print Supplier Statement",
  className,
  company = DEFAULT_COMPANY_SETTINGS,
  iconOnly = false,
  locale = "en",
}: {
  vendor: PrintableVendor;
  label?: string;
  className?: string;
  company?: CompanySettings;
  iconOnly?: boolean;
  locale?: AppLocale;
}) {
  const messages = getMessages(locale);
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const handlePrint = useCallback(() => {
    document.body.classList.add("invoice-print-active");
    const previousTitle = document.title;
    document.title = `${vendor.name} Statement`;

    const handleAfterPrint = () => {
      document.body.classList.remove("invoice-print-active");
      document.title = previousTitle;
      window.removeEventListener("afterprint", handleAfterPrint);
    };

    window.addEventListener("afterprint", handleAfterPrint);
    window.print();
  }, [vendor.name]);

  return (
    <>
      <button
        type="button"
        onClick={handlePrint}
        title={label}
        aria-label={label}
        className={cn(
          iconOnly
            ? "group relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-900 hover:text-white"
            : "inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800",
          className ?? "",
        )}
      >
        <Printer className="h-4 w-4" />
        {!iconOnly ? label : null}
      </button>

      {isMounted &&
        createPortal(
          <PrintDocument root="supplier-statement" locale={locale}>
            <PrintHeader
              title={messages.print.supplierStatement}
              company={company}
              metaRows={[
                { label: messages.print.supplier, value: vendor.name },
                { label: messages.print.code, value: vendor.vendor_code || "-" },
                { label: messages.print.bills, value: String(vendor.totalBills) },
              ]}
            />

            <div className="grid grid-cols-2 gap-4 border-b border-slate-200 py-4 text-sm">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                  {messages.print.contactPerson}
                </div>
                <div className="mt-1 font-semibold text-slate-900">{vendor.contact_person || "-"}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                  {messages.print.phone}
                </div>
                <div className="mt-1 font-semibold text-slate-900">{vendor.phone || "-"}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                  {messages.print.address}
                </div>
                <div className="mt-1 font-semibold text-slate-900">{vendor.address || "-"}</div>
              </div>
            </div>

            <div className="py-4">
              <PrintSectionTitle>{messages.print.supplierTotals}</PrintSectionTitle>
              <div className={PRINT_TABLE_WRAP_CLASS}>
                <table className="w-full text-left">
                  <thead>
                    <tr className={PRINT_TABLE_HEAD_ROW_CLASS}>
                      <th className="px-3 py-2">{messages.print.totalPurchase}</th>
                      <th className="px-3 py-2">{messages.print.totalPaid}</th>
                      <th className="px-3 py-2">{messages.print.remainingToPay}</th>
                      <th className="px-3 py-2">{messages.print.lastPurchase}</th>
                    </tr>
                  </thead>
                  <tbody className={PRINT_TABLE_BODY_CLASS}>
                    <tr>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {formatCurrency(vendor.totalPurchase)}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-green-700">
                        {formatCurrency(vendor.totalPaid)}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-amber-700">
                        {formatCurrency(vendor.totalPayable)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {formatBsDisplayDate(vendor.lastPurchaseDate)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-slate-200 py-4">
              <PrintSectionTitle>{messages.print.paymentHistory}</PrintSectionTitle>
              <div className={PRINT_TABLE_WRAP_CLASS}>
                <table className="w-full text-left">
                  <thead>
                    <tr className={PRINT_TABLE_HEAD_ROW_CLASS}>
                      <th className="px-3 py-2">{messages.print.date}</th>
                      <th className="px-3 py-2">{messages.print.bill}</th>
                      <th className="px-3 py-2">{messages.print.method}</th>
                      <th className="px-3 py-2 text-right">{messages.print.amount}</th>
                    </tr>
                  </thead>
                  <tbody className={PRINT_TABLE_BODY_CLASS}>
                    {vendor.payments.length > 0 ? (
                      vendor.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-3 py-2.5 text-slate-700">
                            {formatBsDisplayDate(payment.payment_date)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">
                            {payment.purchases?.purchase_number ?? "-"}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">{payment.payment_method}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                            {formatCurrency(payment.amount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                          {messages.print.noPaymentHistory}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </PrintDocument>,
          document.body,
        )}
    </>
  );
}

import { enMessages } from "@/messages/en";
import { neMessages } from "@/messages/ne";

export type AppLocale = "en" | "ne";
export const LANGUAGE_KEY = "bookkeep-language";
export const LANGUAGE_COOKIE = "bookkeep-language";

const messagesByLocale = {
  en: enMessages,
  ne: neMessages,
} as const;

export const resolveLocale = (value: string | string[] | undefined): AppLocale => {
  const locale = Array.isArray(value) ? value[0] : value;
  if (locale === "ne" || locale === "nep") return "ne";
  return "en";
};

export const getMessages = (locale: AppLocale = "en") => messagesByLocale[locale];

export const getStatusLabel = (status: string, locale: AppLocale = "en") => {
  const messages = getMessages(locale);
  return messages.status[status as keyof typeof messages.status] ?? status;
};

export const getStaffMonthName = (month: number, locale: AppLocale = "en") => {
  const messages = getMessages(locale);
  return messages.months[month as keyof typeof messages.months] ?? `Month ${month}`;
};

export const getStaffMonthLabel = (
  month: number,
  year?: number,
  locale: AppLocale = "en",
) => {
  const monthName = getStaffMonthName(month, locale);
  return typeof year === "number" ? `${monthName} ${year}` : monthName;
};

export const getStoredLocale = () => {
  if (typeof window === "undefined") {
    return "en" as AppLocale;
  }

  return resolveLocale(window.localStorage.getItem(LANGUAGE_KEY) ?? undefined);
};

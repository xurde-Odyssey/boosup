import { formatBsDisplayDate, getNepalTodayAd } from "@/lib/nepali-date";

export type ReportRangeKey = "week" | "month" | "year" | "custom";

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

const addDays = (isoDate: string, days: number) => {
  const current = new Date(`${isoDate}T00:00:00Z`);
  current.setUTCDate(current.getUTCDate() + days);
  return toIsoDate(current);
};

const getWeekRange = (baseDateIso: string) => {
  const current = new Date(`${baseDateIso}T00:00:00Z`);
  const day = current.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(current);
  start.setUTCDate(current.getUTCDate() - diff);
  const startDateISO = toIsoDate(start);
  const endDateISOExclusive = addDays(startDateISO, 7);

  return {
    startDateISO,
    endDateISOExclusive,
    endDateISOInclusive: addDays(endDateISOExclusive, -1),
  };
};

const getMonthRange = (baseDateIso: string) => {
  const current = new Date(`${baseDateIso}T00:00:00Z`);
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth();
  const startDateISO = toIsoDate(new Date(Date.UTC(year, month, 1)));
  const endDateISOExclusive = toIsoDate(new Date(Date.UTC(year, month + 1, 1)));

  return {
    startDateISO,
    endDateISOExclusive,
    endDateISOInclusive: addDays(endDateISOExclusive, -1),
  };
};

const getYearRange = (baseDateIso: string) => {
  const current = new Date(`${baseDateIso}T00:00:00Z`);
  const year = current.getUTCFullYear();
  const startDateISO = `${year}-01-01`;
  const endDateISOExclusive = `${year + 1}-01-01`;

  return {
    startDateISO,
    endDateISOExclusive,
    endDateISOInclusive: addDays(endDateISOExclusive, -1),
  };
};

const getCustomRange = (fromIso: string, toIso: string) => {
  const startDateISO = fromIso <= toIso ? fromIso : toIso;
  const endDateISOInclusive = fromIso <= toIso ? toIso : fromIso;
  const endDateISOExclusive = addDays(endDateISOInclusive, 1);

  return {
    startDateISO,
    endDateISOExclusive,
    endDateISOInclusive,
  };
};

export function getReportRangeSelection(
  range: string | undefined,
  options?: {
    todayIso?: string;
    fromIso?: string;
    toIso?: string;
  },
) {
  const selectedRange: ReportRangeKey =
    range === "week" || range === "month" || range === "custom" ? range : "year";
  const todayIso = options?.todayIso ?? getNepalTodayAd();

  const resolved =
    selectedRange === "week"
      ? getWeekRange(todayIso)
      : selectedRange === "month"
        ? getMonthRange(todayIso)
        : selectedRange === "custom"
          ? getCustomRange(options?.fromIso || todayIso, options?.toIso || options?.fromIso || todayIso)
          : getYearRange(todayIso);

  return {
    selectedRange,
    startDateISO: resolved.startDateISO,
    endDateISOExclusive: resolved.endDateISOExclusive,
    endDateISOInclusive: resolved.endDateISOInclusive,
    displayLabel: `${formatBsDisplayDate(resolved.startDateISO)} - ${formatBsDisplayDate(
      resolved.endDateISOInclusive,
    )}`,
  };
}

export const isDateInRange = (
  value: string | null | undefined,
  startDateISO: string,
  endDateISOExclusive: string,
) => {
  if (!value) return false;
  return value >= startDateISO && value < endDateISOExclusive;
};


import { ADtoBS, BStoAD } from "nepali-date-library";

export const normalizeBsDate = (value: string) =>
  value.trim().replace(/[./]/g, "-").replace(/-+/g, "-");

export const getBsDateParts = (value: string) => {
  const normalized = normalizeBsDate(value);
  const [yearRaw, monthRaw, dayRaw] = normalized.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  return {
    year: Number.isFinite(year) ? year : 0,
    month: Number.isFinite(month) ? month : 0,
    day: Number.isFinite(day) ? day : 0,
  };
};

export const formatBsDate = (value: string) => normalizeBsDate(value).replace(/-/g, "/");

export const adToBs = (adDate: string) => {
  if (!adDate) return "";

  try {
    return formatBsDate(ADtoBS(adDate));
  } catch {
    return "";
  }
};

export const bsToAd = (bsDate: string) => {
  const normalized = normalizeBsDate(bsDate);
  if (!normalized) return "";

  try {
    return BStoAD(normalized);
  } catch {
    return "";
  }
};

export const formatBsDisplayDate = (adDate: string | null | undefined) => {
  if (!adDate) return "-";
  return adToBs(adDate) || adDate;
};

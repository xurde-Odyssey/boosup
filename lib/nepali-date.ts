import { ADtoBS, BStoAD } from "nepali-date-library";

export const normalizeBsDate = (value: string) =>
  value.trim().replace(/[./]/g, "-").replace(/-+/g, "-");

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

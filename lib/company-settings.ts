export type CompanySettings = {
  id?: string;
  businessName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoPath: string;
  faviconPath: string;
};

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  businessName: "Dipak Suppliers",
  address: "Urlabari 07, Nepal",
  phone: "",
  email: "suppliersdipak@gmail.com",
  website: "www.dipaksuppliers.com.np",
  logoPath: "/logos/logo.png",
  faviconPath: "/logos/book.ico",
};

export const normalizeCompanyAssetPath = (value: string | null | undefined, fallback: string) => {
  if (!value) return fallback;
  if (value.startsWith("/app/logos/")) {
    return value.replace("/app/logos/", "/logos/");
  }
  return value;
};

export const buildCompanySettings = (
  row?: {
    id?: string;
    business_name?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    logo_path?: string | null;
    favicon_path?: string | null;
  } | null,
): CompanySettings => ({
  id: row?.id,
  businessName: row?.business_name || DEFAULT_COMPANY_SETTINGS.businessName,
  address: row?.address || DEFAULT_COMPANY_SETTINGS.address,
  phone: row?.phone || DEFAULT_COMPANY_SETTINGS.phone,
  email: row?.email || DEFAULT_COMPANY_SETTINGS.email,
  website: row?.website || DEFAULT_COMPANY_SETTINGS.website,
  logoPath: normalizeCompanyAssetPath(
    row?.logo_path,
    DEFAULT_COMPANY_SETTINGS.logoPath,
  ),
  faviconPath: normalizeCompanyAssetPath(
    row?.favicon_path,
    DEFAULT_COMPANY_SETTINGS.faviconPath,
  ),
});

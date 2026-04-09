import { cookies } from "next/headers";
import { resolveLocale } from "@/lib/i18n";

export const getServerLocale = async (value?: string | string[] | undefined) => {
  const explicitValue = Array.isArray(value) ? value[0] : value;
  if (explicitValue != null) {
    return resolveLocale(explicitValue);
  }

  const cookieStore = await cookies();
  return resolveLocale(cookieStore.get("bookkeep-language")?.value);
};

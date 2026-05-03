import { SidebarClient } from "@/components/dashboard/SidebarClient";
import { getServerLocale } from "@/lib/i18n-server";

export async function Sidebar() {
  const locale = await getServerLocale();

  return <SidebarClient initialLocale={locale} />;
}

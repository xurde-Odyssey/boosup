import { buildCompanySettings } from "@/lib/company-settings";
import { getSupabaseClient } from "@/lib/supabase/server";

export async function getCompanySettings() {
  const supabase = await getSupabaseClient();
  const settingsResponse = await supabase
    .from("company_settings")
    .select("id, business_name, address, phone, email, website, logo_path, favicon_path")
    .order("created_at", { ascending: true })
    .limit(1);

  const settingsRows = settingsResponse.data ?? [];
  return buildCompanySettings(settingsRows[0] ?? null);
}

import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LegacyCreateVendorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : "";

  redirect(editId ? `/vendors/create?edit=${editId}` : "/vendors/create");
}

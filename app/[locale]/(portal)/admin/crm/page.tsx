import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ locale: string }>;
};

// Bare "/admin/crm" has no page of its own (only /admin/crm/dashboard and
// /admin/crm/agent/[id] do) -- anything landing here (a typed URL, an old
// bookmark, a callbackUrl built from a partial path) 404'd instead of
// reaching the actual dashboard. Mirrors the legacy "/admin" -> "/admin/
// dashboard" redirect in proxy.ts's isRootAdminPath.
export default async function AdminCrmIndexPage({ params }: PageProps) {
  const { locale } = await params;
  redirect(`/${locale}/admin/crm/dashboard`);
}

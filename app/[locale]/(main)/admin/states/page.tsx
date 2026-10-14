import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ locale: string }> };

/** The state nomination admin moved to the role-based CRM admin (real user identity for the audit log): /admin/crm/states. */
export default async function LegacyStatesConfigPage({ params }: PageProps) {
  const { locale } = await params;
  redirect(`/${locale}/admin/crm/states`);
}

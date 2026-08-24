import { redirect } from "next/navigation";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { AdminToolsForm } from "./admin-tools-form";

type AdminToolsPageProps = {
  params: Promise<{ locale: string }>;
};

// Previously gated by a `?ADMIN_TOKEN=` query-string param -- a secret in
// the URL leaks into browser history, server/proxy access logs, and any
// outbound link's Referer header. Now uses the same signed, server-side-
// verified session cookie (lib/admin-auth.ts) as the rest of the legacy
// admin area, consistent with /admin/leads, /admin/agents, etc.
export default async function AdminToolsPage({ params }: AdminToolsPageProps) {
  const { locale } = await params;

  if (!(await isAdminAuthenticated())) {
    const target = `/${locale}/admin-tools`;
    const accessUrl = locale === "en" ? "/admin/leads/access" : `/${locale}/admin/leads/access`;
    redirect(`${accessUrl}?callbackUrl=${encodeURIComponent(target)}`);
  }

  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell max-w-2xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin Tools</p>
          <h1 className="text-3xl font-bold">
            {isTr
              ? "Yonetici Araclari"
              : isZh
                ? "管理工具"
                : "Admin Utilities"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isTr
              ? "Bu arac, belirli bir e-posta icin full-check rapor limitini sifirlar."
              : isZh
                ? "此工具可重置指定邮箱的 full-check 报告次数限制。"
                : "Use this utility to reset full-check report limits for a specific email."}
          </p>
        </div>

        <AdminToolsForm locale={locale} />
      </section>
    </main>
  );
}

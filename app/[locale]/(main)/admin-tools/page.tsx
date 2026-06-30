import { redirect } from "next/navigation";

import { AdminToolsForm } from "./admin-tools-form";

type AdminToolsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ADMIN_TOKEN?: string }>;
};

export default async function AdminToolsPage({ params, searchParams }: AdminToolsPageProps) {
  const { locale } = await params;
  const { ADMIN_TOKEN } = await searchParams;

  const configuredAdminToken = process.env.ADMIN_TOKEN?.trim();
  if (configuredAdminToken && ADMIN_TOKEN?.trim() !== configuredAdminToken) {
    redirect(locale === "en" ? "/" : `/${locale}`);
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

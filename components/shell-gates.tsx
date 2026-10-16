"use client";

import { Header } from "@/components/header";
import { PreFooterCta } from "@/components/pre-footer-cta";
import { GlobalDisclaimerFooter } from "@/components/global-disclaimer-footer";
import { usePathname } from "next/navigation";
import { publicPath } from "@/lib/seo/urls";

/**
 * ShellHeaderGate — now simply renders the unified Header on every page.
 * The landing page no longer has a separate header; this is the single
 * source of truth for the site-wide navigation.
 */
export function ShellHeaderGate({
  locale,
  showAdmin,
}: {
  locale: string;
  showAdmin: boolean;
}) {
  return <Header locale={locale} showAdmin={showAdmin} />;
}

export function ShellFooterGate({ locale }: { locale: string }) {
  const pathname = usePathname();
  const homePaths = [publicPath(locale, "/"), `/${locale}`];
  if (homePaths.includes(pathname?.replace(/\/$/, "") || "/")) return null;
  return (
    <>
      <PreFooterCta locale={locale} />
      <GlobalDisclaimerFooter />
    </>
  );
}

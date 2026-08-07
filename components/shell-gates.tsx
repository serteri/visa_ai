"use client";

import { usePathname } from "next/navigation";

import { Header } from "@/components/header";
import { PreFooterCta } from "@/components/pre-footer-cta";
import { GlobalDisclaimerFooter } from "@/components/global-disclaimer-footer";

const HOMEPAGE_PATHS = new Set(["/", "/tr", "/zh-Hans"]);

function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

function isHomepage(pathname: string): boolean {
  return HOMEPAGE_PATHS.has(normalizePath(pathname));
}

/**
 * The homepage renders its own landing header/footer (components/landing/),
 * so the global site chrome is suppressed there. `ShellHeaderGate` /
 * `ShellFooterGate` read the current pathname and return null on the
 * homepage, keeping the shared (main) layout untouched for every other page.
 */
export function ShellHeaderGate({
  locale,
  showAdmin,
}: {
  locale: string;
  showAdmin: boolean;
}) {
  const pathname = usePathname();
  if (isHomepage(pathname)) return null;
  return <Header locale={locale} showAdmin={showAdmin} />;
}

export function ShellFooterGate({ locale }: { locale: string }) {
  const pathname = usePathname();
  if (isHomepage(pathname)) return null;
  return (
    <>
      <PreFooterCta locale={locale} />
      <GlobalDisclaimerFooter />
    </>
  );
}

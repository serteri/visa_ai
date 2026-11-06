"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  analyticsUrlDecision,
  CONSENT_COOKIE,
  CONSENT_STORAGE_KEY,
  consentCookieValue,
  isQaCookie,
  makeConsent,
  parseConsent,
  PRODUCTION_ANALYTICS_HOSTS,
  QA_COOKIE,
  readCookie,
  resolveAnalyticsVendors,
  type ConsentState,
} from "@/lib/analytics/policy";
import { researchText } from "@/lib/marketing/research-journey";
import { publicPath } from "@/lib/seo/urls";

/**
 * Consent for the one non-essential tag: Google Analytics. Nothing else on the site depends on it. Until a choice is stored the tag does not load
 * (components/analytics/analytics-provider.tsx), and "Essential only" keeps it off. The banner appears only where the tag could load (a production deployment
 * on a production host), never on private pages, and never in a QA session.
 */

const OPEN_EVENT = "lv:open-consent";

/** A value that only the browser knows (host, cookies): false on the server and during hydration, then the real value, without setting state in an effect. */
const noSubscription = () => () => {};
const subscribeToConsent = (notify: () => void) => {
  window.addEventListener("lv:consent", notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener("lv:consent", notify);
    window.removeEventListener("storage", notify);
  };
};
const storedChoice = (): boolean => {
  try {
    return Boolean(parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY)));
  } catch {
    return false;
  }
};

function storeConsent(c: ConsentState) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(c));
  } catch {
    /* storage unavailable: the choice then lasts for this page only */
  }
  document.cookie = `${CONSENT_COOKIE}=${consentCookieValue(c)}; path=/; max-age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
  window.dispatchEvent(new Event("lv:consent"));
}

export function ConsentBanner({ locale, vercelEnv, gaId, testGaId, testMode }: { locale: string; vercelEnv?: string; gaId?: string; testGaId?: string; testMode?: boolean }) {
  const pathname = usePathname();
  const [reopened, setReopened] = useState(false);
  const hasChoice = useSyncExternalStore(subscribeToConsent, storedChoice, () => true);
  const [answered, setAnswered] = useState(false); // storage unavailable: the choice then lasts for this page only
  const open = (!hasChoice && !answered) || reopened;
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);

  const available = useSyncExternalStore(
    noSubscription,
    () => {
      const vendors = resolveAnalyticsVendors({ hostname: window.location.hostname, vercelEnv, gaId, testGaId, testMode });
      return Boolean(vendors.gaId && !isQaCookie(readCookie(document.cookie, QA_COOKIE)));
    },
    () => false,
  );

  useEffect(() => {
    if (!available) return;
    const reopen = () => setReopened(true);
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, [available]);

  const decision = typeof window === "undefined" ? null : analyticsUrlDecision(window.location.href);
  if (!available || !open || (decision && decision.kind !== "allow")) return null;
  void pathname; // re-evaluated on navigation

  const choose = (a: boolean) => {
    storeConsent(makeConsent(a));
    setAnswered(true);
    setReopened(false);
  };
  const btn = "inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2";

  return (
    <div role="dialog" aria-modal="false" aria-labelledby="lv-consent-title" data-consent-banner className="fixed bottom-4 left-4 right-4 z-[60] max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-2xl sm:right-auto">
      <h2 id="lv-consent-title" className="text-base font-bold text-slate-900">
        {t("Analytics cookies", "Analiz çerezleri", "分析 Cookie")}
      </h2>
      <p className="mt-2">
        {t(
          "We would like to use Google Analytics to understand how the site is used. It is not needed for the site to work. We do not send your name, email, answers or report links to it. You can change your choice at any time with “Privacy choices” in the footer.",
          "Siteyi nasıl kullandığınızı anlamak için Google Analytics'i kullanmak istiyoruz. Sitenin çalışması için gerekli değildir. Adınızı, e-postanızı, yanıtlarınızı veya rapor bağlantılarınızı ona göndermeyiz. Seçiminizi istediğiniz zaman alt bilgideki “Gizlilik tercihleri” ile değiştirebilirsiniz.",
          "我们希望使用 Google Analytics 了解网站的使用情况。它不是网站运行所必需的。我们不会向它发送您的姓名、邮箱、答案或报告链接。您可以随时通过页脚的“隐私选择”更改选择。",
        )}{" "}
        <Link href={publicPath(locale, "/privacy")} className="font-medium text-cyan-900 underline underline-offset-4">
          {t("Privacy information", "Gizlilik bilgileri", "隐私信息")}
        </Link>
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => choose(true)} className={`${btn} bg-cyan-900 text-white hover:bg-cyan-800`}>
          {t("Accept analytics", "Analitiği kabul et", "接受分析")}
        </button>
        <button type="button" onClick={() => choose(false)} className={`${btn} border border-slate-300 text-slate-800 hover:bg-slate-50`}>
          {t("Essential only", "Yalnızca gerekli olanlar", "仅必要项")}
        </button>
      </div>
    </div>
  );
}

/** "Privacy choices" link for the footers; renders only where a tag could load. */
export function ConsentSettingsLink({ locale, className }: { locale: string; className?: string }) {
  const show = useSyncExternalStore(
    noSubscription,
    () => (PRODUCTION_ANALYTICS_HOSTS as readonly string[]).includes(window.location.hostname),
    () => false,
  );
  if (!show) return null;
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} className={className ?? "inline-block font-medium text-foreground/70 underline underline-offset-2 hover:text-foreground"} data-consent-settings>
      {researchText(locale, "Privacy choices", "Gizlilik tercihleri", "隐私选择")}
    </button>
  );
}

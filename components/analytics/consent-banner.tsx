"use client";

import { useEffect, useState } from "react";
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
 * Consent for the two non-essential tags: Google Analytics ("analytics") and the Meta Pixel ("advertising measurement"). Nothing else on the site depends on
 * it. Until a choice is stored neither tag loads (components/analytics/analytics-provider.tsx), and "Essential only" keeps both off. The banner appears only
 * where a tag could load (a production deployment on a production host), never on private pages, and never in a QA session.
 */

const OPEN_EVENT = "lv:open-consent";

function storeConsent(c: ConsentState) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(c));
  } catch {
    /* storage unavailable: the choice then lasts for this page only */
  }
  document.cookie = `${CONSENT_COOKIE}=${consentCookieValue(c)}; path=/; max-age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
  window.dispatchEvent(new Event("lv:consent"));
}

export function ConsentBanner({ locale, vercelEnv, gaId, pixelId, testGaId, testMode }: { locale: string; vercelEnv?: string; gaId?: string; pixelId?: string; testGaId?: string; testMode?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(false);
  const [customise, setCustomise] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);

  useEffect(() => {
    const vendors = resolveAnalyticsVendors({ hostname: window.location.hostname, vercelEnv, gaId, pixelId, testGaId, testMode });
    const usable = (vendors.gaId || vendors.pixelId) && !isQaCookie(readCookie(document.cookie, QA_COOKIE));
    setAvailable(Boolean(usable));
    if (!usable) return;
    const stored = parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
    if (stored) {
      setAnalytics(stored.analytics);
      setMarketing(stored.marketing);
    } else setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, [vercelEnv, gaId, pixelId, testGaId, testMode]);

  const decision = typeof window === "undefined" ? null : analyticsUrlDecision(window.location.href);
  if (!available || !open || (decision && decision.kind !== "allow")) return null;
  void pathname; // re-evaluated on navigation

  const choose = (a: boolean, m: boolean) => {
    storeConsent(makeConsent(a, m));
    setAnalytics(a);
    setMarketing(m);
    setOpen(false);
    setCustomise(false);
  };
  const btn = "inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2";

  return (
    <div role="dialog" aria-modal="false" aria-labelledby="lv-consent-title" data-consent-banner className="fixed bottom-4 left-4 right-4 z-[60] max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-2xl sm:right-auto">
      <h2 id="lv-consent-title" className="text-base font-bold text-slate-900">
        {t("Analytics and advertising cookies", "Analiz ve reklam çerezleri", "分析与广告 Cookie")}
      </h2>
      <p className="mt-2">
        {t(
          "We would like to use Google Analytics to understand how the site is used, and the Meta Pixel to measure our advertising. Neither is needed for the site to work. We do not send your name, email, answers or report links to either. You can change your choice at any time with “Privacy choices” in the footer.",
          "Siteyi nasıl kullandığınızı anlamak için Google Analytics'i, reklamlarımızı ölçmek için Meta Pixel'i kullanmak istiyoruz. İkisi de sitenin çalışması için gerekli değildir. Adınızı, e-postanızı, yanıtlarınızı veya rapor bağlantılarınızı hiçbirine göndermeyiz. Seçiminizi istediğiniz zaman alt bilgideki “Gizlilik tercihleri” ile değiştirebilirsiniz.",
          "我们希望使用 Google Analytics 了解网站的使用情况，并使用 Meta Pixel 衡量我们的广告效果。两者都不是网站运行所必需的。我们不会向它们发送您的姓名、邮箱、答案或报告链接。您可以随时通过页脚的“隐私选择”更改选择。",
        )}{" "}
        <Link href={publicPath(locale, "/legal")} className="font-medium text-cyan-900 underline underline-offset-4">
          {t("Privacy information", "Gizlilik bilgileri", "隐私信息")}
        </Link>
      </p>
      {customise && (
        <div className="mt-3 space-y-2">
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-1" />
            <span>{t("Analytics (Google Analytics)", "Analiz (Google Analytics)", "分析（Google Analytics）")}</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-1" />
            <span>{t("Advertising measurement (Meta Pixel)", "Reklam ölçümü (Meta Pixel)", "广告效果衡量（Meta Pixel）")}</span>
          </label>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => choose(true, true)} className={`${btn} bg-cyan-900 text-white hover:bg-cyan-800`}>
          {t("Accept all", "Tümünü kabul et", "全部接受")}
        </button>
        <button type="button" onClick={() => choose(false, false)} className={`${btn} border border-slate-300 text-slate-800 hover:bg-slate-50`}>
          {t("Essential only", "Yalnızca gerekli olanlar", "仅必要项")}
        </button>
        {customise ? (
          <button type="button" onClick={() => choose(analytics, marketing)} className={`${btn} border border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100`}>
            {t("Save choices", "Seçimleri kaydet", "保存选择")}
          </button>
        ) : (
          <button type="button" onClick={() => setCustomise(true)} className={`${btn} text-cyan-900 underline underline-offset-4`}>
            {t("Choose", "Seç", "选择")}
          </button>
        )}
      </div>
    </div>
  );
}

/** "Privacy choices" link for the footers; renders only where a tag could load. */
export function ConsentSettingsLink({ locale, className }: { locale: string; className?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => setShow((PRODUCTION_ANALYTICS_HOSTS as readonly string[]).includes(window.location.hostname)), []);
  if (!show) return null;
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} className={className ?? "inline-block font-medium text-foreground/70 underline underline-offset-2 hover:text-foreground"} data-consent-settings>
      {researchText(locale, "Privacy choices", "Gizlilik tercihleri", "隐私选择")}
    </button>
  );
}

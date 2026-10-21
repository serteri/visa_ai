"use client";

/**
 * The guide's panel: page-aware suggestions, quick actions and a short question box, all answered by the deterministic layer in lib/site-guide.
 * Loaded only after the visitor opens the guide. Typed text stays in this component's state: it is never stored, logged or sent in an analytics event.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";

import { trackGuideEvent } from "@/lib/site-guide/analytics";
import { analyticsPageType } from "@/lib/site-guide/page-context";
import { AI_ASSISTANT_PATH } from "@/lib/site-guide/route-registry";
import { aiAssistantHref, assessmentLink, assessmentPromptText, buildResponse, chooseCountryText, contextSuggestions, quickActions } from "@/lib/site-guide/response-builder";
import type { GuideCountry, GuideLink, GuideResponse, PageContext } from "@/lib/site-guide/types";
import { guideLocale, GUIDE_TEXT } from "./site-guide-views";

const TEXT = {
  title: GUIDE_TEXT.label,
  close: { en: "Close the guide", tr: "Rehberi kapat", "zh-Hans": "关闭指南" },
  boundary: {
    en: "Navigation help only. This is not migration advice, an eligibility decision or a recommendation.",
    tr: "Yalnızca yönlendirme yardımı. Bu bir göçmenlik tavsiyesi, uygunluk kararı veya öneri değildir.",
    "zh-Hans": "仅提供导航帮助，不构成移民建议、资格判断或推荐。",
  },
  onThisPage: { en: "Suggested for this page", tr: "Bu sayfa için öneriler", "zh-Hans": "适合此页面的链接" },
  quick: { en: "Quick actions", tr: "Hızlı işlemler", "zh-Hans": "快捷入口" },
  chooseCountry: { en: "Choose a country", tr: "Bir ülke seçin", "zh-Hans": "选择国家" },
  australia: { en: "Australia research", tr: "Avustralya araştırması", "zh-Hans": "澳大利亚研究" },
  canada: { en: "Canada research", tr: "Kanada araştırması", "zh-Hans": "加拿大研究" },
  askLabel: { en: "Ask where to find something", tr: "Bir şeyi nerede bulacağınızı sorun", "zh-Hans": "询问在哪里可以找到" },
  placeholder: { en: "e.g. Where do I check my points?", tr: "ör. Puanlarımı nerede kontrol ederim?", "zh-Hans": "例如：在哪里查看积分？" },
  send: { en: "Find pages", tr: "Sayfaları bul", "zh-Hans": "查找页面" },
  openAssistant: { en: "Open AI Assistant", tr: "AI Asistanı'nı aç", "zh-Hans": "打开 AI 助手" },
  startAssessment: { en: "Start Assessment", tr: "Değerlendirmeyi başlat", "zh-Hans": "开始评估" },
  english: { en: "(English)", tr: "(İngilizce)", "zh-Hans": "（英文）" },
} as const;

export type SiteGuidePanelProps = {
  locale: string;
  context: PageContext;
  panelId: string;
  onClose: () => void;
};

export default function SiteGuidePanel({ locale, context, panelId, onClose }: SiteGuidePanelProps) {
  const l = guideLocale(locale);
  const [scope, setScope] = useState<GuideCountry | null>(context.country);
  const [text, setText] = useState("");
  const [pending, setPending] = useState("");
  const [response, setResponse] = useState<GuideResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const source = analyticsPageType(context);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const track = (name: Parameters<typeof trackGuideEvent>[0], link?: GuideLink, interaction?: string, country?: GuideCountry | null) =>
    trackGuideEvent(name, { sourcePageType: source, destinationId: link?.id, destinationType: link?.category, country: country ?? link?.country, interaction });

  const chooseCountry = (c: GuideCountry) => {
    setScope(c);
    track("site_guide_quick_action", undefined, "quick_action", c);
    if (pending) setResponse(buildResponse(pending, c, locale, false));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setPending(value);
    const r = buildResponse(value, scope, locale, context.country !== null);
    if (r.country && r.country !== scope && r.kind !== "boundary") setScope(r.country);
    setResponse(r);
    track("site_guide_quick_action", undefined, "free_text", r.country);
    inputRef.current?.focus();
  };

  const suggestions = contextSuggestions(context, locale);
  const quick = scope ? quickActions(scope, locale) : [];
  const isLinkEnglishOnly = (x: GuideLink) => x.englishOnly && l !== "en";

  const linkItem = (link: GuideLink, interaction: string) => (
    <li key={link.id + link.href}>
      <a
        href={link.href}
        onClick={() => track("site_guide_route_click", link, interaction)}
        className="block min-h-11 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="font-medium text-foreground">
          {link.title}
          {isLinkEnglishOnly(link) ? ` ${TEXT.english[l]}` : ""}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{link.description}</span>
      </a>
    </li>
  );

  const assessmentLinkItem = () => {
    const a = assessmentLink(locale, response?.country ?? scope);
    return (
      <div className="mt-3">
        <p className="text-sm text-muted-foreground">{assessmentPromptText(locale)}</p>
        <a
          href={a.href}
          onClick={() => track("site_guide_route_click", a, "route_click")}
          className="mt-2 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {TEXT.startAssessment[l]}
        </a>
      </div>
    );
  };

  return (
    <section
      id={panelId}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${panelId}-title`}
      data-site-guide-panel
      className="fixed inset-x-3 z-40 flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[24rem]"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 id={`${panelId}-title`} ref={titleRef} tabIndex={-1} className="text-base font-semibold outline-none">
          {TEXT.title[l]}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={TEXT.close[l]}
          className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        <p className="text-xs text-muted-foreground">{TEXT.boundary[l]}</p>

        {suggestions.length > 0 ? (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{TEXT.onThisPage[l]}</h3>
            <ul className="space-y-2">{suggestions.map((s) => linkItem(s, "context_link"))}</ul>
          </div>
        ) : null}

        {!scope ? (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{TEXT.chooseCountry[l]}</h3>
            <div className="flex flex-wrap gap-2">
              {(["AU", "CA"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => chooseCountry(c)}
                  className="min-h-11 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {c === "AU" ? TEXT.australia[l] : TEXT.canada[l]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{TEXT.quick[l]}</h3>
            <ul className="space-y-2">{quick.map((q) => linkItem(q, "quick_action"))}</ul>
          </div>
        )}

        {response ? (
          <div role="status" aria-live="polite" data-site-guide-response>
            <p className="text-sm">{response.kind === "choose-country" ? chooseCountryText(locale) : response.message}</p>
            {response.links.length > 0 ? <ul className="mt-2 space-y-2">{response.links.map((r) => linkItem(r, "route_click"))}</ul> : null}
            {response.kind === "choose-country" ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {(["AU", "CA"] as const).map((c) => (
                  <button key={c} type="button" onClick={() => chooseCountry(c)} className="min-h-11 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary">
                    {c === "AU" ? TEXT.australia[l] : TEXT.canada[l]}
                  </button>
                ))}
              </div>
            ) : null}
            {response.handoff || response.kind === "boundary" ? (
              <a
                href={aiAssistantHref(locale)}
                data-site-guide-handoff={AI_ASSISTANT_PATH}
                onClick={() => track("site_guide_ai_assistant_handoff", undefined, "handoff")}
                className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {TEXT.openAssistant[l]}
              </a>
            ) : null}
            {response.assessment ? assessmentLinkItem() : null}
          </div>
        ) : null}
      </div>

      <form onSubmit={submit} className="border-t border-border px-4 py-3">
        <label htmlFor={`${panelId}-input`} className="mb-1 block text-xs font-medium text-muted-foreground">
          {TEXT.askLabel[l]}
        </label>
        <div className="flex gap-2">
          <input
            id={`${panelId}-input`}
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={120}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            placeholder={TEXT.placeholder[l]}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
          />
          <button type="submit" className="min-h-11 shrink-0 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            {TEXT.send[l]}
          </button>
        </div>
      </form>
    </section>
  );
}

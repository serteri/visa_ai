/**
 * The launcher button and the proactive prompt as plain presentational components (no hooks, no navigation imports), so they render in tests and the
 * launcher chunk stays small. The panel logic lives in site-guide-panel.tsx and is loaded only when the visitor opens the guide.
 */
import type { ReactNode } from "react";

export type GuideLocale = "en" | "tr" | "zh-Hans";

export const GUIDE_TEXT = {
  label: { en: "LogiVisa Guide", tr: "LogiVisa Rehber", "zh-Hans": "LogiVisa 指南" },
  nudge: {
    en: "Need help finding the right research tool?",
    tr: "Doğru araştırma aracını bulmak için yardım ister misiniz?",
    "zh-Hans": "需要帮助找到合适的研究工具吗？",
  },
  openLabel: { en: "Open the LogiVisa Guide", tr: "LogiVisa Rehber'i aç", "zh-Hans": "打开 LogiVisa 指南" },
  dismissNudge: { en: "Dismiss this prompt", tr: "Bu istemi kapat", "zh-Hans": "关闭此提示" },
} as const;

export function guideLocale(locale: string): GuideLocale {
  return locale === "tr" ? "tr" : locale === "zh-Hans" ? "zh-Hans" : "en";
}

export function GuideLauncherView({
  locale,
  open,
  showNudge,
  onOpen,
  onDismissNudge,
  buttonRef,
  panelId,
}: {
  locale: string;
  open: boolean;
  showNudge: boolean;
  onOpen: () => void;
  onDismissNudge: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
  panelId: string;
}): ReactNode {
  const l = guideLocale(locale);
  return (
    <div
      data-site-guide-launcher
      className="fixed right-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:right-6 sm:bottom-6"
    >
      {showNudge && !open ? (
        <div
          role="status"
          data-site-guide-nudge
          className="flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-card-foreground shadow-md"
        >
          <button type="button" onClick={onOpen} className="min-h-11 text-left font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            {GUIDE_TEXT.nudge[l]}
          </button>
          <button
            type="button"
            onClick={onDismissNudge}
            aria-label={GUIDE_TEXT.dismissNudge[l]}
            className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      ) : null}
      <button
        ref={buttonRef}
        type="button"
        onClick={onOpen}
        aria-label={GUIDE_TEXT.openLabel[l]}
        aria-expanded={open}
        aria-controls={panelId}
        data-site-guide-button
        className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-opacity"
      >
        <span aria-hidden="true">?</span>
        {GUIDE_TEXT.label[l]}
      </button>
    </div>
  );
}

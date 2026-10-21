"use client";

import { useTranslation } from "@/contexts/language-context";
import type { EngineResultSummary } from "@/lib/chat/quick-profile-api";
import { publicPath } from "@/lib/seo/urls";

/**
 * The compact result for a free visitor's quick profile (no model call): the points from the entries, the total per subclass next to
 * the published minimum, and the link to the full report. Information only. Premium visitors keep the card only.
 */
export function ChatQuickResult({ result, locale, onEdit }: { result: EngineResultSummary; locale: string; onEdit: () => void }) {
  const { t } = useTranslation();
  const rows = result.totals ? (["189", "190", "491"] as const) : [];

  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-card p-4 text-sm" data-testid="chat-quick-result">
      <p className="font-semibold">{t("chat.result.title", "Your entered figures")}</p>
      <p data-testid="chat-result-points">
        {result.points !== null
          ? t("chat.result.points", "Points from your entries: {points}").replace("{points}", String(result.points))
          : t("chat.result.pointsUnknown", "Points could not be calculated from these answers.")}
      </p>
      {result.totals && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {t("chat.result.totals", "Points total per subclass, next to the published minimum ({min})").replace("{min}", String(result.minimum))}
          </p>
          <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2" data-testid="chat-result-totals">
            {rows.map((visa) => (
              <li key={visa}>
                <span className="font-medium">{visa}</span>: {result.totals![visa]}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t("chat.result.totalsNote", "190 adds 5 and 491 adds 15 nomination points. Information only; advice on your own situation comes from a registered migration agent (MARA) or an Australian legal practitioner.")}</p>
        </div>
      )}
      <p className="text-xs text-muted-foreground" data-testid="chat-full-report-cta">
        {t("chat.result.cta", "The Visa Information Report sets out published requirements, your figures side by side, sourced costs and state program information in one PDF.")}{" "}
        <a href={publicPath(locale, `/full-check`)} className="font-medium text-primary underline-offset-2 hover:underline">
          {t("chat.result.ctaLink", "Get the full report")}
        </a>
      </p>
      <button type="button" onClick={onEdit} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
        {t("chat.result.edit", "Edit my profile")}
      </button>
    </div>
  );
}

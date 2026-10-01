"use client";

import { useTranslation } from "@/contexts/language-context";
import type { EngineResultSummary } from "@/lib/chat/quick-profile-api";

/**
 * The compact engine result for a free visitor's quick profile (no model call): estimated points, gate status per
 * visa, states open for the occupation, and the CTA to the full report. Premium visitors keep the card only.
 */
export function ChatQuickResult({ result, locale, onEdit }: { result: EngineResultSummary; locale: string; onEdit: () => void }) {
  const { t } = useTranslation();
  const gateRows = Object.entries(result.gates);
  const list = (v: string[]) => (v.length ? v.join(", ") : t("chat.result.statesNone", "none"));

  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-card p-4 text-sm" data-testid="chat-quick-result">
      <p className="font-semibold">{t("chat.result.title", "Your quick result")}</p>
      <p data-testid="chat-result-points">
        {result.points !== null
          ? t("chat.result.points", "Estimated points: {points}").replace("{points}", String(result.points))
          : t("chat.result.pointsUnknown", "Points could not be calculated from these answers.")}
      </p>
      {gateRows.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">{t("chat.result.gates", "Visa requirements")}</p>
          <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2" data-testid="chat-result-gates">
            {gateRows.map(([visa, status]) => (
              <li key={visa}>
                <span className="font-medium">{visa}</span>: {t(`chat.result.status.${status}`, status)}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <p className="text-xs font-medium text-muted-foreground">{t("chat.result.states", "States open for your occupation")}</p>
        {result.states ? (
          <p data-testid="chat-result-states">
            190: {list(result.states["190"])}; 491: {list(result.states["491"])}
          </p>
        ) : (
          <p>{t("chat.result.statesUnavailable", "Not available for this profile.")}</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground" data-testid="chat-full-report-cta">
        {t("chat.result.cta", "Want every section in one PDF?")}{" "}
        <a href={`/${locale}/full-check`} className="font-medium text-primary underline-offset-2 hover:underline">
          {t("chat.result.ctaLink", "Get the full report")}
        </a>
      </p>
      <button type="button" onClick={onEdit} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
        {t("chat.result.edit", "Edit my profile")}
      </button>
    </div>
  );
}

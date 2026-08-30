// Centralized Hot/Warm/Cold lead-tier presentation. The tier values are
// produced by computeInternalLeadTier() and persisted on
// user_reports.points_tier ("Hot" | "Warm" | "Cold"). The internal lead email
// already flags Hot with 🔥 and Warm with 🌤️ — mirrored here — and colours
// follow the app's existing red/amber palette (Cold uses a calm sky tone).

export const LEAD_TIERS = ["Hot", "Warm", "Cold"] as const;
export type LeadTier = (typeof LEAD_TIERS)[number];

export function normalizeTier(value?: string | null): LeadTier | "Unassigned" {
  if (value === "Hot" || value === "Warm" || value === "Cold") return value;
  return "Unassigned";
}

/** Tailwind badge classes, matching the border/bg/text convention used across
 *  admin + dashboard pages. */
export function tierBadgeClass(value?: string | null): string {
  switch (normalizeTier(value)) {
    case "Hot":
      return "border-red-500/30 bg-red-500/10 text-red-700";
    case "Warm":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700";
    case "Cold":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700";
    default:
      return "border-slate-200 bg-[#53917E]/10 text-slate-600";
  }
}

export function tierEmoji(value?: string | null): string {
  switch (normalizeTier(value)) {
    case "Hot":
      return "🔥";
    case "Warm":
      return "🌤️";
    case "Cold":
      return "❄️";
    default:
      return "•";
  }
}

/** Sort weight so Hot leads surface first in tables (Hot=0 … Unassigned=3). */
export function tierRank(value?: string | null): number {
  const order: Record<string, number> = { Hot: 0, Warm: 1, Cold: 2 };
  return order[normalizeTier(value)] ?? 3;
}

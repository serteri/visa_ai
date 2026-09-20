import type { EnglishOption } from "@/lib/points/types";

export function parseEnglishOption(raw: string): EnglishOption | null {
  const s = raw.toLowerCase().trim();
  // Strict exact-match mapping for the standardized "English Level" dropdown
  // values (none/competent/proficient/superior) before falling back to the
  // fuzzy free-text matching below (used by other callers, e.g. chat intake).
  if (s === "none") return "competent"; // 0 points — same tier as "competent"
  if (s === "competent") return "competent";
  if (s === "proficient") return "proficient";
  if (s === "superior") return "superior";
  if (s.includes("superior") || s.includes("高级") || s.includes("优秀") || /ielts\s*[89]/.test(s) || /pte\s*7[0-9]/.test(s) || /pte\s*8/.test(s))
    return "superior";
  if (s.includes("proficient") || s.includes("熟练") || /ielts\s*7/.test(s) || /pte\s*6[0-9]/.test(s))
    return "proficient";
  if (s.includes("competent") || s.includes("合格") || /ielts\s*6/.test(s) || /pte\s*5[0-9]/.test(s) || s.includes("functional"))
    return "competent";
  // Handle raw numeric scores (e.g., "8", "8.5", "7.5", "6.5") treated as IELTS-band-equivalent
  const numericScore = parseFloat(s);
  if (!isNaN(numericScore) && numericScore >= 1 && numericScore <= 9) {
    if (numericScore >= 7.5) return "superior";
    if (numericScore >= 7.0) return "proficient";
    if (numericScore >= 6.0) return "competent";
  }
  // Handle "level N" or "N/9" patterns
  const levelMatch = s.match(/(?:level|lvl|band|clb)\s*(\d+(?:\.\d+)?)/);
  if (levelMatch) {
    const level = parseFloat(levelMatch[1]);
    if (level >= 9) return "superior";
    if (level >= 7) return "proficient";
    if (level >= 5) return "competent";
  }
  return null;
}

/**
 * True when an English level is provided and already at the points table's
 * top tier (Superior, 20/20): no English improvement can add points.
 */
export function isEnglishAtMaximum(englishLevel: string | undefined | null): boolean {
  const raw = (englishLevel ?? "").trim();
  if (raw === "" || raw.toLowerCase() === "none") return false;
  return parseEnglishOption(raw) === "superior";
}

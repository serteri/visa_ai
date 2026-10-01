import versions from "@/src/data/knowledge-versions.json";

/**
 * Human-readable citation names. A citation shows the publisher and the document -- "Home Affairs – Subclass 491,
 * p. 1", "Queensland – Skilled visa options, p. 4", "Australian Computer Society – skills assessment guide" -- never
 * a file name. Built from the chunk metadata (file name, parent folder) and the file's path under data/knowledge
 * (src/data/knowledge-versions.json `paths`); a file indexed under a name no longer on disk falls back to the name.
 */

const PATHS = ((versions as unknown as { paths?: Record<string, string> }).paths ?? {}) as Record<string, string>;

const STATE_NAMES: Record<string, string> = {
  ACT: "Australian Capital Territory",
  NSW: "New South Wales",
  NT: "Northern Territory",
  QUEENSLAND: "Queensland",
  QLD: "Queensland",
  SA: "South Australia",
  TAS: "Tasmania",
  VICTORIA: "Victoria",
  VIC: "Victoria",
  "WESTERN AUSTRALIA": "Western Australia",
  WA: "Western Australia",
};

/** The file name without extension, date suffix, duplicate marker or underscores. */
export function cleanDocumentTitle(filename: string): string {
  let t = filename
    .replace(/\.[A-Za-z0-9]{2,5}$/, "")
    .replace(/[\s_-]+\d{1,2}[\s_-]?[A-Za-z]{3,9}[\s_-]?\d{4}$/, "")
    .replace(/[\s_-]+\d{1,2}[_-]\d{1,2}[_-]\d{4}$/, "")
    .replace(/\s*\(\d+\)$/, "")
    // "…Limited1": a copy counter glued to a word (never a subclass number or year after a space).
    .replace(/(?<=[a-z])\d$/i, "");
  // A file name with no spaces ("engineers-australia-accredited-programs") reads as words.
  if (!/\s/.test(t)) t = t.replace(/[-_]+/g, " ");
  return t
    .replace(/_/g, " ")
    .replace(/\s*-{2,}\s*/g, " – ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const AUTHORITY_NAMES: Record<string, string> = {
  "Pathways to registration for international medical graduates": "Medical Board of Australia",
  "Australian Medical Council(AMC)": "Australian Medical Council",
  Anmac: "ANMAC",
};

/** "Home Affairs – Subclass 491" / "… – Subclass 485, Post-Higher Education Work stream" / "… – English proficiency (Subclass 482)". */
function homeAffairsName(title: string): string | null {
  const t = title.trim();
  if (/^invitation rounds/i.test(t)) return "Home Affairs – SkillSelect invitation rounds";
  if (/^english proficiency/i.test(t)) {
    const n = t.match(/subclass\s*(\d{3})/i)?.[1];
    return `Home Affairs – English proficiency${n ? ` (Subclass ${n})` : ""}`;
  }
  if (/^skilled occupation list/i.test(t)) {
    const n = t.match(/(?:subclass\s*|_)(\d{3})/i)?.[1] ?? t.match(/\b(\d{3})\b/)?.[1];
    return `Home Affairs – Skilled occupation list${n ? ` (Subclass ${n})` : ""}`;
  }
  const n = t.match(/subclass(?:es)?[\s-]*(\d{3})/i)?.[1] ?? t.match(/class[\s_]*(\d{3})/i)?.[1];
  if (!n) return null;
  const stream = t.match(/\)\s*([^()]*?\bstream)\b/i)?.[1]?.trim();
  return `Home Affairs – Subclass ${n}${stream ? `, ${stream}` : ""}`;
}

export function humanSourceName(source: string, category?: string): string {
  const rel = PATHS[source] ?? "";
  const parts = rel.split("/");
  const title = cleanDocumentTitle(source);

  // State and territory government documents: "<State> – <document>".
  if (parts[0] === "State Immigrations" && parts[1]) {
    const state = STATE_NAMES[parts[1].toUpperCase()] ?? parts[1];
    // The state's own name at the start or end of the title is redundant next to the publisher.
    const names = [...new Set([...Object.keys(STATE_NAMES), ...Object.values(STATE_NAMES)])].sort((a, b) => b.length - a.length).join("|");
    const doc = title
      .replace(new RegExp(`\\s*\\((${names})\\)\\s*$`, "i"), "")
      .replace(new RegExp(`^(${names})\\b\\s*`, "i"), "")
      .replace(new RegExp(`\\s*\\b(${names})(\\s+Australia)?$`, "i"), "")
      .replace(/\b(WA|NSW|SA|NT|ACT|QLD|VIC|TAS)\b/g, "")
      .replace(/\(\s*\)/g, "")
      .replace(/\s*[-–]\s*$/, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    return doc ? `${state} – ${doc}` : state;
  }
  // Assessing authorities: "<Authority> – skills assessment guide" (or the document's own title when it is a
  // different document, e.g. an accredited-programs list). Home Affairs' own list of authorities sits at the top.
  if (parts[0] === "Skill Assessments") {
    const folder = parts.length > 2 ? parts[1] : null;
    if (!folder) return /assessing authorities/i.test(title) ? "Home Affairs – Skills assessment: assessing authorities" : `${title} – skills assessment guide`;
    if (folder === "_archive") return `${title} – skills assessment guide`;
    const authority = AUTHORITY_NAMES[folder] ?? folder;
    const same = (a: string, b: string) => a.toLowerCase().startsWith(b.toLowerCase()) || b.toLowerCase().startsWith(a.toLowerCase());
    return same(title, folder) || same(title, authority) ? `${authority} – skills assessment guide` : `${authority} – ${title}`;
  }
  if (/anzsco/i.test(source)) return "ABS – ANZSCO occupation classification";
  if (/^osca/i.test(source)) return "ABS – OSCA occupation classification";
  if (/skilled[\s_-]*(occupation[\s_-]*)?list/i.test(source) && !/subclass|_\d{3}/i.test(source)) return "Home Affairs – Skilled occupation list";
  const ha = homeAffairsName(title);
  if (ha) return ha;
  // Unknown document: its cleaned title (never the raw file name with extension / underscores).
  void category;
  return title || "Reference document";
}

/** "Home Affairs – Subclass 491, p. 1" */
export function citationLabel(ref: { source: string; title?: string; page?: number }): string {
  const name = ref.title ?? humanSourceName(ref.source);
  return ref.page !== undefined ? `${name}, p. ${ref.page}` : name;
}

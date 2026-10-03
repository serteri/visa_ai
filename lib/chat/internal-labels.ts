/**
 * Internal prompt vocabulary must never reach the visitor: section names, "engine facts", "gates", "reference data",
 * "user profile" tags, and any instruction to consult them. The system prompt names its sections with neutral block
 * ids (block-1 ... block-5, see lib/chat/prompts.ts) and tells the model never to mention them; this module is the
 * safety net after streaming:
 *   findInternalLabels   what leaked (bracketed labels, internal terms), for the answer check and the log;
 *   stripInternalLabels  removes bracketed labels (and the empty parentheses they leave) -- applied where the answer is
 *                        shown, because the text has already streamed when the check runs.
 */

const I = "[İIiı]";
const BRACKETED_NAMES = [
  "ENGINE FACTS",
  "ENGINE DATA",
  `KULLAN${I}C${I} PROF${I}L${I}`,
  `REFERANS B${I}LG${I}LER${I}`,
  `REFERANS VER${I}LER${I}`,
  "STUDENT VISA GUIDANCE",
  "no citable source",
  "PREMIUM KAYNAK KURALLARI",
  "USER PROFILE",
  "VISITOR PROFILE",
  "REFERENCE DATA",
  "REFERENCE INFORMATION",
  "REFERENCES",
  "OPENING SUMMARY",
  "引擎事实",
  "引擎数据",
  "用户资料",
  "用户档案",
  "参考信息",
  "参考数据",
  "学生签证指南",
  "block[- ]?\\d",
].join("|");

/** [ENGINE FACTS], [Kullanıcı Profili], [REFERANS BİLGİLERİ]:, [block-2] ... in any letter case -- never a [S1] marker. */
const BRACKETED = new RegExp(`[\\[【]\\s*(?:${BRACKETED_NAMES})\\s*[\\]】]:?`, "giu");
/** Any other bracketed ALL-CAPS phrase of two or more words ("[SOME INTERNAL HEADING]"). */
const BRACKETED_CAPS = /\[[A-ZÇĞİÖŞÜ]{2,}(?: [A-ZÇĞİÖŞÜ]{2,})+\]:?/gu;

/** Internal terms used in running text (English / Turkish / Chinese). */
const INTERNAL_TERMS = new RegExp(
  [
    "\\bengine facts?\\b",
    "\\breference (?:data|information|block)\\b",
    "\\b(?:user|visitor) profile (?:data|block|tag)\\b",
    "\\bstudent visa guidance\\b",
    "\\bblock[- ]?[1-5]\\b",
    "\\bgates?\\b",
    "\\bgate (?:matrix|status|result)s?\\b",
    "motor verisi",
    "rapor motoru(?:nun|ndan)? (?:verisi|gerçekleri)",
    `kullanıcı prof${I}l${I}\\s*(?:bloğu|etiketi|verisi)`,
    `referans b${I}lg${I}ler${I}`,
    `referans ver${I}ler${I}`,
    `v${I}ze kap${I}`,
    `kap${I}\\s*sonuc`,
    "kapılar",
    "引擎事实",
    "引擎数据",
    "参考数据",
    "关卡",
  ].join("|"),
  "giu",
);

export type InternalLabel = { kind: "bracketed" | "term"; match: string };

export function findInternalLabels(text: string): InternalLabel[] {
  const out: InternalLabel[] = [];
  for (const m of text.matchAll(BRACKETED)) out.push({ kind: "bracketed", match: m[0] });
  const rest = text.replace(BRACKETED, " ");
  for (const m of rest.matchAll(BRACKETED_CAPS)) out.push({ kind: "bracketed", match: m[0] });
  for (const m of rest.replace(BRACKETED_CAPS, " ").matchAll(INTERNAL_TERMS)) out.push({ kind: "term", match: m[0] });
  return out;
}

/** Removes bracketed internal labels and tidies what they leave behind. Citation markers ([S1]) are untouched. */
export function stripInternalLabels(text: string): string {
  return text
    .replace(BRACKETED, "")
    .replace(BRACKETED_CAPS, "")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,;:!?])/g, "$1");
}

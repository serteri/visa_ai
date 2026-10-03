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
  for (const m of text.matchAll(BLOCK_GROUP)) out.push({ kind: "bracketed", match: m[0] });
  const noGroups = text.replace(BLOCK_GROUP, " ");
  for (const m of noGroups.matchAll(BRACKETED)) out.push({ kind: "bracketed", match: m[0] });
  const rest = noGroups.replace(BRACKETED, " ");
  for (const m of rest.matchAll(BRACKETED_CAPS)) out.push({ kind: "bracketed", match: m[0] });
  for (const m of rest.replace(BRACKETED_CAPS, " ").matchAll(INTERNAL_TERMS)) out.push({ kind: "term", match: m[0] });
  return out;
}

/** A bracketed / parenthesised group that mentions a block id anywhere in it: "[block-1, block-4]", "(see block-1, state requirements)". */
const BLOCK_GROUP = /[\[(【（][^\])】）\n]*?\bblock[- ]?\d\b[^\])】）\n]*?[\])】）]:?/giu;
/** A bare block id, with the ids chained to it ("block-1 and block-2", "block-1, block-4"). */
const BLOCK_BARE = /\bblock[- ]?\d\b(?:\s*(?:,|;|&|and|ve|和|与)\s*block[- ]?\d\b)*/giu;

/**
 * Removes internal labels in every form: bracketed names, a bracketed or parenthesised group that names a block id
 * ("[block-1, block-4]", "(see block-1, state requirements)"), and a bare block id; tidies what they leave behind.
 * Citation markers ([S1]) and rendered citations are untouched.
 */
export function stripInternalLabels(text: string): string {
  return text
    .replace(BLOCK_GROUP, "")
    .replace(BRACKETED, "")
    .replace(BRACKETED_CAPS, "")
    .replace(BLOCK_BARE, "")
    .replace(/\(\s*\)|\[\s*\]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,;:!?。，；：！？])/g, "$1")
    .replace(/([(\[]) +/g, "$1");
}

/**
 * Streaming version: strips as text arrives. A label can be split across deltas ("[block-" + "1]"), so the tail that
 * could still be the start of a label (an unclosed bracket / parenthesis of a short length, or a partial "block-N") is
 * held back until it is complete or can no longer be a label. flush() releases what is left at the end of the part.
 */
export class InternalLabelStripper {
  private pending = "";
  private last = "";
  push(delta: string): string {
    const text = this.pending + delta;
    const hold = holdIndex(text);
    const safe = text.slice(0, hold);
    this.pending = text.slice(hold);
    return this.emit(stripInternalLabels(safe));
  }
  flush(): string {
    const rest = this.pending;
    this.pending = "";
    return this.emit(stripInternalLabels(rest));
  }
  /** No doubled space where a removed label sat between two deltas. */
  private emit(out: string): string {
    const clean = this.last === " " && out.startsWith(" ") ? out.slice(1) : out;
    if (clean) this.last = clean[clean.length - 1];
    return clean;
  }
}

function holdIndex(text: string): number {
  // An unclosed group opener near the end: hold from it (a real label group is short and has no line break).
  for (const open of ["[", "(", "【", "（"]) {
    const i = text.lastIndexOf(open);
    if (i >= 0 && text.length - i <= 80 && !/[\])】）\n]/.test(text.slice(i + 1))) return i;
  }
  // A partial bare id at the very end: "b", "bl", "block", "block-", "block-1" (a following delta may complete it).
  const m = text.match(/(?:^|[^\p{L}\p{N}])(b(?:l(?:o(?:c(?:k(?:[- ]\d?)?)?)?)?)?)$/iu);
  if (m) return text.length - m[1].length;
  return text.length;
}

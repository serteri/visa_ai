/** The NOC 2021 occupation field's state transitions, kept pure so the exact clicked result is what gets stored (scripts/test-noc-selection.ts). */
export type NocPick = { code: string; title: string; teer: number };
export type NocFieldState = { search: string; code: string; teer: number | null };

/** Choosing a search result stores that result's own title, code and TEER, and nothing from any neighbouring result. */
export function pickNocResult(entry: NocPick): NocFieldState {
  return { search: entry.title, code: entry.code, teer: entry.teer };
}

/** Editing the text discards the previously chosen code and TEER: only a later click can set them again. */
export function editNocSearch(text: string): NocFieldState {
  return { search: text, code: "", teer: null };
}

import { research149311 } from "./research-149311";
import { research225113 } from "./research-225113";
import type { OccupationResearch } from "./research-types";

export type { OccupationResearch } from "./research-types";

/** The occupations that have a source-backed research module; every other occupation keeps the generic template. */
const MODULES: Array<(code: string, locale: string) => OccupationResearch | null> = [research149311, research225113];

export function occupationResearch(code: string, locale: string): OccupationResearch | null {
  for (const m of MODULES) {
    const r = m(code, locale);
    if (r) return r;
  }
  return null;
}

import waData from "@/src/data/state-occupation-lists/wa.json";

import type { Locale } from "@/lib/readiness/types";

type WaRow = { anzscoCode: string | null; streams: string[]; subclass190: boolean; subclass491: boolean; sector: string };

const ROWS = (waData as { occupations: WaRow[] }).occupations;

/**
 * WA's stream-specific conditions for an occupation on its 2025-26 lists, from the WA State Nominated Migration
 * Program document (see wa.json _provenance.rules): the WA employment contract that the General stream requires for
 * subclass 190 but not 491 (Schedule 1 p.5, Schedule 2 p.9; contract terms p.5), and the Graduate stream's WA study
 * requirement (p.13). Empty when the occupation is not on WA's lists.
 */
export function waStreamRequirementNotes(anzscoCode: string | undefined, locale: Locale): string[] {
  if (!anzscoCode) return [];
  const row = ROWS.find((r) => r.anzscoCode === anzscoCode);
  if (!row) return [];
  const notes: string[] = [];
  const general = row.streams.includes("schedule1") ? "1" : row.streams.includes("schedule2") ? "2" : undefined;
  if (general) {
    const pages = general === "1" ? "5" : "5, 9";
    // Schedule 2 only (p.9): nor to applicants invited through a WA building and construction industry occupation.
    const construction = general === "2" && /building and construction/i.test(row.sector);
    notes.push(
      locale === "tr"
        ? `WA Genel akış (WASMOL Schedule ${general}): subclass 190 için aday gösterilen (veya yakından ilgili) mesleğinizde, adaylık başvurusu tarihinden itibaren en az altı ay süreli, tam zamanlı bir Batı Avustralya iş sözleşmesi gerekir; bu şart subclass 491 için${construction ? " ve bir WA inşaat sektörü mesleği üzerinden davet edilenler için" : ""} geçerli değildir (WA State Nominated Migration Program 2025-26, s. ${pages}).`
        : locale === "zh-Hans"
          ? `WA 一般类别（WASMOL Schedule ${general}）：申请 subclass 190 需持有西澳全职雇佣合同，职位为您的提名职业（或密切相关职业），自州担保申请之日起至少六个月；该要求不适用于 subclass 491${construction ? "，也不适用于通过西澳建筑业职业获邀的申请人" : ""}（WA State Nominated Migration Program 2025-26，第 ${pages} 页）。`
          : `WA General stream (WASMOL Schedule ${general}): for subclass 190 you need a full-time employment contract in Western Australia in your nominated (or a closely related) occupation, for at least six months from the date you apply for State nomination; this does not apply to subclass 491${construction ? ", or if you are invited through a WA building and construction industry occupation" : ""} (WA State Nominated Migration Program 2025-26, p. ${pages}).`
    );
  }
  if (row.streams.includes("graduate")) {
    notes.push(
      locale === "tr"
        ? "WA Mezun akışı: akredite bir Batı Avustralya eğitim kurumunda, tam zamanlı ve yüz yüze (kampüste) en az iki akademik yıl eğitim almış olmanız gerekir (WA State Nominated Migration Program 2025-26, s. 13)."
        : locale === "zh-Hans"
          ? "WA 毕业生类别：须在西澳认可教育机构以全日制、面授（校园内）方式学习至少两个学年（WA State Nominated Migration Program 2025-26，第 13 页）。"
          : "WA Graduate stream: you must have studied in Western Australia at an accredited WA institution, full-time and on campus, for at least two academic years (WA State Nominated Migration Program 2025-26, p. 13)."
    );
  }
  return notes;
}

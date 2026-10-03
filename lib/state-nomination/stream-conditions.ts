import waData from "@/src/data/state-occupation-lists/wa.json";

import type { Locale, ReadinessInput } from "@/lib/readiness/types";

/**
 * A state counts as available for a subclass only if the applicant can meet that state's stream conditions on the
 * intake data -- not just have the occupation on the state's list. Conditions that depend on employment or study in
 * the state are taken only from sourced, machine-readable state data (WA's occupation lists, wa.json); residence
 * conditions are handled by lib/state-nomination/residence-rules.ts. A condition is never inferred: a state whose
 * stream conditions are not in the sourced data is not blocked here.
 *
 *   WA, subclass 190: every General-stream occupation (Schedule 1 or 2) needs a full-time WA employment contract of at
 *     least six months (WA State Nominated Migration Program 2025-26, pp. 5, 9); 491 does not. The Graduate stream
 *     (two academic years of on-campus study in WA, p. 13) is the alternative when the occupation is on it.
 *   WA, subclass 491: an occupation on the Graduate stream ONLY needs that WA study.
 *
 * The intake records a WA job as: employer sponsorship = a job offer or a sponsored 482, with WA as the state of the
 * job (`employmentState`, else the preferred state or the state of residence). WA study is recorded only through
 * `studyState`; the intake does not ask for it, so it is not assumed.
 */

type WaRow = { anzscoCode: string | null; streams: string[]; subclass190: boolean; subclass491: boolean };
const WA_ROWS = (waData as { occupations: WaRow[] }).occupations;

export type StreamBlock = {
  kind: "employment" | "study";
  /** Short reason shown as the state's unavailability reason (en / tr / zh-Hans). */
  reason: string;
  /** The sourced condition behind it. */
  detail: string;
  /** The applicant's next step that would satisfy it. */
  step: string;
};

const T = (l: Locale, en: string, tr: string, zh: string) => (l === "tr" ? tr : l === "zh-Hans" ? zh : en);

/** True when the intake records a job offer / sponsorship in `state`. */
export function hasJobIn(input: Partial<ReadinessInput>, state: string): boolean {
  const sponsored = input.employerSponsorship === "job_offer" || input.employerSponsorship === "sponsored_482";
  if (!sponsored) return false;
  const jobState = input.employmentState ?? input.preferredState ?? input.residenceState;
  return typeof jobState === "string" && jobState.trim().toUpperCase() === state;
}

export function hasStudiedIn(input: Partial<ReadinessInput>, state: string): boolean {
  return input.qualificationAwardedInAustralia === true && typeof input.studyState === "string" && input.studyState.trim().toUpperCase() === state;
}

/** Why `stateCode` cannot nominate this applicant under `subclass` on their intake, or undefined when it can (or when not known). */
export function streamConditionBlock(
  input: Partial<ReadinessInput>,
  stateCode: string,
  anzscoCode: string | undefined,
  subclass: "190" | "491",
  locale: Locale,
): StreamBlock | undefined {
  if (stateCode !== "WA" || !anzscoCode) return undefined;
  const row = WA_ROWS.find((r) => r.anzscoCode === anzscoCode);
  if (!row) return undefined;
  const general = row.streams.includes("schedule1") || row.streams.includes("schedule2");
  const graduate = row.streams.includes("graduate");
  const job = hasJobIn(input, "WA");
  const study = hasStudiedIn(input, "WA");

  if (subclass === "190") {
    if (!row.subclass190) return undefined;
    if (general && !job && !(graduate && study)) {
      return {
        kind: "employment",
        reason: T(locale, "Requires a WA job offer", "Batı Avustralya'da iş teklifi gerektirir", "需要西澳工作录用"),
        detail: T(
          locale,
          "WA General stream for subclass 190: a full-time employment contract in Western Australia in your nominated (or a closely related) occupation, for at least six months from the date you apply for State nomination (WA State Nominated Migration Program 2025-26, p. 5, 9). No WA job offer or sponsor is recorded in your answers.",
          "WA Genel akış, subclass 190: aday gösterilen (veya yakından ilgili) mesleğinizde, adaylık başvurusu tarihinden itibaren en az altı ay süreli tam zamanlı bir Batı Avustralya iş sözleşmesi (WA State Nominated Migration Program 2025-26, s. 5, 9). Yanıtlarınızda Batı Avustralya'da bir iş teklifi veya sponsor kayıtlı değil.",
          "WA 一般类别，subclass 190：在西澳持有您的提名职业（或密切相关职业）的全职雇佣合同，自州担保申请之日起至少六个月（WA State Nominated Migration Program 2025-26，第 5、9 页）。您的答案中没有记录西澳工作录用或担保人。",
        ),
        step: T(
          locale,
          "Secure a Western Australian job offer: a full-time employment contract of at least six months in your occupation",
          "Batı Avustralya'da bir iş teklifi alın: mesleğinizde en az altı ay süreli tam zamanlı bir iş sözleşmesi",
          "获得西澳工作录用：您职业的全职雇佣合同，期限至少六个月",
        ),
      };
    }
    if (!general && graduate && !study) return waStudyBlock(locale);
  } else {
    if (!row.subclass491) return undefined;
    if (!general && graduate && !study) return waStudyBlock(locale);
  }
  return undefined;
}

function waStudyBlock(locale: Locale): StreamBlock {
  return {
    kind: "study",
    reason: T(locale, "Requires two years of study in WA", "Batı Avustralya'da iki yıl eğitim gerektirir", "需要在西澳学习两年"),
    detail: T(
      locale,
      "WA Graduate stream: at least two academic years of full-time, on-campus study at an accredited WA institution (WA State Nominated Migration Program 2025-26, p. 13). No WA study is recorded in your answers.",
      "WA Mezun akışı: akredite bir Batı Avustralya kurumunda tam zamanlı ve kampüste en az iki akademik yıl eğitim (WA State Nominated Migration Program 2025-26, s. 13). Yanıtlarınızda Batı Avustralya'da eğitim kayıtlı değil.",
      "WA 毕业生类别：在西澳认可院校全日制、校园内学习至少两个学年（WA State Nominated Migration Program 2025-26，第 13 页）。您的答案中没有记录西澳学习经历。",
    ),
    step: T(locale, "Complete two academic years of full-time, on-campus study at an accredited WA institution", "Akredite bir Batı Avustralya kurumunda tam zamanlı, kampüste iki akademik yıl eğitim tamamlayın", "在西澳认可院校完成两个学年的全日制校园学习"),
  };
}

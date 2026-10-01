import { engineFeeTable } from "./engine-facts";

/**
 * Flags statements in an AI assistant answer that contradict the engine data the report uses (lib/chat/
 * engine-facts.ts), in English, Turkish and Chinese:
 *   fee                a visa-charge amount for a subclass that is not one of that subclass's engine fee figures
 *                      (e.g. "491 ... AUD 4,910" from a superseded document);
 *   gate               a mandatory requirement said not to apply (189 / 190 / 491 without a skills assessment), or a
 *                      requirement the gate matrix does not have (a minimum income for 191);
 *   state_availability an occupation said to be in demand in "most / all states" -- availability per state comes
 *                      only from the engine's tracker for the visitor's profile;
 *   repeated_disclaimer more than one "not in my sources / general knowledge" statement in one answer.
 * Used on every finished answer (logged, see lib/chat/handler.ts) and by the tests.
 */

export type EngineConflict = { kind: "fee" | "gate" | "state_availability" | "repeated_disclaimer"; sentence: string; detail: string };

const SENTENCE_SPLIT = /(?<=[.!?。！？])\s+|\n+/;
const SUBCLASS = /(?:subclass|alt sınıf|vize|visa|子类)?\s*\b(189|190|191|482|485|491|500|186|820|801)\b/gi;
const FEE_WORDS = /\b(fee|fees|charge|charges|cost|costs|vac|application charge)\b|ücret|harç|maliyet|başvuru bedeli|费用|申请费|签证费/i;
// AUD 4,910 / A$4,910 / $4,910 / 4.910 AUD / 4,910 AUD / 4910 澳元
const AMOUNT = /(?:AUD|A\$|\$)\s?(\d{1,3}(?:[.,]\d{3})+|\d{3,6})|(\d{1,3}(?:[.,]\d{3})+|\d{3,6})\s?(?:AUD|avustralya doları|澳元)/gi;

function amounts(sentence: string): number[] {
  return Array.from(sentence.matchAll(AMOUNT), (m) => Number((m[1] ?? m[2]).replace(/[.,]/g, ""))).filter((n) => n >= 100);
}
function subclasses(sentence: string): string[] {
  return [...new Set(Array.from(sentence.matchAll(SUBCLASS), (m) => m[1]))];
}

const NO_SKILLS_ASSESSMENT =
  /without (?:a |an )?(?:suitable |positive |valid )?skills? assessment|no skills? assessment (?:is )?(?:needed|required)|(?:may|can) (?:proceed|apply|be lodged)[^.]{0,40}without[^.]{0,30}assessment|beceri değerlendirme\S*(?:\s+\S+){0,3}\s+olmadan|beceri değerlendirme\S* (?:gerekmez|şart değil|gerekmeden)|değerlendirme(?:si)? olmadan (?:da )?(?:başvur|ilerle|devam)|无需技能评估|不需要技能评估|没有技能评估也/i;
const MIN_INCOME = /minimum income|income threshold|income requirement|asgari gelir|minimum gelir|gelir şartı|gelir eşiği|最低收入|收入门槛|收入要求/i;
const NEGATED_INCOME = /\b(no|not|without|none)\b[^.]{0,30}(minimum income|income (?:threshold|requirement))|(asgari|minimum) gelir (şartı )?(yok|bulunmuyor|aranmaz)|gelir şartı (yok|bulunmuyor|aranmaz)|没有最低收入|无最低收入|不设最低收入|无收入要求/i;
const MOST_STATES = /\b(most|all|many|every) (?:australian )?(?:states|state and territor)|çoğu eyalet|tüm eyalet|birçok eyalet|bütün eyalet|大多数州|所有州|多数州|大部分州/i;
const DISCLAIMER =
  /not (?:in|covered by) (?:my|the) (?:system|sources|references|knowledge base)|general knowledge|genel bilgi(?:ler)?(?:im)?(?:le)?|sistemimde(?:ki)?|kaynaklarımda|referanslarda (?:yer )?al(?:mıyor|madığı)|resmi kaynaktan doğrulanmadı|一般知识|系统中没有|资料中没有|未经官方来源核实/i;

export function findEngineConflicts(answer: string, opts: { hasProfile?: boolean } = {}): EngineConflict[] {
  const fees = engineFeeTable();
  const out: EngineConflict[] = [];
  const sentences = answer.split(SENTENCE_SPLIT).map((s) => s.trim()).filter(Boolean);
  let disclaimers = 0;

  for (const s of sentences) {
    const subs = subclasses(s);

    // Fees: an amount in a fee sentence must be one of the engine's figures for a subclass the sentence names.
    if (FEE_WORDS.test(s) && subs.length > 0) {
      const allowed = new Set(subs.flatMap((sc) => fees[sc] ?? []));
      if (allowed.size > 0) {
        for (const a of amounts(s)) {
          if (!allowed.has(a)) out.push({ kind: "fee", sentence: s, detail: `AUD ${a.toLocaleString("en-AU")} is not an engine fee for subclass ${subs.join("/")} (engine: ${[...allowed].map((n) => n.toLocaleString("en-AU")).join(", ")})` });
        }
      }
    }

    // Gates.
    if (subs.some((sc) => ["189", "190", "491"].includes(sc)) && NO_SKILLS_ASSESSMENT.test(s)) {
      out.push({ kind: "gate", sentence: s, detail: "189 / 190 / 491 require a suitable (positive) skills assessment (gate matrix)" });
    }
    if (subs.includes("191") && MIN_INCOME.test(s) && !NEGATED_INCOME.test(s)) {
      out.push({ kind: "gate", sentence: s, detail: "subclass 191 has no minimum income requirement (ATO notices for 3 income years only)" });
    }

    // State availability without the engine's per-state result.
    if (!opts.hasProfile && MOST_STATES.test(s)) {
      out.push({ kind: "state_availability", sentence: s, detail: "occupation demand per state comes only from the engine's State Nomination Tracker for the visitor's profile" });
    }

    if (DISCLAIMER.test(s)) disclaimers++;
  }
  if (disclaimers > 1) {
    out.push({ kind: "repeated_disclaimer", sentence: "", detail: `${disclaimers} "not in my sources / general knowledge" statements (at most one per answer)` });
  }
  return out;
}

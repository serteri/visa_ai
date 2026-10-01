import { evaluateVisaGates } from "@/lib/readiness/visa-gates";
import type { Locale } from "@/lib/readiness/types";

import type { EngineConflict } from "./answer-check";
import { engineFeeRow } from "./engine-facts";

/**
 * Visible corrections. When the answer check (lib/chat/answer-check.ts) flags a fee, gate or state-availability
 * conflict in a finished answer, the chat appends a short correction block to the same answer: the engine's correct
 * fact with its source. Every fact comes from the data the report uses (fee table, gate matrix with its Home Affairs
 * page, the state tracker rule) -- never from the model. A repeated disclaimer is only logged, not corrected.
 */

export type Correction = { kind: "fee" | "gate" | "state_availability"; text: string };

const T = (l: Locale, en: string, tr: string, zh: string) => (l === "tr" ? tr : l === "zh-Hans" ? zh : en);
const aud = (n: number) => `AUD ${n.toLocaleString("en-AU")}`;

/** The language of the answer, when the client did not say: Chinese characters, then Turkish letters/words, else English. */
export function detectAnswerLocale(text: string): Locale {
  if (/[一-鿿]/.test(text)) return "zh-Hans";
  if (/[çğıöşüÇĞİÖŞÜ]|\b(vize|için|olarak|gerekir|başvuru)\b/i.test(text)) return "tr";
  return "en";
}

function gateSource(subclass: string, id: string, locale: Locale): string | null {
  const gates = evaluateVisaGates({ locale, country: "AU" }, {}, locale)[subclass];
  return gates?.gates.find((g) => g.id === id)?.citation ?? null;
}

export function buildCorrections(conflicts: EngineConflict[], locale: Locale): Correction[] {
  const out = new Map<string, Correction>();
  const add = (key: string, c: Correction) => {
    if (!out.has(key)) out.set(key, c);
  };

  for (const c of conflicts) {
    if (c.kind === "fee") {
      for (const sc of c.subclasses ?? []) {
        const vac = engineFeeRow(sc);
        if (!vac || typeof vac.main !== "number") continue;
        const extra = [
          typeof vac.partner_18_plus === "number" ? T(locale, `${aud(vac.partner_18_plus)} for each partner or dependant 18+`, `18 yaş üstü her partner/bağımlı için ${aud(vac.partner_18_plus)}`, `每位 18 岁以上的伴侣或受抚养人 ${aud(vac.partner_18_plus)}`) : null,
          typeof vac.child_under_18 === "number" ? T(locale, `${aud(vac.child_under_18)} for each child under 18`, `18 yaş altı her çocuk için ${aud(vac.child_under_18)}`, `每位 18 岁以下儿童 ${aud(vac.child_under_18)}`) : null,
        ].filter(Boolean);
        const source = T(locale, "LogiVisa fee table, Home Affairs charges from 1 July 2026", "LogiVisa ücret tablosu, İçişleri Bakanlığı ücretleri (1 Temmuz 2026'dan itibaren)", "LogiVisa 费用表，内政部 2026 年 7 月 1 日起的收费");
        add(`fee:${sc}`, {
          kind: "fee",
          text: T(
            locale,
            `Correction: the subclass ${sc} visa application charge is ${aud(vac.main)} for the main applicant${extra.length ? `, ${extra.join(", ")}` : ""} (${source}).`,
            `Düzeltme: ${sc} alt sınıfı vize başvuru ücreti ana başvuran için ${aud(vac.main)}${extra.length ? `, ${extra.join(", ")}` : ""} (${source}).`,
            `更正：子类 ${sc} 的签证申请费为主申请人 ${aud(vac.main)}${extra.length ? `，${extra.join("，")}` : ""}（${source}）。`,
          ),
        });
      }
    } else if (c.kind === "gate" && c.topic === "skills_assessment") {
      for (const sc of c.subclasses ?? []) {
        const src = gateSource(sc, `${sc}.skills_assessment`, locale);
        if (!src) continue;
        add(`gate:${sc}:sa`, {
          kind: "gate",
          text: T(
            locale,
            `Correction: subclass ${sc} requires a positive skills assessment (${src}).`,
            `Düzeltme: ${sc} alt sınıfı için olumlu bir beceri değerlendirmesi gerekir (${src}).`,
            `更正：子类 ${sc} 需要正面的技能评估（${src}）。`,
          ),
        });
      }
    } else if (c.kind === "gate" && c.topic === "income_191") {
      const src = T(locale, "Home Affairs – Permanent Residence (Skilled Regional) visa (subclass 191)", "İçişleri Bakanlığı – Kalıcı Oturum (Skilled Regional) vizesi (alt sınıf 191)", "内政部 – 永久居留（技术移民地区）签证（子类 191）");
      add("gate:191:income", {
        kind: "gate",
        text: T(
          locale,
          `Correction: subclass 191 has no minimum income requirement; you provide ATO notices of assessment for 3 income years (${src}).`,
          `Düzeltme: 191 alt sınıfında asgari gelir şartı yoktur; 3 gelir yılı için ATO değerlendirme bildirimlerini sunarsınız (${src}).`,
          `更正：子类 191 没有最低收入要求；您需提供 3 个收入年度的 ATO 评估通知（${src}）。`,
        ),
      });
    } else if (c.kind === "state_availability") {
      const src = T(locale, "LogiVisa State Nomination Tracker", "LogiVisa Eyalet Adaylık Takipçisi", "LogiVisa 州提名追踪器");
      add("state", {
        kind: "state_availability",
        text: T(
          locale,
          `Correction: which states list an occupation and are open to you comes only from the State Nomination Tracker for your own profile; it cannot be stated for "most states" in general (${src}). Fill in your profile to see it.`,
          `Düzeltme: hangi eyaletlerin bir mesleği listelediği ve size açık olduğu yalnızca kendi profilinize ait Eyalet Adaylık Takipçisi'nden gelir; "çoğu eyalet" gibi genel bir ifade verilemez (${src}). Görmek için profilinizi doldurun.`,
          `更正：哪些州列出某职业、且对您开放，只取决于您自己资料对应的州提名追踪器，不能笼统地说“大多数州”（${src}）。请填写您的资料以查看。`,
        ),
      });
    }
  }
  return [...out.values()];
}

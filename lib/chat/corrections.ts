import { evaluateVisaGates } from "@/lib/readiness/visa-gates";
import type { Locale } from "@/lib/readiness/types";

import type { EngineConflict } from "./answer-check";
import { AGE_LIMIT, TRT_EMPLOYMENT, VISA_NAMES, engineFeeRow, gateRowCitation } from "./engine-facts";
import type { PlanFacts } from "./plan-summary";

/**
 * Visible corrections. When the answer check (lib/chat/answer-check.ts) flags a fee, gate or state-availability
 * conflict in a finished answer, the chat appends a short correction block to the same answer: the engine's correct
 * fact with its source. Every fact comes from the data the report uses (fee table, gate matrix with its Home Affairs
 * page, the state tracker rule) -- never from the model. A repeated disclaimer is only logged, not corrected.
 */

export type Correction = { kind: "fee" | "gate" | "state_availability" | "internal_label" | "visa_name" | "trt_period" | "experience_points" | "age_limit" | "status_wording" | "max_potential"; text: string };

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

export function buildCorrections(conflicts: EngineConflict[], locale: Locale, ctx: { plan?: PlanFacts } = {}): Correction[] {
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
    } else if (c.kind === "internal_label") {
      add("internal", {
        kind: "internal_label",
        text: T(
          locale,
          "Correction: any mention of internal section names or terms (for example \"engine facts\", \"gates\", \"reference data\") is not a source and can be ignored. Official sources are cited by document and page; your figures come from your LogiVisa result.",
          "Düzeltme: iç bölüm adlarına veya terimlere (ör. \"engine facts\", \"kapılar\", \"referans verileri\") yapılan göndermeler kaynak değildir, dikkate almayın. Resmi kaynaklar belge ve sayfa olarak gösterilir; rakamlarınız LogiVisa sonucunuzdan gelir.",
          "更正：任何对内部栏目名称或术语（例如“引擎事实”“关卡”“参考数据”）的提及都不是来源，可以忽略。官方来源以文件名和页码标注；您的数字来自您的 LogiVisa 结果。",
        ),
      });
    } else if (c.kind === "visa_name") {
      for (const sc of c.subclasses ?? []) {
        const src = gateRowCitation(sc === "482" ? "482CS.skills_assessment" : `${sc}.skills_assessment`, locale);
        add(`name:${sc}`, {
          kind: "visa_name",
          text: T(
            locale,
            `Correction: subclass ${sc} is the ${VISA_NAMES[sc]} visa${src ? ` (${src})` : ""}.`,
            `Düzeltme: ${sc} alt sınıfı ${VISA_NAMES[sc]} vizesidir${src ? ` (${src})` : ""}.`,
            `更正：子类 ${sc} 是 ${VISA_NAMES[sc]} 签证${src ? `（${src}）` : ""}。`,
          ),
        });
      }
    } else if (c.kind === "trt_period") {
      const src = gateRowCitation("186TRT.sponsored_employment", locale);
      add("trt", {
        kind: "trt_period",
        text: T(
          locale,
          `Correction: the subclass 186 Temporary Residence Transition stream needs ${TRT_EMPLOYMENT.years} years of full-time eligible sponsored employment in the ${TRT_EMPLOYMENT.withinYears} years before you apply${src ? ` (${src})` : ""}.`,
          `Düzeltme: 186 alt sınıfı Temporary Residence Transition akışı, başvurudan önceki ${TRT_EMPLOYMENT.withinYears} yıl içinde ${TRT_EMPLOYMENT.years} yıl tam zamanlı uygun sponsorlu istihdam gerektirir${src ? ` (${src})` : ""}.`,
          `更正：子类 186 临时居留过渡类别要求在申请前的 ${TRT_EMPLOYMENT.withinYears} 年内有 ${TRT_EMPLOYMENT.years} 年全职合资格担保雇佣${src ? `（${src}）` : ""}。`,
        ),
      });
    } else if (c.kind === "experience_points" && c.experience) {
      const { location, years, correct } = c.experience;
      const where = location === "australian" ? T(locale, "skilled employment in Australia", "Avustralya'da nitelikli iş deneyimi", "澳大利亚境内技术工作经验") : T(locale, "skilled employment outside Australia", "Avustralya dışında nitelikli iş deneyimi", "澳大利亚境外技术工作经验");
      add(`exp:${location}:${years}`, {
        kind: "experience_points",
        text: T(
          locale,
          `Correction: ${years} years of ${where} earns ${correct} points (LogiVisa points table, Home Affairs points test).`,
          `Düzeltme: ${years} yıl ${where} ${correct} puan kazandırır (LogiVisa puan tablosu, İçişleri Bakanlığı puan testi).`,
          `更正：${years} 年${where}可得 ${correct} 分（LogiVisa 分数表，内政部积分测试）。`,
        ),
      });
    } else if (c.kind === "age_limit") {
      const src = gateRowCitation("189.age", locale);
      add("age", {
        kind: "age_limit",
        text: T(
          locale,
          `Correction: ${AGE_LIMIT} is an upper limit, not a minimum age: you must be under ${AGE_LIMIT} when you are invited (189 / 190 / 491) or when you apply (186)${src ? ` (${src})` : ""}.`,
          `Düzeltme: ${AGE_LIMIT} bir üst sınırdır, asgari yaş değildir: davet edildiğinizde (189 / 190 / 491) veya başvurduğunuzda (186) ${AGE_LIMIT} yaşından küçük olmalısınız${src ? ` (${src})` : ""}.`,
          `更正：${AGE_LIMIT} 岁是上限而不是最低年龄：获邀时（189 / 190 / 491）或申请时（186）必须未满 ${AGE_LIMIT} 岁${src ? `（${src}）` : ""}。`,
        ),
      });
    } else if (c.kind === "status_wording") {
      for (const sc of c.subclasses ?? []) {
        const st = ctx.plan?.statuses[sc];
        if (!st) continue;
        const steps = st.steps.length ? st.steps.join("; ") : "";
        add(`status:${sc}`, {
          kind: "status_wording",
          text: T(
            locale,
            `Correction: your status for subclass ${sc} is "${st.label}", not "not eligible"${steps ? `; next steps: ${steps}` : ""}.`,
            `Düzeltme: ${sc} alt sınıfı için durumunuz "${st.label}" şeklindedir, "uygun değil" değildir${steps ? `; sonraki adımlar: ${steps}` : ""}.`,
            `更正：您在子类 ${sc} 的状态是“${st.label}”，而不是“不符合”${steps ? `；下一步：${steps}` : ""}。`,
          ),
        });
      }
    } else if (c.kind === "max_potential") {
      const ceiling = ctx.plan?.ceiling;
      add("max", {
        kind: "max_potential",
        text:
          ceiling !== undefined
            ? T(
                locale,
                `Correction: the highest score your own actions can reach before any nomination is ${ceiling}; there is no other "maximum potential" figure.`,
                `Düzeltme: kendi adımlarınızla adaylık öncesinde ulaşabileceğiniz en yüksek puan ${ceiling}'dır; başka bir "maksimum potansiyel" rakamı yoktur.`,
                `更正：仅靠您自己的行动（不含提名）能达到的最高分是 ${ceiling}；不存在其他“最大潜力”数字。`,
              )
            : T(
                locale,
                'Correction: "maximum potential" is not a figure in your LogiVisa result; do not rely on it.',
                'Düzeltme: "maksimum potansiyel" LogiVisa sonucunuzdaki bir rakam değildir; buna güvenmeyin.',
                "更正：“最大潜力”不是您的 LogiVisa 结果中的数字，请勿依赖。",
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

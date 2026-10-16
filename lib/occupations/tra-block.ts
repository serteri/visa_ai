/**
 * The "Skills assessment: Trades Recognition Australia (TRA)" block on occupation pages.
 *
 * Nothing is typed in here that a source defines:
 *   - fee amounts and their labels (en / tr / zh-Hans)   the TRA registry, lib/skills-assessment/authorities/tra-australia.ts
 *   - which program applies to which occupation, and
 *     the passport countries TRA lists for OSAP          lib/skills-assessment/tra-osap.ts
 *   - source documents, page numbers, verification date,
 *     official TRA links                                 src/data/skills-assessment/tra-sources.json
 * The block only arranges them. It states what TRA publishes for the occupation; it never says which program applies to a
 * person, and it is built only for occupations whose registry authority is TRA.
 */
import traSources from "@/src/data/skills-assessment/tra-sources.json";
import { traAustraliaAuthority } from "@/lib/skills-assessment/authorities/tra-australia";
import { resolveLocalized } from "@/lib/skills-assessment/i18n";
import { resolveAssessingAuthority } from "@/lib/skills-assessment/resolve-authority";
import { TRA_OSAP_OCCUPATIONS } from "@/lib/skills-assessment/tra-osap";
import { formatAud } from "@/lib/visas/comparison-content";
import type { Locale } from "@/lib/i18n/config";

export type TraCase = "licensed" | "passport" | "msa_only";

export type TraFeeRow = { program: "MSA" | "OSAP"; label: string; scope: string; amount: string; total: boolean };

export type TraBlock = {
  code: string;
  caseKind: TraCase;
  heading: string;
  intro: string;
  licensedNote?: string;
  labels: {
    authority: string;
    programs: string;
    fees: string;
    colProgram: string;
    colFee: string;
    colScope: string;
    colAmount: string;
    processing: string;
    countries: string;
    verified: string;
    sources: string;
    official: string;
    tools: string;
  };
  authorityName: string;
  programs: Array<{ id: "MSA" | "OSAP"; name: string; summary: string; url: string }>;
  fees: TraFeeRow[];
  processing: Array<{ program: string; text: string }>;
  countries?: { title: string; list: string[] };
  verified: string;
  sourceLines: string[];
  officialLinks: Array<{ label: string; url: string }>;
  toolLinks: Array<{ label: string; path: string; destination: string }>;
  note: string;
};

type S = {
  heading: string;
  intro: Record<TraCase, string>;
  licensedNote: string;
  labels: TraBlock["labels"];
  authorityName: string;
  msaName: string;
  osapName: string;
  msaSummary: string;
  osapSummary: string;
  scope: { msaTotal: string; msaReview: string; osapStage: string; osapTotal: string };
  processing: { msa: string; osap: string };
  countriesTitle: (n: number) => string;
  source: (title: string, pages: string) => string;
  officialMsa: string;
  officialOsap: string;
  pathfinder: string;
  toolSkills: string;
  toolState: string;
  note: string;
  descNote: string;
};

const STRINGS: Record<Locale, S> = {
  en: {
    heading: "Skills assessment: Trades Recognition Australia (TRA)",
    intro: {
      licensed:
        "TRA publishes more than one skills assessment program. TRA's guidelines state that the Migration Skills Assessment (MSA) program is not open to this licensed occupation, and that the Offshore Skills Assessment Program (OSAP) is compulsory for permanent migration in it.",
      passport:
        "TRA publishes more than one skills assessment program. TRA's OSAP occupation list names passport countries for this occupation. TRA's guidelines state that the Migration Skills Assessment (MSA) program is not open to applicants whose passport country and occupation require OSAP, and that an applicant for a listed occupation from another country may still choose OSAP.",
      msa_only:
        "TRA's OSAP occupation list does not include this occupation. TRA's guidelines describe the Migration Skills Assessment (MSA) program, a documentary assessment.",
    },
    licensedNote: "TRA lists exceptions for subclass 482 visa applications (seek advice from the Department of Home Affairs) and subclass 485 visa applications (Provisional Skills Assessment).",
    labels: {
      authority: "Assessing authority",
      programs: "Assessment programs",
      fees: "Published TRA fees",
      colProgram: "Program",
      colFee: "Fee",
      colScope: "What it covers",
      colAmount: "Amount",
      processing: "Processing time (TRA guide only)",
      countries: "Passport countries",
      verified: "Last verified",
      sources: "Sources",
      official: "Official TRA pages",
      tools: "More information",
    },
    authorityName: "Trades Recognition Australia (TRA)",
    msaName: "Migration Skills Assessment (MSA)",
    osapName: "Offshore Skills Assessment Program (OSAP)",
    msaSummary: "A documentary assessment of qualifications and employment history against Australian standards (AQF and ANZSCO).",
    osapSummary:
      "Carried out by a TRA-approved Registered Training Organisation (RTO), with the outcome approved by TRA. Pathway 1 is for applicants without a relevant Australian VET qualification; Pathway 2 is for applicants with one or with a current Australian occupation licence without restrictions.",
    scope: {
      msaTotal: "Total cost to complete the program",
      msaReview: "Review of an outcome, if required (application within 28 calendar days of the outcome)",
      osapStage: "Stage fee, paid separately for each step",
      osapTotal: "Total, up to, if every stage applies",
    },
    processing: {
      msa: "Approximately 120 days. TRA states processing times are a guide only and can change.",
      osap: "Approximately 15 weeks after complete documentary evidence. TRA states processing times are a guide only and can change.",
    },
    countriesTitle: (n) => `Passport countries and regions TRA lists for OSAP in this occupation (${n})`,
    source: (title, pages) => `${title}, ${pages}`,
    officialMsa: "TRA: Migration Skills Assessment Program",
    officialOsap: "TRA: Offshore Skills Assessment Program",
    pathfinder: "TRA: Program Pathfinder",
    toolSkills: "Skills assessment information",
    toolState: "State nomination data",
    note: "General information from TRA's published guidelines. It does not state which program applies to any individual; TRA's Pathfinder and the Department of Home Affairs are the official sources.",
    descNote: " TRA assessment programs and published fees are listed.",
  },
  tr: {
    heading: "Beceri değerlendirmesi: Trades Recognition Australia (TRA)",
    intro: {
      licensed:
        "TRA birden fazla beceri değerlendirme programı yayımlar. TRA'nın kılavuzlarına göre Migration Skills Assessment (MSA) programı bu lisanslı meslek için açık değildir; kalıcı göçte bu meslek için Offshore Skills Assessment Program (OSAP) zorunludur.",
      passport:
        "TRA birden fazla beceri değerlendirme programı yayımlar. TRA'nın OSAP meslek listesi bu meslek için pasaport ülkelerini sayar. TRA'nın kılavuzlarına göre Migration Skills Assessment (MSA) programı, pasaport ülkesi ve mesleği OSAP gerektiren başvuru sahiplerine açık değildir; listedeki bir meslek için başka bir ülkeden başvuran yine de OSAP'ı seçebilir.",
      msa_only:
        "TRA'nın OSAP meslek listesinde bu meslek yer almaz. TRA'nın kılavuzları, belge temelli bir değerlendirme olan Migration Skills Assessment (MSA) programını açıklar.",
    },
    licensedNote: "TRA, alt sınıf 482 vize başvuruları (Department of Home Affairs'ten bilgi alınması belirtilir) ve alt sınıf 485 vize başvuruları (Provisional Skills Assessment) için istisnalar sayar.",
    labels: {
      authority: "Değerlendirme kurumu",
      programs: "Değerlendirme programları",
      fees: "TRA'nın yayımladığı ücretler",
      colProgram: "Program",
      colFee: "Ücret",
      colScope: "Kapsamı",
      colAmount: "Tutar",
      processing: "İşlem süresi (yalnızca TRA rehberi)",
      countries: "Pasaport ülkeleri",
      verified: "Son doğrulama",
      sources: "Kaynaklar",
      official: "Resmî TRA sayfaları",
      tools: "Diğer bilgiler",
    },
    authorityName: "Trades Recognition Australia (TRA)",
    msaName: "Migration Skills Assessment (MSA)",
    osapName: "Offshore Skills Assessment Program (OSAP)",
    msaSummary: "Nitelik ve iş geçmişinin Avustralya standartlarına (AQF ve ANZSCO) göre belge temelli değerlendirmesi.",
    osapSummary:
      "TRA onaylı bir Registered Training Organisation (RTO) tarafından yürütülür; sonuç TRA tarafından onaylanır. Yol 1, ilgili bir Avustralya VET yeterliliği olmayan başvuru sahipleri içindir; Yol 2, böyle bir yeterliliği veya kısıtlamasız geçerli bir Avustralya meslek lisansı olan başvuru sahipleri içindir.",
    scope: {
      msaTotal: "Programı tamamlamanın toplam maliyeti",
      msaReview: "Gerekirse sonucun yeniden incelenmesi (sonuçtan sonraki 28 takvim günü içinde başvuru)",
      osapStage: "Aşama ücreti; her adım için ayrı ödenir",
      osapTotal: "Her aşama geçerliyse toplam, en fazla",
    },
    processing: {
      msa: "Yaklaşık 120 gün. TRA, işlem sürelerinin yalnızca bir rehber olduğunu ve değişebileceğini belirtir.",
      osap: "Belgeler eksiksiz teslim edildikten sonra yaklaşık 15 hafta. TRA, işlem sürelerinin yalnızca bir rehber olduğunu ve değişebileceğini belirtir.",
    },
    countriesTitle: (n) => `TRA'nın bu meslek için OSAP kapsamında saydığı pasaport ülkeleri ve bölgeleri (${n})`,
    source: (title, pages) => `${title}, ${pages}`,
    officialMsa: "TRA: Migration Skills Assessment Program",
    officialOsap: "TRA: Offshore Skills Assessment Program",
    pathfinder: "TRA: Program Pathfinder",
    toolSkills: "Beceri değerlendirmesi bilgileri",
    toolState: "Eyalet adaylık verileri",
    note: "TRA'nın yayımlanmış kılavuzlarından genel bilgi. Hangi programın herhangi bir kişi için geçerli olduğunu belirtmez; resmî kaynaklar TRA Pathfinder ve Department of Home Affairs'tir.",
    descNote: " TRA değerlendirme programları ve yayımlanmış ücretler listelenir.",
  },
  "zh-Hans": {
    heading: "技能评估：Trades Recognition Australia（TRA）",
    intro: {
      licensed:
        "TRA 发布多个技能评估项目。TRA 指南指出，该持牌职业不适用 Migration Skills Assessment（MSA）项目；该职业在永久移民方面必须通过 Offshore Skills Assessment Program（OSAP）。",
      passport:
        "TRA 发布多个技能评估项目。TRA 的 OSAP 职业清单列出了该职业对应的护照国家。TRA 指南指出，护照国家和职业均要求 OSAP 的申请人不适用 Migration Skills Assessment（MSA）项目；清单所列职业、护照来自其他国家的申请人仍可选择 OSAP。",
      msa_only:
        "TRA 的 OSAP 职业清单未列入该职业。TRA 指南介绍了以文件为基础的 Migration Skills Assessment（MSA）项目。",
    },
    licensedNote: "TRA 列出了 482 子类签证申请（请向澳大利亚内政部咨询）和 485 子类签证申请（Provisional Skills Assessment）的例外情形。",
    labels: {
      authority: "评估机构",
      programs: "评估项目",
      fees: "TRA 公布的费用",
      colProgram: "项目",
      colFee: "费用项目",
      colScope: "涵盖内容",
      colAmount: "金额",
      processing: "处理周期（仅为 TRA 参考）",
      countries: "护照国家",
      verified: "最近核对",
      sources: "来源",
      official: "TRA 官方页面",
      tools: "更多信息",
    },
    authorityName: "Trades Recognition Australia（TRA）",
    msaName: "Migration Skills Assessment（MSA）",
    osapName: "Offshore Skills Assessment Program（OSAP）",
    msaSummary: "以文件为基础，将学历证书和工作经历与澳大利亚标准（AQF 和 ANZSCO）进行对照的评估。",
    osapSummary:
      "由 TRA 认可的注册培训机构（RTO）实施，结果由 TRA 批准。途径 1 适用于没有相关澳洲 VET 证书的申请人；途径 2 适用于持有相关澳洲 VET 证书或有效且无限制的澳洲职业执照的申请人。",
    scope: {
      msaTotal: "完成该项目的总费用",
      msaReview: "如需复审结果的费用（须在结果发出后 28 个日历日内申请）",
      osapStage: "阶段费用，每个步骤单独支付",
      osapTotal: "各阶段全部适用时的总计，最高",
    },
    processing: {
      msa: "约 120 天。TRA 说明处理周期仅供参考，可能变化。",
      osap: "文件证据齐全后约 15 周。TRA 说明处理周期仅供参考，可能变化。",
    },
    countriesTitle: (n) => `TRA 就该职业在 OSAP 下列出的护照国家和地区（${n}）`,
    source: (title, pages) => `${title}，${pages}`,
    officialMsa: "TRA：Migration Skills Assessment Program",
    officialOsap: "TRA：Offshore Skills Assessment Program",
    pathfinder: "TRA：Program Pathfinder",
    toolSkills: "技能评估信息",
    toolState: "州提名数据",
    note: "根据 TRA 已公布指南整理的一般信息。本页不说明哪个项目适用于任何个人；官方来源为 TRA Pathfinder 和澳大利亚内政部。",
    descNote: " 列出 TRA 评估项目和已公布费用。",
  },
};

/** Short sentence appended to the meta description of occupations that carry the block. */
export function traDescriptionNote(locale: Locale): string {
  return STRINGS[locale].descNote;
}

function pathway(id: "MSA" | "OSAP") {
  const p = traAustraliaAuthority.pathways.find((x) => x.pathwayId === id);
  if (!p) throw new Error(`tra-australia.ts: no ${id} pathway`);
  return p;
}

/** The block for an occupation whose registry authority is TRA; null for every other occupation. */
export function traBlockFor(code: string, locale: Locale, displayName?: string): TraBlock | null {
  const resolved = resolveAssessingAuthority(code);
  if (resolved.source !== "registry-code" || resolved.authorityId !== "TRA") return null;

  const s = STRINGS[locale];
  const entry = TRA_OSAP_OCCUPATIONS[code];
  const caseKind: TraCase = !entry ? "msa_only" : entry.countries === "ALL" ? "licensed" : "passport";
  const showMsa = caseKind !== "licensed";
  const showOsap = caseKind !== "msa_only";

  const msa = pathway("MSA");
  const osap = pathway("OSAP");
  const L = (v: Parameters<typeof resolveLocalized>[0]) => resolveLocalized(v, locale);

  const fees: TraFeeRow[] = [];
  if (showMsa) {
    for (const f of msa.fees) {
      if (typeof f.amountAUD !== "number") continue;
      const isReview = /review/i.test(typeof f.label === "string" ? f.label : f.label.en);
      fees.push({ program: "MSA", label: L(f.label), scope: isReview ? s.scope.msaReview : s.scope.msaTotal, amount: formatAud(f.amountAUD), total: !isReview });
    }
  }
  if (showOsap) {
    for (const f of osap.fees) {
      if (typeof f.amountAUD !== "number") continue;
      const en = typeof f.label === "string" ? f.label : f.label.en;
      const isTotal = /Total/i.test(en);
      fees.push({ program: "OSAP", label: L(f.label), scope: isTotal ? s.scope.osapTotal : s.scope.osapStage, amount: formatAud(f.amountAUD), total: isTotal });
    }
  }

  const programs: TraBlock["programs"] = [];
  if (showMsa) programs.push({ id: "MSA", name: s.msaName, summary: s.msaSummary, url: traSources.programs.MSA.officialUrl });
  if (showOsap) programs.push({ id: "OSAP", name: s.osapName, summary: s.osapSummary, url: traSources.programs.OSAP.officialUrl });

  const processing: TraBlock["processing"] = [];
  if (showMsa) processing.push({ program: s.msaName, text: s.processing.msa });
  if (showOsap) processing.push({ program: s.osapName, text: s.processing.osap });

  const sourceLines: string[] = [];
  // "4", "5", "4, 13", "6-8" -> "4, 5, 6-8, 13": the sorted union of the named pages, consecutive pages as ranges.
  const pg = (v: Record<string, string>, keys: string[]) => {
    const pages = new Set<number>();
    for (const k of keys)
      for (const part of (v[k] ?? "").split(",")) {
        const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
        if (!m) continue;
        for (let n = Number(m[1]); n <= Number(m[2] ?? m[1]); n++) pages.add(n);
      }
    const sorted = [...pages].sort((a, b) => a - b);
    const out: string[] = [];
    for (let i = 0; i < sorted.length; ) {
      let j = i;
      while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
      out.push(j > i ? `${sorted[i]}-${sorted[j]}` : String(sorted[i]));
      i = j + 1;
    }
    return out.join(", ");
  };
  if (showMsa) sourceLines.push(s.source(traSources.programs.MSA.source.title, `pp. ${pg(traSources.programs.MSA.source.pages, ["what", "fee", "processing", "notOpenTo", "review"])}`));
  if (showOsap) sourceLines.push(s.source(traSources.programs.OSAP.source.title, `pp. ${pg(traSources.programs.OSAP.source.pages, ["what", "licensedCompulsory", "fees", "processing", "occupationCountryList"])}`));
  // MSA's "not open to" rules are what make the licensed case MSA-free; name that document there too.
  if (caseKind === "licensed") sourceLines.unshift(s.source(traSources.programs.MSA.source.title, `p. ${traSources.programs.MSA.source.pages.notOpenTo}`));

  const officialLinks: TraBlock["officialLinks"] = [];
  if (showMsa || caseKind === "licensed") officialLinks.push({ label: s.officialMsa, url: traSources.programs.MSA.officialUrl });
  if (showOsap) officialLinks.push({ label: s.officialOsap, url: traSources.programs.OSAP.officialUrl });
  officialLinks.push({ label: s.pathfinder, url: traSources.authority.pathfinderUrl });

  void displayName;
  return {
    code,
    caseKind,
    heading: s.heading,
    intro: s.intro[caseKind],
    licensedNote: caseKind === "licensed" ? s.licensedNote : undefined,
    labels: s.labels,
    authorityName: s.authorityName,
    programs,
    fees,
    processing,
    countries: entry && entry.countries !== "ALL" ? { title: s.countriesTitle(entry.countries.length), list: entry.countries } : undefined,
    verified: traSources.verified,
    sourceLines,
    officialLinks,
    toolLinks: [
      { label: s.toolSkills, path: "/tools/skills-assessment", destination: "skills_assessment" },
      { label: s.toolState, path: "/tools/state-nomination", destination: "state_nomination" },
    ],
    note: s.note,
  };
}

/** Every string a visitor reads in the block (for the wording scan and tests). */
export function traBlockText(b: TraBlock): string {
  return [
    b.heading,
    b.intro,
    b.licensedNote,
    ...Object.values(b.labels),
    b.authorityName,
    ...b.programs.flatMap((p) => [p.name, p.summary]),
    ...b.fees.flatMap((f) => [f.label, f.scope, f.amount]),
    ...b.processing.flatMap((p) => [p.program, p.text]),
    b.countries?.title,
    ...(b.countries?.list ?? []),
    b.verified,
    ...b.sourceLines,
    ...b.officialLinks.map((l) => l.label),
    ...b.toolLinks.map((l) => l.label),
    b.note,
  ]
    .filter(Boolean)
    .join("\n");
}

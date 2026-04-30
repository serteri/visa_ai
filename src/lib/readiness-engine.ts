import occupationsData from "@/src/data/occupations.json";
import documentRequirementsData from "@/src/data/document-requirements.json";
import visaTrendsData from "@/src/data/visa-trends.json";
import { runReadinessEngine as runBaseReadinessEngine } from "@/lib/readiness/engine";
import { calculateVisaPoints, type AgeRange, type EnglishLevel } from "@/lib/readiness/visa-points-calculator";
import { localizeText, t3 } from "@/src/lib/readiness/localization";
import type {
  DocumentCategory,
  FrictionAnalysisItem,
  FrictionScore,
  ReadinessInput,
  ReadinessReport,
} from "@/lib/readiness/types";

type TrendRecord = {
  occupation_group: string;
  anzsco_code: string;
  estimates: Array<{
    subclass: "189" | "190" | "491";
    last_invited_point?: number;
    estimated_points: number;
    estimated_wait: string;
  }>;
};

type OccupationRecord = {
  anzsco_code: string;
  occupation_name: string;
  authority: string;
};

type RequirementCategory = {
  category: string;
  items: string[];
  appliesTo: string[];
  requiresMarried?: boolean;
};

type RequirementsDataset = {
  baseCategories: RequirementCategory[];
  criticalWarnings: {
    occupationUnconfirmed: string;
  };
};

const TREND_ROWS = (visaTrendsData as { occupation_trends: TrendRecord[] }).occupation_trends;
const OCCUPATION_ROWS = (occupationsData as { occupations: OccupationRecord[] }).occupations;
const REQUIREMENTS = documentRequirementsData as RequirementsDataset;

function normalize(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

function parseAnzscoCode(occupation?: string): string | undefined {
  if (!occupation) return undefined;
  const codeMatch = occupation.match(/(\d{6})/);
  return codeMatch?.[1];
}

function findOccupationRecord(input: ReadinessInput): OccupationRecord | undefined {
  const code = parseAnzscoCode(input.occupation);
  if (code) {
    const byCode = OCCUPATION_ROWS.find((row) => row.anzsco_code === code);
    if (byCode) return byCode;
  }

  const q = normalize(input.occupation);
  if (!q) return undefined;

  const exact = OCCUPATION_ROWS.find((row) => normalize(row.occupation_name) === q);
  if (exact) return exact;

  return OCCUPATION_ROWS.find((row) => normalize(row.occupation_name).includes(q));
}

function findTrendRecord(input: ReadinessInput, occupation?: OccupationRecord): TrendRecord | undefined {
  const code = occupation?.anzsco_code ?? parseAnzscoCode(input.occupation);
  if (code) {
    const byCode = TREND_ROWS.find((row) => row.anzsco_code === code);
    if (byCode) return byCode;
  }

  const q = normalize(input.occupation);
  if (!q) return undefined;

  const exact = TREND_ROWS.find((row) => normalize(row.occupation_group) === q);
  if (exact) return exact;

  return TREND_ROWS.find((row) => normalize(row.occupation_group).includes(q));
}

function parseAgeRange(age?: string): AgeRange | undefined {
  const n = Number((age ?? "").trim());
  if (!Number.isFinite(n)) return undefined;
  if (n >= 18 && n <= 24) return "18_24";
  if (n >= 25 && n <= 32) return "25_32";
  if (n >= 33 && n <= 39) return "33_39";
  if (n >= 40 && n <= 44) return "40_44";
  return "45_plus";
}

function parseEnglishLevel(value?: string): EnglishLevel | undefined {
  const n = normalize(value);
  if (!n) return undefined;
  if (n.includes("superior") || n.includes("pte 79") || n.includes("79+")) return "Superior";
  if (n.includes("proficient") || n.includes("pte 65") || n.includes("65+")) return "Proficient";
  if (n.includes("competent")) return "Competent";
  return undefined;
}

function computeBestKnownScore(input: ReadinessInput, base: ReadinessReport, occupationCode?: string): number {
  const ageRange = parseAgeRange(input.age);
  const englishLevel = parseEnglishLevel(input.englishLevel);

  if (!ageRange || !englishLevel) {
    return base.pointsEstimate?.estimatedPoints ?? 0;
  }

  const points = calculateVisaPoints({
    ageRange,
    englishLevel,
    qualificationLevel: input.qualificationLevel ?? "Bachelor",
    offshoreExperienceYears: input.offshoreExperienceYears ?? 0,
    onshoreExperienceYears: input.onshoreExperienceYears ?? 0,
    anzscoCode: occupationCode,
    occupationName: input.occupation,
    hasNAATI: false,
    hasProfessionalYear: false,
    hasRegionalStudy: false,
    partnerSkilled: false,
  });

  return points.scores.subclass190;
}

function computeUserPointsBySubclass(input: ReadinessInput, base: ReadinessReport, occupationCode?: string): {
  subclass189: number;
  subclass190: number;
  subclass491: number;
} {
  const ageRange = parseAgeRange(input.age);
  const englishLevel = parseEnglishLevel(input.englishLevel);

  if (!ageRange || !englishLevel) {
    const fallback = base.pointsEstimate?.estimatedPoints ?? 0;
    return {
      subclass189: fallback,
      subclass190: fallback,
      subclass491: fallback,
    };
  }

  const points = calculateVisaPoints({
    ageRange,
    englishLevel,
    qualificationLevel: input.qualificationLevel ?? "Bachelor",
    offshoreExperienceYears: input.offshoreExperienceYears ?? 0,
    onshoreExperienceYears: input.onshoreExperienceYears ?? 0,
    anzscoCode: occupationCode,
    occupationName: input.occupation,
    hasNAATI: false,
    hasProfessionalYear: false,
    hasRegionalStudy: false,
    partnerSkilled: false,
  });

  return points.scores;
}

function escalate(current: FrictionScore, next: FrictionScore): FrictionScore {
  const rank: Record<FrictionScore, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    EXTREME: 4,
  };
  return rank[next] > rank[current] ? next : current;
}

function getTrendPoint(estimate?: { last_invited_point?: number; estimated_points: number }): number | undefined {
  if (!estimate) return undefined;
  return estimate.last_invited_point ?? estimate.estimated_points;
}

function toPathwayKey(subclass: string): string {
  return subclass === "820_801" ? "820/801" : subclass;
}

function isMarriedContext(raw?: string): boolean {
  const n = normalize(raw);
  if (!n) return false;
  return ["married", "spouse", "wife", "husband", "eş", "evli", "partner"].some((k) => n.includes(k));
}

function normalizeItems(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = normalize(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function buildPremiumDocumentChecklist(input: ReadinessInput, base: ReadinessReport): DocumentCategory[] {
  const pathwaySet = new Set(base.pathwayComparison.map((p) => toPathwayKey(p.subclass)));
  const married = isMarriedContext(input.sponsorOrFamily);
  const locale = input.locale;

  const categories: DocumentCategory[] = REQUIREMENTS.baseCategories
    .filter((cat) => cat.appliesTo.some((p) => pathwaySet.has(p)))
    .filter((cat) => (cat.requiresMarried ? married : true))
    .map((cat) => {
      const items = [...cat.items];
      if (married && cat.category === "Spouse/Family") {
        if (!items.some((i) => normalize(i).includes("spouse english"))) {
          items.push(localizeText(locale, "Spouse English evidence"));
        }
        if (!items.some((i) => normalize(i).includes("marriage certificate"))) {
          items.push(localizeText(locale, "Marriage Certificate"));
        }
      }
      return {
        category: localizeText(locale, cat.category),
        items: normalizeItems(items).map((item) => localizeText(locale, item)),
      };
    });

  const occupationConfirmed = normalize(input.occupationConfirmed) === "yes";
  if (!occupationConfirmed) {
    categories.unshift({
      category: localizeText(locale, "CRITICAL"),
      items: [localizeText(locale, REQUIREMENTS.criticalWarnings.occupationUnconfirmed)],
    });
  }

  return categories;
}

function buildImmediateActionPlan(input: ReadinessInput, base: ReadinessReport, occupationCode?: string): string[] {
  const locale = input.locale;
  const ageRange = parseAgeRange(input.age);
  const englishLevel = parseEnglishLevel(input.englishLevel);

  const points = ageRange && englishLevel
    ? calculateVisaPoints({
        ageRange,
        englishLevel,
        qualificationLevel: input.qualificationLevel ?? "Bachelor",
        offshoreExperienceYears: input.offshoreExperienceYears ?? 0,
        onshoreExperienceYears: input.onshoreExperienceYears ?? 0,
        anzscoCode: occupationCode,
        occupationName: input.occupation,
        hasNAATI: false,
        hasProfessionalYear: false,
        hasRegionalStudy: false,
        partnerSkilled: false,
      })
    : undefined;

  const score190 = points?.scores.subclass190 ?? 0;
  const expYears = (input.offshoreExperienceYears ?? 0) + (input.onshoreExperienceYears ?? 0);
  const occupationConfirmed = normalize(input.occupationConfirmed) === "yes";
  const lowPointsGap = score190 > 0 && score190 < 85;
  const lowExperienceGap = expYears < 3;

  if (lowPointsGap) {
    return [
      t3(locale, "Focus on PTE/IELTS to reach Superior level (79+) as your primary priority.", "Birincil onceliginiz PTE/IELTS sonucunu Superior seviyesine (79+) cikarmak olmali.", "首要任务是将 PTE/IELTS 提升到 Superior（79+）水平。"),
      t3(locale, "Model a +5 to +15 point pathway immediately (NAATI CCL, state nomination, regional nomination) and set a target subclass sequence.", "Hemen +5 ile +15 puanlik yol senaryosunu modelleyin (NAATI CCL, eyalet adayligi, bolgesel adaylik) ve hedef subclass siralamasi belirleyin.", "立即规划可提升 +5 至 +15 分的路径（NAATI CCL、州担保、偏远地区担保），并确定目标签证顺序。"),
      t3(locale, "Rebuild EOI positioning only after score uplift so invitation competitiveness improves materially.", "EOI konumlamasini ancak puan artisi sonrasinda guncelleyin; boylece davet rekabetiniz anlamli sekilde artar.", "在分数提升后再重建 EOI 定位，以实质提升获邀竞争力。"),
    ];
  }

  if (lowExperienceGap) {
    return [
      t3(locale, "Target Professional Year (PY) or NAATI CCL to compensate for missing experience points.", "Eksik deneyim puanlarini telafi etmek icin Professional Year (PY) veya NAATI CCL hedefleyin.", "可通过 Professional Year（PY）或 NAATI CCL 弥补经验分不足。"),
      t3(locale, "Strengthen employment evidence quality (detailed references, duties mapping, exact dates) to maximize claimable points.", "Talep edilebilir puanlari artirmak icin istihdam kanit kalitesini guclendirin (detayli referans, gorev eslestirme, net tarihler).", "提升工作证明质量（详细推荐信、职责映射、准确日期）以最大化可申报分数。"),
      t3(locale, "Run a timeline strategy that prioritizes nomination pathways while experience depth is still building.", "Deneyim derinligi olusurken adaylik yollarini onceliklendiren bir zaman plani uygulayin.", "在经验仍在累积阶段，优先推进担保类路径的时间策略。"),
    ];
  }

  if (!occupationConfirmed) {
    return [
      t3(locale, "Finalize your occupation strategy first and align ANZSCO mapping with your real employment history.", "Once meslek stratejinizi netlestirin ve ANZSCO eslestirmesini gercek is gecmisinizle hizalayin.", "先明确职业策略，并使 ANZSCO 映射与真实工作经历一致。"),
      t3(locale, "Prioritize Skills Assessment evidence pack quality before any invitation-stage assumptions.", "Davet asamasi varsayimlarindan once Skills Assessment kanit paketinin kalitesini onceliklendirin.", "在任何获邀阶段假设之前，优先提升技能评估材料包质量。"),
      t3(locale, "Sequence English, assessment, and EOI milestones into one controlled evidence timeline.", "Ingilizce, assessment ve EOI kilometre taslarini tek bir kontrollu kanit takvimine yerlestirin.", "将英语、评估和 EOI 里程碑整合到一个可控的证据时间线中。"),
    ];
  }

  return [
    t3(locale, "Maintain score competitiveness through periodic invitation-trend checks and pathway reprioritization.", "Periyodik davet trend kontrolleri ve yol yeniden onceliklendirmesi ile puan rekabetini koruyun.", "通过定期追踪邀请趋势并重排路径优先级，保持分数竞争力。"),
    t3(locale, "Audit every core document category now to reduce post-invitation lodgement pressure.", "Davet sonrasi basvuru baskisini azaltmak icin tum temel belge kategorilerini simdiden denetleyin.", "立即审计所有核心材料类别，降低获邀后的递交压力。"),
    t3(locale, "Prepare a submission-ready evidence bundle so you can act quickly when opportunity windows open.", "Firsat penceresi acildiginda hizli hareket etmek icin basvuruya hazir bir kanit dosyasi olusturun.", "准备可直接递交的证据包，以便在机会窗口出现时快速行动。"),
  ];
}

function buildFrictionItem(input: ReadinessInput, base: ReadinessReport, subclass: string): FrictionAnalysisItem {
  const locale = input.locale;
  const occupation = findOccupationRecord(input);
  const trend = findTrendRecord(input, occupation);
  const scores = computeUserPointsBySubclass(input, base, occupation?.anzsco_code);

  let frictionScore: FrictionScore = "MEDIUM";
  const reality: string[] = [];
  const successSignals: string[] = [];

  const subclassKey = toPathwayKey(subclass);
  const userPoints =
    subclassKey === "189" ? scores.subclass189
    : subclassKey === "190" ? scores.subclass190
    : subclassKey === "491" ? scores.subclass491
    : computeBestKnownScore(input, base, occupation?.anzsco_code);

  const estimate = trend?.estimates.find((e) => e.subclass === subclassKey) ?? undefined;
  const lastInvitedPoint = getTrendPoint(estimate);

  if (["189", "190", "491"].includes(subclassKey)) {
    if (lastInvitedPoint !== undefined) {
      const gap = userPoints - lastInvitedPoint;
      if (gap < -10) {
        frictionScore = "EXTREME";
      } else if (gap >= 0) {
        frictionScore = "LOW";
      } else if (gap <= -6) {
        frictionScore = "HIGH";
      } else {
        frictionScore = "MEDIUM";
      }

      if (frictionScore === "EXTREME") {
        reality.push(t3(locale, `Your current score (${userPoints}) is more than 10 points below the recent ${subclassKey} invitation reference (${lastInvitedPoint}).`, `${subclassKey} son davet referansina gore puaniniz (${userPoints}), 10 puandan fazla geridedir (${lastInvitedPoint}).`, `你当前分数（${userPoints}）较最近 ${subclassKey} 邀请参考分（${lastInvitedPoint}）低超过 10 分。`));
      } else if (frictionScore === "LOW") {
        reality.push(t3(locale, `You are currently at or above the recent ${subclassKey} invitation reference (${lastInvitedPoint}).`, `Puaniniz su anda ${subclassKey} son davet referansina esit veya ustundedir (${lastInvitedPoint}).`, `你当前分数已达到或超过最近 ${subclassKey} 邀请参考分（${lastInvitedPoint}）。`));
      } else if (frictionScore === "HIGH") {
        reality.push(t3(locale, `You are close but still behind recent ${subclassKey} invitation movement (${userPoints} vs ${lastInvitedPoint}).`, `${subclassKey} son davet hareketine yakinsiniz ancak hala geridesiniz (${userPoints} vs ${lastInvitedPoint}).`, `你已接近最近 ${subclassKey} 邀请区间，但仍略低（${userPoints} vs ${lastInvitedPoint}）。`));
      } else {
        reality.push(t3(locale, `You are within a manageable range of recent ${subclassKey} invitation movement (${userPoints} vs ${lastInvitedPoint}).`, `${subclassKey} son davet hareketine gore yonetilebilir bir araliktasiniz (${userPoints} vs ${lastInvitedPoint}).`, `你与最近 ${subclassKey} 邀请区间差距可控（${userPoints} vs ${lastInvitedPoint}）。`));
      }
    } else {
      reality.push(t3(locale, `No recent invitation point benchmark was matched for ${subclassKey}; score pressure is estimated from profile-only indicators.`, `${subclassKey} icin guncel davet puan referansi eslesmedi; puan baskisi yalnizca profil gostergelerine gore tahmin edildi.`, `${subclassKey} 未匹配到最新邀请分参考；当前竞争压力基于档案指标估算。`));
    }

    if (subclassKey === "189" && ["221111", "261313"].includes(occupation?.anzsco_code ?? "") && userPoints < 90) {
      frictionScore = userPoints < 85 ? "EXTREME" : escalate(frictionScore, "HIGH");
      reality.push(t3(locale, "This occupation is highly competitive for 189; sub-90 points profiles typically face elevated selection pressure.", "Bu meslek 189 icin oldukca rekabetcidir; 90 alti puan profilleri genellikle yuksek secilim baskisi gorur.", "该职业在 189 路径上竞争激烈；90 分以下档案通常面临更高筛选压力。"));
    }
  }

  if (["189", "190", "491"].includes(subclassKey) && occupation?.authority === "ACS" && (input.offshoreExperienceYears ?? 0) < 2) {
    frictionScore = "EXTREME";
    reality.push(t3(locale, "ACS experience deduction risk is high because declared experience is below 2 years.", "Beyan edilen deneyim 2 yilin altinda oldugu icin ACS deneyim kesintisi riski yuksektir.", "因申报经验不足 2 年，ACS 经验扣减风险较高。"));
  }

  if (subclassKey === "820/801") {
    frictionScore = "MEDIUM";
    reality.push(t3(locale, "Relationship evidence preparation is documentation-heavy and consistency-sensitive.", "Iliski kaniti hazirligi belge yogundur ve tutarlilik hassasiyeti yuksektir.", "关系证明准备材料量大且对一致性要求高。"));
  }

  if (subclassKey === "482") {
    frictionScore = "HIGH";
    reality.push(t3(locale, "Employer sponsorship dependency creates a practical bottleneck even with a valid profile.", "Profil uygun olsa bile isveren sponsoruna bagimlilik pratikte darbogaz yaratir.", "即使档案合格，雇主担保依赖仍会形成现实瓶颈。"));
  }

  const english = parseEnglishLevel(input.englishLevel);
  if (english === "Superior") {
    successSignals.push(t3(locale, "Superior English is a strong competitiveness signal.", "Superior seviye Ingilizce rekabet gucunu artiran guclu bir sinyaldir.", "英语达到 Superior 水平是强竞争力信号。"));
  }
  if ((input.offshoreExperienceYears ?? 0) >= 5) {
    successSignals.push(t3(locale, "Sustained offshore experience strengthens profile depth.", "Surdurulebilir yurtdisi deneyimi profil derinligini guclendirir.", "持续的境外经验可增强档案深度。"));
  }
  if (subclassKey === "491" && input.regionalWilling) {
    successSignals.push(t3(locale, "Regional intent aligns with nomination incentives.", "Bolgesel niyet, adaylik tesvikleriyle uyumludur.", "偏远地区意向与提名激励机制相匹配。"));
  }
  if (["190", "491"].includes(subclassKey)) {
    successSignals.push(t3(locale, "Nomination pathways provide additional score leverage compared with pure independent routes.", "Adaylik yollari, bagimsiz yollara gore ek puan avantaji saglar.", "相较纯独立路径，提名路径可提供额外分数杠杆。"));
  }

  if (["189", "190", "491"].includes(subclassKey) && lastInvitedPoint !== undefined && userPoints >= lastInvitedPoint) {
    successSignals.push(t3(locale, "Your points currently meet or exceed the latest invitation reference for this pathway.", "Puaniniz bu yol icin guncel davet referansina esit veya ustundedir.", "你当前分数已达到或超过该路径最近邀请参考分。"));
  }

  if (subclassKey === "820/801" || subclassKey === "482") {
    successSignals.push(t3(locale, "Outcome quality depends strongly on evidence quality, sequence control, and process timing.", "Sonuc kalitesi; kanit kalitesi, surec siralamasi ve zamanlamaya guclu bicimde baglidir.", "结果质量高度依赖证据质量、流程顺序控制与时间节点。"));
  }

  return {
    pathway: subclassKey,
    frictionScore,
    realityCheck: reality.join(" ") || t3(locale, "No major friction trigger detected from available profile data.", "Mevcut profil verilerine gore belirgin bir surtunme tetikleyicisi tespit edilmedi.", "根据现有档案数据，未检测到显著阻力触发因素。"),
    successSignals: successSignals.length ? successSignals : [t3(locale, "Profile can improve with stronger evidence completeness and timing discipline.", "Profil; kanit butunlugu ve zamanlama disiplini ile daha da guclenebilir.", "通过增强证据完整性与时间管理，档案仍可进一步优化。")],
  };
}

function buildFrictionAnalysis(input: ReadinessInput, base: ReadinessReport): FrictionAnalysisItem[] {
  const subclasses = base.pathwayComparison.map((item) => item.subclass);
  const unique = Array.from(new Set(subclasses));
  return unique.map((subclass) => buildFrictionItem(input, base, subclass));
}

export function runReadinessEngine(input: ReadinessInput): ReadinessReport {
  const base = runBaseReadinessEngine(input);
  const occupation = findOccupationRecord(input);
  return {
    ...base,
    documentChecklist: buildPremiumDocumentChecklist(input, base),
    suggestedNextSteps: buildImmediateActionPlan(input, base, occupation?.anzsco_code),
    frictionAnalysis: buildFrictionAnalysis(input, base),
  };
}

export { buildLeadQuality } from "@/lib/readiness/engine";

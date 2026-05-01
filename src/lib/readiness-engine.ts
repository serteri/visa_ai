import occupationsData from "@/src/data/occupations.json";
import documentRequirementsData from "@/src/data/document-requirements.json";
import visaTrendsData from "@/src/data/visa-trends.json";
import { runReadinessEngine as runBaseReadinessEngine } from "@/lib/readiness/engine";
import { calculateVisaPoints, type AgeRange, type EnglishLevel } from "@/lib/readiness/visa-points-calculator";
import { localizeOccupationWarning, localizeText, t3 } from "@/src/lib/readiness/localization";
import type {
  DocumentCategory,
  ConfidenceLevel,
  FrictionAnalysisItem,
  FrictionScore,
  PositionChanger,
  ReadinessInput,
  ReadinessReport,
} from "@/lib/readiness/types";

type TrendRecord = {
  occupation_group: string;
  occupation_group_zh?: string;
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
  critical_warning?: string;
};

type RequirementCategory = {
  category: string;
  category_zh?: string;
  items: string[];
  items_zh?: string[];
  appliesTo: string[];
  requiresMarried?: boolean;
};

type RequirementsDataset = {
  baseCategories: RequirementCategory[];
  criticalWarnings: {
    occupationUnconfirmed: string;
    occupationUnconfirmed_zh?: string;
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

  const exact = TREND_ROWS.find(
    (row) => normalize(row.occupation_group) === q || normalize(row.occupation_group_zh) === q
  );
  if (exact) return exact;

  return TREND_ROWS.find((row) => {
    const zh = normalize(row.occupation_group_zh);
    return normalize(row.occupation_group).includes(q) || (zh ? zh.includes(q) || q.includes(zh) : false);
  });
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
  if (n.includes("superior") || n.includes("高级") || n.includes("优秀") || n.includes("pte 79") || n.includes("79+")) return "Superior";
  if (n.includes("proficient") || n.includes("熟练") || n.includes("pte 65") || n.includes("65+")) return "Proficient";
  if (n.includes("competent") || n.includes("合格")) return "Competent";
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

function getRequirementCategoryLabel(locale: ReadinessInput["locale"], category: RequirementCategory): string {
  if (locale === "zh-Hans") return category.category_zh ?? localizeText(locale, category.category);
  return localizeText(locale, category.category);
}

function getRequirementItems(locale: ReadinessInput["locale"], category: RequirementCategory): string[] {
  if (locale === "zh-Hans" && category.items_zh?.length) return category.items_zh;
  return category.items;
}

function buildPremiumDocumentChecklist(input: ReadinessInput, base: ReadinessReport): DocumentCategory[] {
  const pathwaySet = new Set(base.pathwayComparison.map((p) => toPathwayKey(p.subclass)));
  const married = isMarriedContext(input.sponsorOrFamily);
  const locale = input.locale;

  const categories: DocumentCategory[] = REQUIREMENTS.baseCategories
    .filter((cat) => cat.appliesTo.some((p) => pathwaySet.has(p)))
    .filter((cat) => (cat.requiresMarried ? married : true))
    .map((cat) => {
      const items = [...getRequirementItems(locale, cat)];
      if (married && cat.category === "Spouse/Family" && !(locale === "zh-Hans" && cat.items_zh?.length)) {
        if (!items.some((i) => normalize(i).includes("spouse english"))) {
          items.push(localizeText(locale, "Spouse English evidence"));
        }
        if (!items.some((i) => normalize(i).includes("marriage certificate"))) {
          items.push(localizeText(locale, "Marriage Certificate"));
        }
      }
      return {
        category: getRequirementCategoryLabel(locale, cat),
        items: normalizeItems(items).map((item) => localizeText(locale, item)),
      };
    });

  const occupationConfirmed = normalize(input.occupationConfirmed) === "yes";
  if (!occupationConfirmed) {
    categories.unshift({
      category: localizeText(locale, "CRITICAL"),
      items: [
        locale === "zh-Hans" && REQUIREMENTS.criticalWarnings.occupationUnconfirmed_zh
          ? REQUIREMENTS.criticalWarnings.occupationUnconfirmed_zh
          : localizeText(locale, REQUIREMENTS.criticalWarnings.occupationUnconfirmed),
      ],
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
      t3(locale, "Data analysis indicates a material gap between the current points profile and recent invitation references, with English score weight acting as a major variable.", "Veri analizi, mevcut puan profili ile yakin donem davet referanslari arasinda belirgin bir fark oldugunu ve Ingilizce puan agirliginin ana degiskenlerden biri oldugunu gostermektedir.", "数据分析显示，当前分数画像与近期邀请参考之间存在明显差距，其中英语分值权重是主要变量之一。"),
      t3(locale, "Scenario modelling shows that +5 to +15 point changes linked to nomination or language-related variables can materially alter the comparative position.", "Senaryo modellemesi, adaylik veya dil baglantili degiskenlerdeki +5 ile +15 puanlik farklarin karsilastirmali konumu anlamli bicimde degistirebildigini gostermektedir.", "情景建模显示，与提名或语言相关变量有关的 +5 至 +15 分变化，可能明显改变相对位置。"),
      t3(locale, "Historical invitation movement suggests EOI competitiveness is more sensitive when score uplift variables are not yet reflected in the profile.", "Tarihsel davet hareketleri, puan artisi degiskenleri profile yansimadiginda EOI rekabet baskisinin arttigini gostermektedir.", "历史邀请走势显示，当加分变量尚未反映到档案中时，EOI 竞争压力会更高。"),
    ];
  }

  if (lowExperienceGap) {
    return [
      t3(locale, "The current experience profile sits below the range commonly associated with stronger points-table outcomes in comparable skilled cases.", "Mevcut deneyim profili, benzer nitelikli vakalarda daha guclu puan tablosu sonuclarina eslik eden araligin altinda kalmaktadir.", "当前经验画像低于同类技术案例中通常对应更强打分结果的区间。"),
      t3(locale, "Employment-evidence quality remains a major reporting variable because duties mapping, reference depth, and date precision can change claimable-point interpretation.", "Gorev eslestirmesi, referans derinligi ve tarih kesinligi talep edilebilir puan yorumunu degistirebildigi icin istihdam kaniti kalitesi ana raporlama degiskenlerinden biridir.", "由于职责映射、推荐信深度和日期精确度会改变可计分解释，工作证明质量仍是主要报告变量。"),
      t3(locale, "Comparative pathway modelling suggests nomination-linked pathways may remain more resilient while experience depth is still limited.", "Karsilastirmali yol modellemesi, deneyim derinligi sinirliyken adaylik baglantili yollarin goreli olarak daha dayanikli kalabildigini gostermektedir.", "比较路径建模显示，在经验深度仍有限时，与提名相关的路径可能保持相对更强韧。"),
    ];
  }

  if (!occupationConfirmed) {
    return [
      t3(locale, "Occupation alignment remains unresolved, so ANZSCO matching and work-history classification are still driving uncertainty in the dataset.", "Meslek uyumu henuz netlesmedigi icin ANZSCO eslestirmesi ve is gecmisi siniflamasi veri setindeki belirsizligin ana kaynaklari olmaya devam etmektedir.", "职业匹配尚未明确，因此 ANZSCO 匹配和工作经历分类仍是数据集不确定性的主要来源。"),
      t3(locale, "Skills-assessment evidence quality is a dominant variable because occupation coding and evidence structure affect how the profile is interpreted in comparison models.", "Meslek kodlamasi ve kanit yapisi, profilin karsilastirma modellerinde nasil yorumlandigini etkiledigi icin skills-assessment kanit kalitesi baskin bir degiskendir.", "由于职业编码和证据结构会影响档案在比较模型中的解释方式，技能评估证据质量是主导变量。"),
      t3(locale, "Sequence uncertainty across English, assessment, and EOI milestones is currently reducing reporting confidence for skilled-pathway comparisons.", "Ingilizce, assessment ve EOI kilometre taslari arasindaki sira belirsizligi, nitelikli yol karsilastirmalari icin raporlama guvenini azaltmaktadir.", "英语、评估与 EOI 里程碑之间的顺序不确定性，当前正在降低技术路径比较的报告置信度。"),
    ];
  }

  return [
    t3(locale, "Current signals place the profile within a comparatively workable range, but invitation-trend volatility remains a live variable in competitive pathways.", "Mevcut sinyaller, profili goreli olarak islenebilir bir aralikta konumlandiriyor; ancak davet trendi oynakligi rekabetci yollarda hala aktif bir degiskendir.", "当前信号将档案放在相对可操作的区间内，但在竞争性路径中，邀请趋势波动仍是一个持续变量。"),
    t3(locale, "Document-category completeness is materially linked to report confidence and to how quickly the profile can be re-evaluated when source conditions change.", "Belge kategorisi tamligi, rapor guveniyle ve kaynak kosullari degistiginde profilin ne kadar hizli yeniden degerlendirilebilecegiyle dogrudan iliskilidir.", "材料类别完整度与报告置信度，以及在源条件变化时重新评估档案的速度有实质关联。"),
    t3(locale, "Evidence-bundle consistency appears to be the remaining variable separating a baseline-compatible profile from a stronger comparative position.", "Kanit dosyasi tutarliligi, temel olarak uyumlu bir profil ile daha guclu bir karsilastirmali konum arasinda kalan degisken gibi gorunmektedir.", "证据包一致性看起来仍是区分基线兼容档案与更强相对位置的剩余变量。"),
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
        reality.push(t3(locale, `Historical invitation data indicates the current score (${userPoints}) sits more than 10 points below the recent ${subclassKey} reference (${lastInvitedPoint}).`, `${subclassKey} icin tarihsel davet verisi, mevcut puanin (${userPoints}) yakin donem referansinin (${lastInvitedPoint}) 10 puandan fazla altinda oldugunu gostermektedir.`, `历史邀请数据表明，当前分数（${userPoints}）较近期 ${subclassKey} 参考分（${lastInvitedPoint}）低超过 10 分。`));
      } else if (frictionScore === "LOW") {
        reality.push(t3(locale, `Historical invitation data indicates the current score (${userPoints}) is at or above the recent ${subclassKey} reference (${lastInvitedPoint}).`, `${subclassKey} icin tarihsel davet verisi, mevcut puanin (${userPoints}) yakin donem referansina esit veya ustunde oldugunu gostermektedir (${lastInvitedPoint}).`, `历史邀请数据表明，当前分数（${userPoints}）已达到或超过近期 ${subclassKey} 参考分（${lastInvitedPoint}）。`));
      } else if (frictionScore === "HIGH") {
        reality.push(t3(locale, `Historical invitation movement shows the current score is close to, but still below, recent ${subclassKey} references (${userPoints} vs ${lastInvitedPoint}).`, `${subclassKey} icin tarihsel davet hareketi, mevcut puanin yakin donem referanslara yakin ancak hala altinda oldugunu gostermektedir (${userPoints} vs ${lastInvitedPoint}).`, `历史邀请走势显示，当前分数已接近近期 ${subclassKey} 参考区间，但仍略低（${userPoints} vs ${lastInvitedPoint}）。`));
      } else {
        reality.push(t3(locale, `Historical invitation movement places the current score within a comparatively narrow range of recent ${subclassKey} references (${userPoints} vs ${lastInvitedPoint}).`, `${subclassKey} icin tarihsel davet hareketi, mevcut puani yakin donem referanslara gore goreli olarak dar bir aralikta konumlandirmaktadir (${userPoints} vs ${lastInvitedPoint}).`, `历史邀请走势表明，当前分数与近期 ${subclassKey} 参考分之间的差距相对可控（${userPoints} vs ${lastInvitedPoint}）。`));
      }
    } else {
      reality.push(t3(locale, `No recent invitation point benchmark was matched for ${subclassKey}; score pressure is estimated from profile-only indicators.`, `${subclassKey} icin guncel davet puan referansi eslesmedi; puan baskisi yalnizca profil gostergelerine gore tahmin edildi.`, `${subclassKey} 未匹配到最新邀请分参考；当前竞争压力基于档案指标估算。`));
    }

    if (subclassKey === "189" && ["221111", "261313"].includes(occupation?.anzsco_code ?? "") && userPoints < 90) {
      frictionScore = userPoints < 85 ? "EXTREME" : escalate(frictionScore, "HIGH");
      reality.push(t3(locale, "Historical 189 patterns for this occupation show stronger selection pressure on profiles below 90 points.", "Bu meslek icin 189 tarihsel desenleri, 90 alti profillerde daha yuksek secilim baskisina isaret etmektedir.", "该职业在 189 路径的历史模式显示，90 分以下档案通常面临更高筛选压力。"));
    }
  }

  if (["189", "190", "491"].includes(subclassKey) && occupation?.authority === "ACS" && (input.offshoreExperienceYears ?? 0) < 2) {
    frictionScore = "EXTREME";
    reality.push(t3(locale, "ACS experience deduction risk is high because declared experience is below 2 years.", "Beyan edilen deneyim 2 yilin altinda oldugu icin ACS deneyim kesintisi riski yuksektir.", "因申报经验不足 2 年，ACS 经验扣减风险较高。"));
  }

  const localizedOccupationWarning = localizeOccupationWarning(locale, occupation?.critical_warning);
  if (localizedOccupationWarning) {
    reality.push(localizedOccupationWarning);
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
    successSignals.push(t3(locale, "The dataset records a high English-score profile, which improves relative positioning in points-tested comparisons.", "Veri seti, yuksek Ingilizce puanli bir profili kaydetmektedir; bu durum puan testli karsilastirmalarda goreli konumu iyilestirir.", "数据集中记录的是高英语分档案，这会改善打分制比较中的相对位置。"));
  }
  if ((input.offshoreExperienceYears ?? 0) >= 5) {
    successSignals.push(t3(locale, "Sustained offshore experience increases profile depth within the comparison model.", "Surdurulebilir yurtdisi deneyimi, karsilastirma modeli icinde profil derinligini artirir.", "持续的境外经验会提高比较模型中的档案深度。"));
  }
  if (subclassKey === "491" && input.regionalWilling) {
    successSignals.push(t3(locale, "Regional willingness aligns with a core data variable used in 491 nomination comparisons.", "Bolgesel istek, 491 adaylik karsilastirmalarinda kullanilan temel veri degiskenlerinden biriyle uyumludur.", "偏远地区意向与 491 提名比较中使用的核心数据变量之一相匹配。"));
  }
  if (["190", "491"].includes(subclassKey)) {
    successSignals.push(t3(locale, "Nomination-linked pathways incorporate additional points-table variables compared with independent routes.", "Adaylik baglantili yollar, bagimsiz yollara gore ek puan tablosu degiskenleri icerir.", "与独立路径相比，提名相关路径会纳入额外的打分变量。"));
  }

  if (["189", "190", "491"].includes(subclassKey) && lastInvitedPoint !== undefined && userPoints >= lastInvitedPoint) {
    successSignals.push(t3(locale, "The current score meets or exceeds the latest invitation reference observed for this pathway.", "Mevcut puan, bu yol icin gozlenen en guncel davet referansina esit veya ustundedir.", "当前分数已达到或超过该路径观察到的最近邀请参考分。"));
  }

  if (subclassKey === "820/801" || subclassKey === "482") {
    successSignals.push(t3(locale, "Evidence quality, sequence control, and process timing remain dominant variables in this pathway comparison.", "Kanit kalitesi, surec siralamasi ve zamanlama bu yol karsilastirmasinda baskin degiskenler olarak kalmaktadir.", "证据质量、流程顺序控制与时间节点仍是该路径比较中的主导变量。"));
  }

  return {
    pathway: subclassKey,
    frictionScore,
    realityCheck: reality.join(" ") || t3(locale, "No major friction trigger detected from available profile data.", "Mevcut profil verilerine gore belirgin bir surtunme tetikleyicisi tespit edilmedi.", "根据现有档案数据，未检测到显著阻力触发因素。"),
    successSignals: successSignals.length ? successSignals : [t3(locale, "Evidence completeness and timing discipline remain material variables in the baseline comparison.", "Kanit butunlugu ve zamanlama disiplini, temel karsilastirmada onemli degiskenler olarak kalmaktadir.", "证据完整性与时间管理仍是基线比较中的重要变量。")],
  };
}

function buildFrictionAnalysis(input: ReadinessInput, base: ReadinessReport): FrictionAnalysisItem[] {
  const subclasses = base.pathwayComparison.map((item) => item.subclass);
  const unique = Array.from(new Set(subclasses));
  return unique.map((subclass) => buildFrictionItem(input, base, subclass));
}

const ZH_VISA_NAMES: Record<string, string> = {
  "500": "500 学生签证",
  "485": "485 临时毕业生签证",
  "482": "482 雇主担保技术需求签证",
  "189": "189 独立技术移民",
  "190": "190 州担保技术移民",
  "491": "491 偏远地区技术移民",
  "820_801": "820/801 境内配偶签证",
  general: "一般评估",
};

const ZH_REQUIREMENT_MAP: Record<string, string> = {
  "Age and English information relevant to a points-tested pathway": "与打分制路径相关的年龄和英语信息",
  "Occupation and skills assessment context": "职业和技能评估背景",
  "State or territory nomination context": "州或领地提名背景",
  "General context relevant to the invitation requirement": "与获邀要求相关的一般背景",
  "Regional nomination or relative sponsorship context": "偏远地区提名或合资格亲属担保背景",
  "Employer sponsorship context": "雇主担保背景",
  "Occupation and experience information aligned with the role": "与岗位匹配的职业和经验信息",
  "Supporting information relevant to English and employment conditions": "与英语和雇佣条件相关的支持信息",
  "Partner sponsorship status context": "配偶担保人身份背景",
  "Information relevant to the nature and continuity of the relationship": "与关系真实性和持续性相关的信息",
  "Supporting context about living arrangements or shared life": "同居安排或共同生活的支持背景",
};

const ZH_EVIDENCE_LABEL_MAP: Record<string, string> = {
  "English evidence": "英语能力证明",
  "Occupation details": "职业细节",
  "Skills assessment": "职业评估",
  "Points table position": "打分项定位",
  "Relationship evidence": "关系证明材料",
  "Sponsor evidence": "担保人资料",
  "Identity documents": "身份证明文件",
  "Identity and passport": "身份与护照文件",
  "Occupation and skills evidence": "职业与职业评估材料",
  "Sponsorship evidence": "担保材料",
  "Health, character, and translation documents": "体检、品格与翻译文件",
};

const ZH_POSITION_CHANGER_MAP: Record<string, { label: string; explanation: string }> = {
  "Nomination context": {
    label: "州/领地提名条件",
    explanation: "州或领地的职业清单、邀请批次和担保标准会直接影响 190/491 路径的竞争力。",
  },
  "Sponsor or relationship evidence": {
    label: "担保或关系证明材料",
    explanation: "担保人资格、关系持续性和共同生活证据会影响配偶或担保类路径的材料强度。",
  },
  "Points-table factors": {
    label: "打分项变化",
    explanation: "年龄、英语、工作经验、学历、配偶因素和 NAATI 等加分项变化，会改变初步打分估算。",
  },
  "English test category": {
    label: "英语考试等级",
    explanation: "英语等级从合格、熟练到高级的变化，可能显著改变技术移民路径的相对位置。",
  },
  "Skills assessment": {
    label: "职业评估",
    explanation: "职业评估结果、评估机构要求和工作经验证据，是技术移民材料准备的核心门槛。",
  },
  "Evidence preparation level": {
    label: "材料准备程度",
    explanation: "材料完整性、文件一致性和翻译质量会影响报告可信度以及后续递交准备顺序。",
  },
};

const ZH_FINANCIAL_CATEGORY_MAP: Record<string, string> = {
  "Government application charge": "政府签证申请费",
  "English test cost category": "英语考试费用",
  "Skills assessment cost category": "职业评估费用",
  "Health checks / police certificates": "体检与无犯罪证明",
  "Translation / document preparation": "翻译与材料整理",
  "Agent / professional review": "注册移民代理/专业审核费用",
};

const ZH_FINANCIAL_AMOUNT_MAP: Record<string, string> = {
  "From AUD 4,910 (main applicant)": "主申请人约 4,910 澳元起",
  "Variable / depends on provider": "视服务机构而定",
  "Variable / depends on assessing authority": "视评估机构而定",
  "Variable / depends on country and provider": "视所在国家和服务机构而定",
  "Variable / depends on document volume": "视文件数量而定",
};

const ZH_FINANCIAL_EXPLANATION_MAP: Record<string, string> = {
  "The government visa application charge is paid to the Department of Home Affairs and may change over time.": "该费用向澳大利亚内政部缴纳，金额会随政策和收费标准调整。",
  "English testing fees vary by test provider and location.": "英语考试费用因考试机构、考点和报名时间而异。",
  "Skills assessment fees depend on the assessing authority and occupation.": "职业评估费用取决于评估机构、职业类别和所需材料范围。",
  "Health examinations and police certificates are commonly required and vary by country/provider.": "体检与无犯罪证明通常按个人背景、所在国家和指定机构收费。",
  "Translation, certification, and document preparation costs depend on document volume.": "翻译、公证或认证费用通常随文件数量、语言和紧急程度变化。",
  "Professional review or registered migration agent fees vary by service scope.": "注册移民代理或专业审核费用取决于服务范围、复杂度和是否包含后续递交支持。",
};

function zhVisaName(subclass: string, fallback: string): string {
  return ZH_VISA_NAMES[subclass] ?? fallback;
}

function zhConfidence(level: ConfidenceLevel): ConfidenceLevel {
  return level;
}

function zhPathwayReason(subclass: string): string {
  const name = zhVisaName(subclass, subclass);
  if (subclass === "189") return `${name} 是打分制技术移民路径，通常需要递交 EOI 并获得邀请。本内容仅为一般信息，具体情况取决于个人背景。`;
  if (subclass === "190") return `${name} 是打分制技术移民路径，通常需要获得州或领地提名。本内容仅为一般信息，具体情况取决于个人背景。`;
  if (subclass === "491") return `${name} 是偏远地区技术移民路径，通常涉及州/领地提名或合资格亲属担保。本内容仅为一般信息，具体情况取决于个人背景。`;
  if (subclass === "482") return `${name} 以雇主担保和岗位匹配为核心。本内容仅为一般信息，具体情况取决于个人背景。`;
  if (subclass === "820_801") return `${name} 通常围绕配偶关系证据、担保人背景和境内申请阶段进行评估。本内容仅为一般信息，具体情况取决于个人背景。`;
  if (subclass === "500") return `${name} 通常围绕课程注册、学习目的和资金安排进行评估。本内容仅为一般信息。`;
  if (subclass === "485") return `${name} 通常适用于符合条件的澳大利亚近期毕业生。本内容仅为一般信息。`;
  return "现有信息尚不足以确定单一签证路径。补充目标、职业和担保背景后，可进行更完整的结构化评估。";
}

function zhPathwayRisks(subclass: string, estimatedPoints?: number): string[] {
  const risks: string[] = [];
  if (["189", "190", "491"].includes(subclass) && estimatedPoints !== undefined && estimatedPoints < 65) {
    risks.push(`当前部分打分信号为 ${estimatedPoints}，低于常见最低门槛，可能限制打分制路径竞争力。`);
  }
  if (subclass === "189") risks.push("189 独立技术移民受邀请轮次和分数竞争影响较大。");
  if (subclass === "190") risks.push("190 州担保技术移民还取决于州或领地提名设置及职业需求。");
  if (subclass === "491") risks.push("491 偏远地区技术移民还取决于偏远地区提名或合资格担保背景。");
  if (subclass === "482") risks.push("482 路径高度依赖雇主担保、岗位真实性和职业匹配。");
  if (subclass === "820_801") risks.push("820/801 配偶签证对关系证据的一致性和完整性要求较高。");
  return risks.length ? risks : ["现有信息提供了初步路径信号，但个人背景和证据质量仍可能改变判断。"];
}

function localizeEvidenceLabel(label: string): string {
  return ZH_EVIDENCE_LABEL_MAP[label] ?? localizeText("zh-Hans", label);
}

function localizePositionChanger(item: PositionChanger): PositionChanger {
  const mapped = ZH_POSITION_CHANGER_MAP[item.label];
  if (mapped) return mapped;
  return {
    label: localizeText("zh-Hans", item.label),
    explanation: "该因素明确后，可重新评估路径匹配度、初步打分估算和材料准备顺序。",
  };
}

function localizeKeyVisaPathway(pathway: string): string {
  if (pathway.includes("189")) return "189 独立技术移民";
  if (pathway.includes("190")) return "190 州担保技术移民";
  if (pathway.includes("491")) return "491 偏远地区技术移民";
  if (pathway.includes("482")) return "482 雇主担保技术需求签证";
  if (pathway.includes("820") || pathway.includes("801")) return "820/801 境内配偶签证";
  if (pathway.includes("500")) return "500 学生签证";
  if (pathway.includes("485")) return "485 临时毕业生签证";
  return localizeText("zh-Hans", pathway);
}

function localizeFinancialExplanation(category: string, explanation: string): string {
  if (category === "Government application charge") {
    return "政府签证申请费按澳大利亚内政部收费标准缴纳，金额可能随政策更新调整。";
  }
  if (category === "English test cost category") {
    return "英语考试费用会因考试机构、考点、报名时间以及是否需要重考而变化。";
  }
  if (category === "Skills assessment cost category") {
    return "职业评估费用取决于评估机构、职业类别、学历和工作经验证明的复杂度。";
  }
  if (category === "Health checks / police certificates") {
    return "体检与无犯罪证明费用通常取决于个人居住史、所在国家和指定服务机构。";
  }
  if (category === "Translation / document preparation") {
    return "翻译、认证和材料整理费用通常随非中文/非英文文件数量、页数和认证要求而变化。";
  }
  if (category === "Agent / professional review") {
    return "如选择注册移民代理或法律执业者进行专业审核，费用会因个人情况和服务范围而异。";
  }
  return ZH_FINANCIAL_EXPLANATION_MAP[explanation] ?? localizeText("zh-Hans", explanation);
}

function localizeRiskIndicator(
  risk: ReadinessReport["riskIndicators"][number],
  estimatedPoints?: number
): ReadinessReport["riskIndicators"][number] {
  const text = `${risk.title} ${risk.explanation}`.toLowerCase();
  if (text.includes("points") || text.includes("score")) {
    return {
      ...risk,
      title: "初步打分估算低于常见门槛",
      explanation:
        estimatedPoints !== undefined
          ? `当前初步打分估算为 ${estimatedPoints} 分。对 189/190/491 等打分制技术移民路径而言，这可能削弱获邀竞争力；仍需结合职业、州/领地提名政策和完整材料进一步判断。`
          : "当前打分信息尚不完整。对打分制技术移民路径而言，年龄、英语、工作经验、学历、配偶因素和提名加分均需进一步核对。",
    };
  }
  if (text.includes("partner") || text.includes("relationship") || text.includes("sponsor")) {
    return {
      ...risk,
      title: "担保或关系证明仍需核实",
      explanation: "担保人资格、关系真实性、共同生活证据和文件一致性仍需逐项核对，否则可能影响配偶或担保类路径的材料强度。",
    };
  }
  if (text.includes("occupation") || text.includes("skills")) {
    return {
      ...risk,
      title: "职业评估和职业匹配需进一步确认",
      explanation: "职业代码、岗位职责、学历背景和工作经验证据需与相关评估机构要求保持一致，否则可能影响技术移民路径的可行性。",
    };
  }
  return {
    ...risk,
    title: localizeText("zh-Hans", risk.title),
    explanation: "该风险提示仅为一般信息；具体影响取决于个人背景、证据质量以及递交时适用的官方规则。",
  };
}

function localizeBaseReportForZh(report: ReadinessReport): ReadinessReport {
  const estimatedPoints = report.pointsEstimate?.estimatedPoints;
  const pathwayComparison = report.pathwayComparison.map((pathway) => ({
    ...pathway,
    visaName: zhVisaName(pathway.subclass, pathway.visaName),
    reason: zhPathwayReason(pathway.subclass),
    confidenceLevel: zhConfidence(pathway.confidenceLevel),
    confidenceExplanation: `该置信度基于年龄、英语、职业、资料完整度和路径相关信息作出结构化估算${estimatedPoints !== undefined ? `；当前初步打分估算为 ${estimatedPoints}` : ""}。本内容仅为一般信息。`,
    requirementType: ["189", "190", "491"].includes(pathway.subclass)
      ? "打分、职业、邀请/提名相关要求"
      : pathway.subclass === "482"
        ? "雇主担保、职业和岗位相关要求"
        : pathway.subclass === "820_801"
          ? "关系、担保和证据相关要求"
          : "路径相关要求",
    userRelativePosition: pathway.confidenceLevel === "high"
      ? "匹配度较高"
      : pathway.confidenceLevel === "medium"
        ? "匹配度中等，仍有关键差距"
        : "匹配度有限，需要更多信息",
    keyRequirements: pathway.keyRequirements.map((item) => ZH_REQUIREMENT_MAP[item] ?? item),
    pathwaySpecificRisks: zhPathwayRisks(pathway.subclass, estimatedPoints),
  }));

  const evidenceReadiness = report.evidenceReadiness.map((item) => {
    const categoryMap: Record<string, string> = {
      "Identity and passport": "身份与护照",
      "English evidence": "英语能力证明",
      "Occupation and skills evidence": "职业与技能评估证明",
      "Sponsorship evidence": "担保证明",
      "Relationship evidence": "关系证明",
      "Health, character, and translation documents": "健康、品格和翻译文件",
    };
    return {
      ...item,
      category: localizeEvidenceLabel(categoryMap[item.category] ?? item.category),
      explanation:
        item.status === "provided"
          ? "表单中已提供相关基础信息；正式证据仍需按具体路径单独核对。"
          : item.status === "missing"
            ? "该项信息或证据尚不完整，可能限制报告判断。"
            : item.status === "typically_required"
              ? "该类文件通常需要根据路径和个人情况准备。"
              : "该项仍不明确，建议进一步核对支持材料。",
    };
  });

  const pathwayStrengthComparison = report.pathwayStrengthComparison.map((item) => ({
    ...item,
    visaName: zhVisaName(item.subclass, item.visaName),
    typicalPath:
      item.subclass === "189"
        ? "EOI → 获邀 → 递交 189"
        : item.subclass === "190"
          ? "EOI → 州/领地提名 → 获邀 → 递交 190"
          : item.subclass === "491"
            ? "EOI → 偏远地区提名/担保 → 递交 491"
            : item.subclass === "482"
              ? "雇主担保 → 提名 → 递交 482"
              : item.subclass === "820_801"
                ? "关系证据准备 → 递交 820 → 进入 801 阶段"
                : item.typicalPath,
    explanation: "该路径强度基于已提供资料、材料准备难度、竞争激烈度和路径匹配度综合评估。",
    signalReasons: item.signalReasons.length ? item.signalReasons.map((_reason, index) =>
      index === 0
        ? "年龄、英语和职业资料已形成可用于技术移民路径初筛的核心基础。"
        : "职业、英语和已提供的背景信息支持该路径的初步匹配度判断。"
    ) : [],
    limitingFactors: item.limitingFactors.length ? item.limitingFactors.map((_factor, index) =>
      index === 0
        ? "仍需核对职业评估、州/领地提名要求及完整证明材料后，才能判断实际递交强度。"
        : "当前初步打分估算仍可能因工作经验、学历、配偶因素或额外加分项而调整。"
    ) : [],
    evidenceStatus: item.evidenceStatus.map((ev) => ({
      ...ev,
      label: localizeEvidenceLabel(ev.label),
    })),
  }));

  const progressionPathways = report.progressionPathways.map((item) => ({
    ...item,
    to: item.to.includes("Employer") ? "雇主担保永久路径" : item.to,
    label:
      item.to.includes("485") ? "学生到毕业生/技术移民路径"
      : item.to.includes("191") ? "偏远地区到永久居留路径"
      : item.to.includes("801") ? "配偶签证阶段"
      : item.to.includes("Employer") ? "雇主担保路径"
      : "典型过渡路径",
    explanation: "该路径为澳大利亚签证体系中的常见过渡结构之一；是否适用取决于个人情况和当时规则。",
  }));

  const pathwayFriction = report.pathwayFriction.map((item) => {
    const subclass = pathwayComparison.find((p) => item.pathway.includes(p.subclass))?.subclass;
    return {
      ...item,
      pathway: subclass ? `${zhVisaName(subclass, item.pathway)} (${subclass})` : item.pathway,
      frictionType: "实际难度评估",
      explanation:
        subclass === "189" ? "邀请轮次和分数竞争可能影响该路径。"
        : subclass === "190" ? "州或领地提名设置可能影响该路径。"
        : subclass === "491" ? "偏远地区要求、提名或担保背景可能影响该路径。"
        : subclass === "482" ? "雇主担保背景是该路径的核心限制因素。"
        : subclass === "820_801" ? "关系证明质量是该路径的核心。"
        : "需要更多资料后才能比较路径竞争激烈度。",
    };
  });

  const signalSnapshot = {
    strongest: report.signalSnapshot.strongest.replace(/(.+) \(([^)]+)\)/, (_match, _name, subclass) => `${zhVisaName(subclass, String(_name))} (${subclass})`),
    secondary: report.signalSnapshot.secondary.map((item) =>
      item.replace(/(.+) \(([^)]+)\)/, (_match, _name, subclass) => `${zhVisaName(subclass, String(_name))} (${subclass})`)
    ),
    confidenceLabel: report.signalSnapshot.confidenceLabel,
    confidenceExplanation: `由于已提供年龄、英语、职业和护照国家等核心信息，报告置信度为中等到较强；${estimatedPoints !== undefined ? `当前初步打分估算为 ${estimatedPoints}。` : ""}本内容仅为一般信息。`,
  };

  const pointsBoosterSimulator = report.pointsBoosterSimulator
    ? {
        ...report.pointsBoosterSimulator,
        note: "如果打分项发生变化，您的预期分数可能会相应调整。以下仅为数学估算，不构成获邀或签证结果判断。",
        scenarios: report.pointsBoosterSimulator.scenarios.map((scenario) => {
          const labelText = scenario.label.toLowerCase();
          if (labelText.includes("190")) {
            return {
              ...scenario,
              label: "190 州担保加分情景",
              explanation: "如获得州或领地提名，190 路径的初步打分估算通常可增加 5 分；实际竞争力仍取决于州/领地职业清单和邀请政策。",
            };
          }
          if (labelText.includes("491")) {
            return {
              ...scenario,
              label: "491 偏远地区提名/担保加分情景",
              explanation: "如获得偏远地区州/领地提名或符合条件的亲属担保，491 路径的初步打分估算通常可增加 15 分。",
            };
          }
          if (labelText.includes("english")) {
            return {
              ...scenario,
              label: "英语等级提升情景",
              explanation: "如英语能力等级提升，打分制技术移民路径的初步打分估算可能相应增加。",
            };
          }
          return {
            ...scenario,
            label: localizeText("zh-Hans", scenario.label),
            explanation: "如果打分项发生变化，您的预期分数可能会相应调整。",
          };
        }),
      }
    : undefined;

  const financialRoadmap = report.financialRoadmap.map((item) => ({
    ...item,
    category: ZH_FINANCIAL_CATEGORY_MAP[item.category] ?? localizeText("zh-Hans", item.category),
    amountLabel: ZH_FINANCIAL_AMOUNT_MAP[item.amountLabel] ?? item.amountLabel.replace(/AUD/g, "澳元"),
    explanation: localizeFinancialExplanation(item.category, item.explanation),
  }));

  const pointsEstimate = report.pointsEstimate
    ? {
        ...report.pointsEstimate,
        breakdown: report.pointsEstimate.breakdown.map((item) => ({
          ...item,
          label:
            item.label === "Age points"
              ? "年龄得分"
              : item.label === "English level points"
                ? "英语能力得分"
                : localizeText("zh-Hans", item.label),
          note:
            item.note?.toLowerCase().includes("superior")
              ? "高级英语"
              : item.note?.replace(/Superior/g, "高级英语").replace(/Proficient/g, "熟练英语").replace(/Competent/g, "合格英语"),
        })),
        note: "这是基于年龄与英语能力的初步估算；海外工作经验、澳洲工作经验、学历、加分项和配偶因素尚未完整纳入。实际分数需以个人材料和官方规则为准。",
      }
    : undefined;

  const occupationIndication = report.occupationIndication
    ? {
        ...report.occupationIndication,
        note:
          report.occupationIndication.matches.length > 0
            ? "系统已根据职业代码或职业名称找到初步匹配；仍需按官方职业清单和相关评估机构要求进一步核对。"
            : `系统未在内置职业数据中匹配到“${report.occupationIndication.occupation ?? "该职业"}”。这不代表该职业不在清单中，仍需按官方职业清单和评估机构要求核对。`,
      }
    : undefined;

  const frictionAnalysis = report.frictionAnalysis.map((item) => ({
    ...item,
    realityCheck: item.realityCheck
      .replace(/Friction/g, "竞争激烈度")
      .replace(/friction/g, "竞争激烈度")
      .replace(/Signal/g, "匹配度")
      .replace(/signal/g, "匹配度"),
    successSignals: item.successSignals.map((signal) =>
      signal
        .replace("英语达到 Superior 水平是强竞争力信号。", "英语能力达到高级水平，可显著提升技术移民路径的竞争力。")
        .replace(/Superior/g, "高级")
        .replace(/信号/g, "匹配度")
        .replace(/signal/gi, "匹配度")
    ),
  }));

  return {
    ...report,
    executiveSummary: [
      `本报告将 ${pathwayComparison.map((p) => p.subclass === "820_801" ? "820/801" : p.subclass).join("、")} 等路径放在同一视图中进行结构化比较。`,
      estimatedPoints !== undefined
        ? `当前初步打分估算为 ${estimatedPoints}；该估算可能影响打分制路径的相对位置。`
        : "当前资料已形成初步路径匹配度判断，但仍需核对路径特定证据。",
      "技能评估、提名背景、担保信息和证据准备质量都可能实质性改变路径强度。",
    ],
    signalSnapshot,
    primaryLimitingFactor: estimatedPoints !== undefined && estimatedPoints < 65
      ? {
          label: "初步打分估算低于常见参考门槛",
          explanation: `当前初步打分估算为 ${estimatedPoints}。对打分制技术移民路径而言，这可能限制路径强度，并且仍取决于职业、提名政策和个人材料质量。`,
        }
      : {
          label: "仍需单独核对路径特定证据",
          explanation: "即使主要表单信息较完整，文件类别和路径特定证据仍可能影响最终判断。",
        },
    positionChangers: report.positionChangers.map(localizePositionChanger),
    pathwayComparison,
    pathwayStrengthComparison,
    evidenceReadiness,
    pointsBoosterSimulator,
    financialRoadmap,
    progressionPathways,
    pathwayFriction,
    confidenceExplanation: signalSnapshot.confidenceExplanation,
    reportIndicators: {
      ...report.reportIndicators,
      dataCompletenessLabel:
        report.reportIndicators.dataCompletenessScore >= 80
          ? "资料完整度较高"
          : report.reportIndicators.dataCompletenessScore >= 50
            ? "资料完整度中等"
            : "资料完整度有限",
      explanation: "该指标仅反映表单资料覆盖程度，不预测获邀、签证审理或最终结果。",
    },
    primaryGap: "后续重点应放在职业评估、州/领地提名条件、初步打分估算和核心证明材料的一致性核对上。",
    keyVisaRequirements: report.keyVisaRequirements.map((requirement) => ({
      pathway: localizeKeyVisaPathway(requirement.pathway),
      items: requirement.items.map((item) => ZH_REQUIREMENT_MAP[item] ?? localizeText("zh-Hans", item)),
    })),
    factorsAffectingPathways: [
      "对打分制技术移民而言，邀请分数、职业需求和州/领地优先政策会随时间调整。",
      "关系类路径的材料一致性、共同生活证据和担保人资格会影响整体匹配度。",
      "政策更新、职业清单变化和审理标准可能改变各路径的相对优势。",
    ],
    pointsEstimate,
    occupationIndication,
    riskIndicators: report.riskIndicators.map((risk) => localizeRiskIndicator(risk, estimatedPoints)),
    frictionAnalysis,
    missingInformation: report.missingInformation.map((item) => localizeText("zh-Hans", item)),
    disclaimer: "本报告为自动化数据分析，仅供一般信息参考，不构成移民或法律建议。涉及签证策略规划与正式申请，请咨询注册移民代理（MARA）。",
  };
}

export function runReadinessEngine(input: ReadinessInput): ReadinessReport {
  const base = runBaseReadinessEngine(input);
  const occupation = findOccupationRecord(input);
  const report = {
    ...base,
    documentChecklist: buildPremiumDocumentChecklist(input, base),
    suggestedNextSteps: buildImmediateActionPlan(input, base, occupation?.anzsco_code),
    frictionAnalysis: buildFrictionAnalysis(input, base),
  };

  return input.locale === "zh-Hans" ? localizeBaseReportForZh(report) : report;
}

export { buildLeadQuality } from "@/lib/readiness/engine";

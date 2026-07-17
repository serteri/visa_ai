import occupationsData from "@/src/data/occupations.json";
import type {
  AssessmentState,
  ChecklistItem,
  Locale,
  LodgementReadyChecklist,
  PathwayComparison,
  ReadinessInput,
  StateNominationTracker,
} from "@/lib/readiness/types";

/** GSM points-tested subclasses that lodgement-readiness / EOI-alignment items depend on. */
const GSM_SUBCLASSES = ["189", "190", "491"];

function getGsmBlockReason(
  pathwayComparison: PathwayComparison[],
  assessmentState: AssessmentState,
  locale: Locale
): string | undefined {
  const ineligiblePathway = pathwayComparison.find(
    (p) => GSM_SUBCLASSES.includes(p.subclass) && p.relevance === "ineligible"
  );

  if (ineligiblePathway) {
    return t(
      locale,
      `Blocked: profile does not currently meet the Subclass ${ineligiblePathway.subclass} threshold. See the Visa Viability Ranking section for the full reason.`,
      `Engellendi: profil su anda Subclass ${ineligiblePathway.subclass} esigini karsilamiyor. Tam neden icin Vize Uygulanabilirlik Siralamasi bolumune bakin.`,
      `已阻止：档案目前不满足 Subclass ${ineligiblePathway.subclass} 门槛。完整原因见"签证可行性排名"部分。`
    );
  }

  if (!assessmentState.canShowNumericRanking) {
    return t(
      locale,
      "Deferred: pathway eligibility is not yet confirmed (missing profile details or occupation verification), so lodgement-stage items cannot be marked ready.",
      "Ertelendi: yol uygunlugu henuz dogrulanmadi (eksik profil bilgisi veya meslek dogrulamasi), bu nedenle basvuru asamasi maddeleri hazir olarak isaretlenemez.",
      "已延迟：路径资格尚未确认（缺少资料或职业核实），因此递交阶段的事项暂不能标记为就绪。"
    );
  }

  return undefined;
}

type OccupationRecord = {
  anzsco_code: string;
  occupation_name: string;
  authority: string;
};

const OCCUPATION_ROWS = (occupationsData as { occupations: OccupationRecord[] }).occupations;

function normalize(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

function t(locale: Locale, en: string, tr: string, zh: string): string {
  if (locale === "tr") return tr;
  if (locale === "zh-Hans") return zh;
  return en;
}

function parseEnglishBand(value?: string): 0 | 1 | 2 {
  const normalized = normalize(value);
  if (!normalized) return 0;
  if (
    normalized.includes("superior") ||
    normalized.includes("ielts 8") ||
    normalized.includes("pte 79") ||
    normalized.includes("8.0")
  ) {
    return 2;
  }
  if (
    normalized.includes("proficient") ||
    normalized.includes("ielts 7") ||
    normalized.includes("pte 65") ||
    normalized.includes("7.0")
  ) {
    return 1;
  }
  return 0;
}

function findOccupationAuthority(occupation?: string): string | undefined {
  const code = occupation?.match(/(\d{6})/)?.[1];
  if (code) {
    const byCode = OCCUPATION_ROWS.find((row) => row.anzsco_code === code);
    if (byCode) return byCode.authority;
  }

  const query = normalize(occupation);
  if (!query) return undefined;

  const exact = OCCUPATION_ROWS.find((row) => normalize(row.occupation_name) === query);
  if (exact) return exact.authority;

  return OCCUPATION_ROWS.find((row) => normalize(row.occupation_name).includes(query))?.authority;
}

function authorityLabel(authority: string, locale: Locale): string {
  const normalized = authority.toUpperCase();
  if (normalized === "CPA AUSTRALIA" || normalized === "CPA") {
    return t(locale, "CPA Australia", "CPA Australia", "CPA Australia");
  }
  if (normalized === "CAANZ") {
    return t(locale, "CA ANZ", "CA ANZ", "CA ANZ");
  }
  return authority;
}

export function generateChecklist(args: {
  input: ReadinessInput;
  pathwayComparison: PathwayComparison[];
  assessmentState: AssessmentState;
  stateNominationTracker?: StateNominationTracker;
  occupationAuthority?: string;
}): LodgementReadyChecklist {
  const { input, pathwayComparison, assessmentState, stateNominationTracker } = args;
  const items: ChecklistItem[] = [];
  const gsmBlockReason = getGsmBlockReason(pathwayComparison, assessmentState, input.locale);
  const englishTaken = normalize(input.englishTestTaken);
  const englishBand = parseEnglishBand(input.englishLevel);

  if (englishTaken === "no" || englishTaken === "" || englishBand < 1) {
    items.push({
      id: "english-exam",
      priority: "urgent",
      title: t(
        input.locale,
        "English test readiness signal",
        "Dil sınavı hazırlık sinyali",
        "英语考试准备信号"
      ),
      detail: t(
        input.locale,
        "English exam readiness is typically one of the first evidence areas considered when English test data is missing or currently below stronger migration target bands.",
        "Dil test verisi eksik olduğunda veya daha güçlü vize hedef bantlarının altında kalındığında, dil sınavı hazırlığı genellikle ilk kanıt alanlarından biri olarak incelenir.",
        "当英语考试数据缺失或低于较强目标区间时，PTE/IELTS 预约通常被视为基础准备步骤。"
      ),
    });
  }

  const authority = args.occupationAuthority ?? findOccupationAuthority(input.occupation);
  if (authority) {
    items.push({
      id: "skills-assessment",
      priority: "important",
      title: t(
        input.locale,
        `Skills assessment pathway alignment with ${authorityLabel(authority, input.locale)}`,
        `${authorityLabel(authority, input.locale)} ile beceri incelemesi yol uyumu`,
        `${authorityLabel(authority, input.locale)} 的技能评估路径对齐`
      ),
      detail: t(
        input.locale,
        "Skills assessment timing can influence points claims, nomination readiness, and progression from planning context to a lodgement-capable profile.",
        "Beceri incelemesi zamanlaması; puan iddiaları, adaylık hazırlığı ve planlama bağlamından başvuruya hazır profile geçiş üzerinde etkili olabilir.",
        "技能评估时间点可能影响加分主张、州担保准备度，以及从规划阶段过渡到可递交状态的节奏。"
      ),
    });
  }

  if (gsmBlockReason) {
    items.push({
      id: "eoi-blocked",
      priority: "blocked",
      title: t(
        input.locale,
        "State/EOI alignment cannot proceed yet",
        "Eyalet/EOI uyumu henüz ilerletilemez",
        "州担保/EOI 对齐暂不可进行"
      ),
      detail: gsmBlockReason,
    });
  } else {
    const topState = stateNominationTracker?.topRecommendedStates?.[0];
    if (topState) {
      items.push({
        id: `eoi-${topState.code.toLowerCase()}`,
        priority: "recommended",
        title: t(
          input.locale,
          `${topState.name} pathway EOI alignment considerations`,
          `${topState.name} yolu için EOI uyum incelemeleri`,
          `${topState.name} 路径的 EOI 对齐考量`
        ),
        detail: t(
          input.locale,
          `${topState.name} is currently indicated as the strongest state nomination signal; EOI settings and evidence packaging are typically reviewed against that pathway's criteria.`,
          `${topState.name} şu anda en güçlü eyalet adaylığı sinyali olarak görünmektedir; EOI ayarları ve belge paketleri genellikle bu yolun kriterleriyle uyumlu olup olmadığı açısından incelenir.`,
          `${topState.name} 当前显示为较强的州担保信号；EOI 设置与材料包通常会按该路径标准进行对齐审视。`
        ),
      });
    }
  }

  return {
    items,
    note: t(
      input.locale,
      "This checklist is an educational planning reference and can be refreshed whenever points, English results, or state pathway context changes.",
      "Bu kontrol listesi eğitim amaçlı planlama referansıdır; puan, dil sonucu veya eyalet yolu bağlamı değiştikçe güncellenebilir.",
      "此清单为教育性质的规划参考；当分数、英语结果或州路径背景变化时可同步更新。"
    ),
  };
}

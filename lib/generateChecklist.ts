import { blockedLabel } from "@/lib/readiness/pathway-scores";
import { authorityDisplayName, resolveAssessingAuthority } from "@/lib/skills-assessment/resolve-authority";
import type { PathwayRanking } from "@/lib/readiness/pathway-ranking";
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
  locale: Locale,
  ranking?: PathwayRanking
): string | undefined {
  // With the single ranking (pathway-ranking.ts) the block is stated once, with the same label and
  // in the same order as the Visa Viability Ranking and the Signal Snapshot.
  const blockedEntries = ranking?.entries.filter((e) => e.fit === "blocked" && e.blockReason) ?? [];
  if (ranking && blockedEntries.length > 0) {
    const shared = ranking.commonBlockReason;
    const list = blockedEntries
      .map((e) => (shared ? e.subclass : `${e.subclass} (${blockedLabel(e.blockReason!, locale)})`))
      .join(", ");
    const head = shared ? blockedLabel(shared, locale) : t(locale, "Blocked", "Engelli", "受阻");
    return t(
      locale,
      `${head} — pathways in ranking order: ${list}. See the Visa Viability Ranking section.`,
      `${head} — sıralama düzeninde yollar: ${list}. Vize Uygulanabilirlik Sıralaması bölümüne bakın.`,
      `${head} —— 按排序顺序的路径：${list}。详见"签证可行性排序"部分。`
    );
  }

  const ineligiblePathway = pathwayComparison.find(
    (p) => GSM_SUBCLASSES.includes(p.subclass) && p.relevance === "ineligible"
  );

  if (ineligiblePathway) {
    return t(
      locale,
      `Blocked: profile does not currently meet the Subclass ${ineligiblePathway.subclass} threshold. See the Visa Viability Ranking section for the full reason.`,
      `Engellendi: profil su anda Subclass ${ineligiblePathway.subclass} esigini karsilamiyor. Tam neden icin Vize Uygulanabilirlik Siralamasi bolumune bakin.`,
      `已阻止：档案目前不满足 Subclass ${ineligiblePathway.subclass} 门槛。完整原因见"签证可行性排序"部分。`
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


export function generateChecklist(args: {
  input: ReadinessInput;
  pathwayComparison: PathwayComparison[];
  assessmentState: AssessmentState;
  stateNominationTracker?: StateNominationTracker;
  pathwayRanking?: PathwayRanking;
}): LodgementReadyChecklist {
  const { input, pathwayComparison, assessmentState, stateNominationTracker } = args;
  const items: ChecklistItem[] = [];
  const gsmBlockReason = getGsmBlockReason(pathwayComparison, assessmentState, input.locale, args.pathwayRanking);
  const englishBand = parseEnglishBand(input.englishLevel);

  if (englishBand < 1) {
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

  // The authority comes from the same resolver as the guide, FAQ, roadmap and status (never the dataset's
  // own `authority` field, which uses another vocabulary and disagrees for some codes).
  const resolvedAuthority = resolveAssessingAuthority(input.occupation);
  const authority = resolvedAuthority.isGeneralFallback ? undefined : authorityDisplayName(resolvedAuthority);
  if (authority) {
    items.push({
      id: "skills-assessment",
      priority: "important",
      title: t(
        input.locale,
        `Skills assessment pathway alignment with ${authority}`,
        `${authority} ile beceri incelemesi yol uyumu`,
        `${authority} 的技能评估路径对齐`
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
    // A state is only suggested when the ranking marks a state-nominated pathway recommendable; the tracker's
    // top states are already limited to states whose program is open to this applicant.
    const stateRecommendable = !args.pathwayRanking || args.pathwayRanking.recommendable.some((s) => s === "190" || s === "491");
    const topState = stateRecommendable ? stateNominationTracker?.topRecommendedStates?.[0] : undefined;
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

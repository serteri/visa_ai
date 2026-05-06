import occupationsData from "@/src/data/occupations.json";
import type {
  ChecklistItem,
  Locale,
  LodgementReadyChecklist,
  ReadinessInput,
  StateNominationTracker,
} from "@/lib/readiness/types";

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
  stateNominationTracker?: StateNominationTracker;
  occupationAuthority?: string;
}): LodgementReadyChecklist {
  const { input, stateNominationTracker } = args;
  const items: ChecklistItem[] = [];
  const englishTaken = normalize(input.englishTestTaken);
  const englishBand = parseEnglishBand(input.englishLevel);

  if (englishTaken === "no" || englishTaken === "" || englishBand < 1) {
    items.push({
      id: "english-exam",
      priority: "urgent",
      title: t(
        input.locale,
        "URGENT: Book PTE/IELTS Academic Exam",
        "ACIL: PTE/IELTS Academic Sinavini Rezerve Et",
        "紧急：预约 PTE/IELTS Academic 考试"
      ),
      detail: t(
        input.locale,
        "Your English test signal is missing or below a strong migration target, so exam booking should be treated as the first execution step.",
        "Ingilizce test sinyaliniz eksik veya guclu migration hedefinin altinda gorunuyor; bu nedenle ilk uygulama adimi sinav rezervasyonu olmali.",
        "你的英语考试信号缺失或低于较强移民目标，因此应把考试预约视为第一执行步骤。"
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
        `Initiate Skills Assessment with ${authorityLabel(authority, input.locale)}`,
        `${authorityLabel(authority, input.locale)} ile Skills Assessment baslat`,
        `向 ${authorityLabel(authority, input.locale)} 发起技能评估`
      ),
      detail: t(
        input.locale,
        "Skills assessment timing can control points claims, nomination readiness, and your ability to move from planning to a lodgement-capable profile.",
        "Skills assessment zamanlamasi puan iddialarinizi, nomination hazirligini ve planlamadan lodgement hazir profiline gecisinizi belirleyebilir.",
        "技能评估时间点会影响加分主张、州担保准备度，以及你从规划阶段进入可递交状态的速度。"
      ),
    });
  }

  const topState = stateNominationTracker?.topRecommendedStates?.[0];
  if (topState) {
    items.push({
      id: `eoi-${topState.code.toLowerCase()}`,
      priority: "recommended",
      title: t(
        input.locale,
        `Prepare EOI for ${topState.name}`,
        `${topState.name} icin EOI hazirla`,
        `为 ${topState.name} 准备 EOI`
      ),
      detail: t(
        input.locale,
        `${topState.name} is currently your strongest state nomination signal, so your EOI settings and evidence pack should be aligned to that pathway first.`,
        `${topState.name} su anda en guclu state nomination sinyaliniz oldugu icin EOI ayarlari ve belge paketi once bu yola gore hizalanmali.`,
        `${topState.name} 当前是你最强的州担保信号，因此 EOI 设置和材料包应优先对齐这一路径。`
      ),
    });
  }

  return {
    items,
    note: t(
      input.locale,
      "This checklist is execution-focused and should be updated whenever your points, English result, or state pathway changes.",
      "Bu liste uygulama odaklidir; puaniniz, Ingilizce sonucunuz veya state yolu degistikce guncellenmelidir.",
      "这份清单以执行为导向；当你的分数、英语结果或州路径变化时，应同步更新。"
    ),
  };
}
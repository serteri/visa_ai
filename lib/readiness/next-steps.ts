import type { Locale, PathwayComparison } from "./types";
import type { CanadaPathwayCode } from "./engine";

type NextStepsContext = {
  locale: Locale;
  pathways: PathwayComparison[];
  hasOccupation: boolean;
  hasEnglish: boolean;
  hasSkilledPathway: boolean;
  hasPartnerPathway: boolean;
  has482Pathway: boolean;
  hasMissingInfo: boolean;
};

export function buildNextSteps(ctx: NextStepsContext): string[] {
  const isTr = ctx.locale === "tr";
  const steps: string[] = [];

  if (ctx.pathways.length > 0 && ctx.pathways[0].subclass !== "general") {
    steps.push(
      isTr
        ? "Sistem, gösterilen olası yolların resmi kriterleriyle karşılaştırılabilir bir veri zemini olduğunu tespit etti."
        : "The analysis identified a comparable official-data basis for the possible pathways shown."
    );
  }

  if (ctx.hasMissingInfo) {
    steps.push(
      isTr
        ? "Eksik veri alanları, özellikle meslek, İngilizce seviyesi ve sponsorluk bağlamı, karşılaştırmalı sinyal kalitesini sınırlamaktadır."
        : "Missing data fields, especially occupation, English level, and sponsorship context, are limiting comparative signal quality."
    );
  }

  if (ctx.hasSkilledPathway && !ctx.hasOccupation) {
    steps.push(
      isTr
        ? "Meslek verisi olmadığında, puan testli yollarda meslek listesi uyumu ve beceri değerlendirmesi sinyalleri oluşmamaktadır."
        : "Without occupation data, occupation-list alignment and skills-assessment signals do not form for points-tested pathways."
    );
  }

  if (ctx.hasSkilledPathway && !ctx.hasEnglish) {
    steps.push(
      isTr
        ? "İngilizce seviyesi verisi olmadığında, puan testi ve davet rekabetine ilişkin karşılaştırma sinyalleri eksik kalır."
        : "Without English-level data, comparison signals related to points position and invitation competitiveness remain incomplete."
    );
  }

  if (ctx.hasSkilledPathway) {
    steps.push(
      isTr
        ? "Puan testli yollarda yaş, İngilizce ve meslek sinyalleri tarihsel davet referanslarıyla birlikte okunmaktadır."
        : "For points-tested pathways, age, English, and occupation signals are being read against historical invitation references."
    );
  }

  if (ctx.has482Pathway) {
    steps.push(
      isTr
        ? "482 yolu için işveren sponsorluğu bağlamı, rol uyumu ve ücret eşikleri ana veri değişkenleridir; 1 Temmuz 2026 CSIT tabanı AUD 79,423 olarak uygulanır."
        : "For the 482 pathway, employer sponsorship context, role alignment, and salary thresholds are core variables; the 1 July 2026 CSIT floor is AUD 79,423."
    );
  }

  if (ctx.has482Pathway || ctx.hasSkilledPathway) {
    steps.push(
      isTr
        ? "Ücret/harç planlamasında 2026 tabanları dikkate alınmalıdır: 482 temel harcı AUD 4,015; 189/190 temel harcı yaklaşık AUD 6,140; 18+ bağımlılarda Functional English yoksa kişi başı yaklaşık AUD 4,890 ikinci taksit riski olabilir."
        : "Cost planning should use 2026 baselines: 482 base charge AUD 4,015; 189/190 base charge about AUD 6,140; and dependants aged 18+ without functional English may trigger a second-instalment risk of about AUD 4,890 each."
    );
  }

  if (ctx.hasPartnerPathway) {
    steps.push(
      isTr
        ? "Partner yolunda ilişki kanıtı kategorileri ve sponsorluk bağlamı, karşılaştırmalı güç değerlendirmesini belirleyen temel veri setleridir."
        : "For the partner pathway, relationship-evidence categories and sponsorship context are core datasets shaping the comparative strength assessment."
    );
  }

  steps.push(
    isTr
      ? "Belge kategorilerinin tamlık ve tutarlılık düzeyi, rapordaki sinyal gücünü doğrudan etkileyen bir veri kalitesi unsurudur."
      : "Completeness and consistency across document categories are data-quality variables that directly affect signal strength in the report."
  );

  steps.push(
    isTr
      ? "Kişisel strateji, resmi başvuru ve taktik planlama konuları bu raporun kapsamı dışındadır; bu alanlar için kayıtlı bir MARA uzmanı gerekir."
      : "Personal strategy, formal applications, and tactical planning sit outside this report's scope; those areas require a registered MARA professional."
  );

  return steps;
}

type CanadaNextStepsContext = {
  locale: Locale;
  pathwayCodes: CanadaPathwayCode[];
  hasOccupation: boolean;
  hasEnglish: boolean;
  hasMissingInfo: boolean;
};

export function buildCanadaNextSteps(ctx: CanadaNextStepsContext): string[] {
  const isTr = ctx.locale === "tr";
  const steps: string[] = [];

  if (ctx.pathwayCodes.length > 0) {
    steps.push(
      isTr
        ? `Sistem, ${ctx.pathwayCodes.join("/")} programları için karşılaştırılabilir bir CRS/uygunluk veri zemini olduğunu tespit etti.`
        : `The analysis identified a comparable CRS/eligibility data basis for the ${ctx.pathwayCodes.join("/")} program(s).`
    );
  }

  if (ctx.hasMissingInfo) {
    steps.push(
      isTr
        ? "Eksik veri alanları, özellikle NOC mesleği, dil seviyesi (CLB/NCLC) ve iş tecrübesi, karşılaştırmalı sinyal kalitesini sınırlamaktadır."
        : "Missing data fields, especially NOC occupation, language level (CLB/NCLC), and work experience, are limiting comparative signal quality."
    );
  }

  if (!ctx.hasOccupation) {
    steps.push(
      isTr
        ? "NOC verisi olmadan, CEC/FSW/FSTP uygunluk kontrolü ve skill-transferability sinyalleri oluşmamaktadır."
        : "Without NOC data, CEC/FSW/FSTP eligibility checks and skill-transferability signals do not form."
    );
  }

  if (!ctx.hasEnglish) {
    steps.push(
      isTr
        ? "CLB/NCLC seviyesi verisi olmadığında, CRS dil puanlaması ve davet rekabetine ilişkin karşılaştırma sinyalleri eksik kalır."
        : "Without CLB/NCLC level data, comparison signals related to CRS language scoring and invitation competitiveness remain incomplete."
    );
  }

  steps.push(
    isTr
      ? "Belge kategorilerinin tamlık ve tutarlılık düzeyi, rapordaki sinyal gücünü doğrudan etkileyen bir veri kalitesi unsurudur."
      : "Completeness and consistency across document categories are data-quality variables that directly affect signal strength in the report."
  );

  steps.push(
    isTr
      ? "Kişisel strateji, resmi başvuru ve taktik planlama konuları bu raporun kapsamı dışındadır; bu alanlar için kayıtlı bir RCIC (Regulated Canadian Immigration Consultant) uzmanı gerekir."
      : "Personal strategy, formal applications, and tactical planning sit outside this report's scope; those areas require a registered RCIC (Regulated Canadian Immigration Consultant) professional."
  );

  return steps;
}

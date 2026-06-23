import type { Locale, PathwayComparison } from "./types";

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
        ? "Sistem, gosterilen olasi yollarin resmi kriterleriyle karsilastirilabilir bir veri zemini oldugunu tespit etti."
        : "The analysis identified a comparable official-data basis for the possible pathways shown."
    );
  }

  if (ctx.hasMissingInfo) {
    steps.push(
      isTr
        ? "Eksik veri alanlari, ozellikle meslek, Ingilizce seviyesi ve sponsorluk baglami, karsilastirmali sinyal kalitesini sinirlamaktadir."
        : "Missing data fields, especially occupation, English level, and sponsorship context, are limiting comparative signal quality."
    );
  }

  if (ctx.hasSkilledPathway && !ctx.hasOccupation) {
    steps.push(
      isTr
        ? "Meslek verisi olmadiginda, puan testli yollarda meslek listesi uyumu ve beceri degerlendirmesi sinyalleri olusmamaktadir."
        : "Without occupation data, occupation-list alignment and skills-assessment signals do not form for points-tested pathways."
    );
  }

  if (ctx.hasSkilledPathway && !ctx.hasEnglish) {
    steps.push(
      isTr
        ? "Ingiltere seviyesi verisi olmadiginda, puan testi ve davet rekabetine iliskin karsilastirma sinyalleri eksik kalir."
        : "Without English-level data, comparison signals related to points position and invitation competitiveness remain incomplete."
    );
  }

  if (ctx.hasSkilledPathway) {
    steps.push(
      isTr
        ? "Puan testli yollarda yas, Ingilizce ve meslek sinyalleri tarihsel davet referanslariyla birlikte okunmaktadir."
        : "For points-tested pathways, age, English, and occupation signals are being read against historical invitation references."
    );
  }

  if (ctx.has482Pathway) {
    steps.push(
      isTr
        ? "482 yolu icin isveren sponsorlugu baglami, rol uyumu ve ucret esikleri ana veri degiskenleri olarak gorunmektedir."
        : "For the 482 pathway, employer sponsorship context, role alignment, and salary thresholds appear as the main data variables."
    );
  }

  if (ctx.hasPartnerPathway) {
    steps.push(
      isTr
        ? "Partner yolunda iliski kaniti kategorileri ve sponsorluk baglami, karsilastirmali guc degerlendirmesini belirleyen temel veri setleridir."
        : "For the partner pathway, relationship-evidence categories and sponsorship context are core datasets shaping the comparative strength assessment."
    );
  }

  steps.push(
    isTr
      ? "Belge kategorilerinin tamlik ve tutarlilik duzeyi, rapordaki sinyal gucunu dogrudan etkileyen bir veri kalitesi unsurudur."
      : "Completeness and consistency across document categories are data-quality variables that directly affect signal strength in the report."
  );

  steps.push(
    isTr
      ? "Kisisel strateji, resmi basvuru ve taktik planlama konulari bu raporun kapsami disindadir; bu alanlar icin kayitli bir MARA uzmani gerekir."
      : "Personal strategy, formal applications, and tactical planning sit outside this report's scope; those areas require a registered MARA professional."
  );

  return steps;
}

type CanadaNextStepsContext = {
  locale: Locale;
  pathwayCodes: ("CEC" | "FSW" | "FSTP")[];
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
        ? `Sistem, ${ctx.pathwayCodes.join("/")} programlari icin karsilastirilabilir bir CRS/uygunluk veri zemini oldugunu tespit etti.`
        : `The analysis identified a comparable CRS/eligibility data basis for the ${ctx.pathwayCodes.join("/")} program(s).`
    );
  }

  if (ctx.hasMissingInfo) {
    steps.push(
      isTr
        ? "Eksik veri alanlari, ozellikle NOC meslegi, dil seviyesi (CLB/NCLC) ve is tecrubesi, karsilastirmali sinyal kalitesini sinirlamaktadir."
        : "Missing data fields, especially NOC occupation, language level (CLB/NCLC), and work experience, are limiting comparative signal quality."
    );
  }

  if (!ctx.hasOccupation) {
    steps.push(
      isTr
        ? "NOC verisi olmadan, CEC/FSW/FSTP uygunluk kontrolu ve skill-transferability sinyalleri olusmamaktadir."
        : "Without NOC data, CEC/FSW/FSTP eligibility checks and skill-transferability signals do not form."
    );
  }

  if (!ctx.hasEnglish) {
    steps.push(
      isTr
        ? "CLB/NCLC seviyesi verisi olmadiginda, CRS dil puanlamasi ve davet rekabetine iliskin karsilastirma sinyalleri eksik kalir."
        : "Without CLB/NCLC level data, comparison signals related to CRS language scoring and invitation competitiveness remain incomplete."
    );
  }

  steps.push(
    isTr
      ? "Belge kategorilerinin tamlik ve tutarlilik duzeyi, rapordaki sinyal gucunu dogrudan etkileyen bir veri kalitesi unsurudur."
      : "Completeness and consistency across document categories are data-quality variables that directly affect signal strength in the report."
  );

  steps.push(
    isTr
      ? "Kisisel strateji, resmi basvuru ve taktik planlama konulari bu raporun kapsami disindadir; bu alanlar icin kayitli bir RCIC (Regulated Canadian Immigration Consultant) uzmani gerekir."
      : "Personal strategy, formal applications, and tactical planning sit outside this report's scope; those areas require a registered RCIC (Regulated Canadian Immigration Consultant) professional."
  );

  return steps;
}

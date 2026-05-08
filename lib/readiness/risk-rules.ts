import type { Locale, PathwayComparison, RiskIndicator } from "./types";

type RiskContext = {
  locale: Locale;
  pathways: PathwayComparison[];
  age?: string;
  englishLevel?: string;
  sponsorOrFamily?: string;
  occupation?: string;
  biggestConcern?: string;
  currentCountry?: string;
  passportCountry?: string;
  estimatedPoints?: number;
};

function hasSkilledPathway(pathways: PathwayComparison[]): boolean {
  return pathways.some((p) => ["189", "190", "491"].includes(p.subclass));
}

function hasPartnerPathway(pathways: PathwayComparison[]): boolean {
  return pathways.some((p) => p.subclass === "820_801");
}

function has482Pathway(pathways: PathwayComparison[]): boolean {
  return pathways.some((p) => p.subclass === "482");
}

function parseAge(ageStr?: string): number | null {
  if (!ageStr) return null;
  const n = parseInt(ageStr.trim(), 10);
  return isNaN(n) ? null : n;
}

function hasSponsorKeyword(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes("sponsor") ||
    lower.includes("employer") ||
    lower.includes("işveren") ||
    lower.includes("isveren")
  );
}

function hasPartnerKeyword(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes("partner") ||
    lower.includes("citizen") ||
    lower.includes("pr") ||
    lower.includes("permanent") ||
    lower.includes("nz") ||
    lower.includes("eş") ||
    lower.includes("vatandaş") ||
    lower.includes("daimi") ||
    lower.includes("family")
  );
}

export function buildRiskIndicators(ctx: RiskContext): RiskIndicator[] {
  const isTr = ctx.locale === "tr";
  const risks: RiskIndicator[] = [];
  const ageNum = parseAge(ctx.age);
  const skilled = hasSkilledPathway(ctx.pathways);
  const partner = hasPartnerPathway(ctx.pathways);
  const sponsored = has482Pathway(ctx.pathways);

  if (skilled && ageNum !== null && ageNum >= 45) {
    risks.push({
      level: "high",
      title: isTr ? "Yetenekli yol: yaş faktörü" : "Skilled pathway: age factor",
      explanation: isTr
        ? "Puan tablosu verisi, 45 yas ve uzeri profillerde yas bileseninin sifirlandigini gostermektedir; bu durum puan testli yollardaki goreli rekabeti zayiflatabilir."
        : "Points-table data shows the age component falls to zero for profiles aged 45 or over, which can weaken relative competitiveness in points-tested pathways."
    });
  }

  if (skilled && !ctx.englishLevel) {
    risks.push({
      level: "medium",
      title: isTr
        ? "Yetenekli yol: İngilizce seviyesi belirtilmedi"
        : "Skilled pathway: English level not provided",
      explanation: isTr
        ? "Ingilizce seviyesi verisi olmadiginda, puan hesaplama modeli ve tarihsel davet karsilastirmasi eksik kalir."
        : "Without English-level data, the points model and historical invitation comparison remain incomplete."
    });
  }

  if (skilled && !ctx.occupation) {
    risks.push({
      level: "medium",
      title: isTr
        ? "Yetenekli yol: meslek belirtilmedi"
        : "Skilled pathway: occupation not provided",
      explanation: isTr
        ? "Meslek verisi olmadiginda, beceri degerlendirmesi ve meslek listesi uyumu icin gerekli karsilastirma katmani olusmaz."
        : "Without occupation data, the comparison layer needed for skills-assessment and occupation-list alignment does not form."
    });
  }

  if (sponsored && !hasSponsorKeyword(ctx.sponsorOrFamily)) {
    risks.push({
      level: "high",
      title: isTr
        ? "482 vizesi: sponsor bilgisi eksik"
        : "482 visa: sponsor information not provided",
      explanation: isTr
        ? "482 yolunda isveren sponsorlugu ana veri degiskenlerinden biridir; sponsor baglami olmadiginda rol uyumu ve yol gucu sinyalleri zayif kalir."
        : "Employer sponsorship is a core data variable for the 482 pathway; without sponsor context, role-alignment and pathway-strength signals remain weak."
    });
  }

  if (partner && !hasPartnerKeyword(ctx.sponsorOrFamily)) {
    risks.push({
      level: "high",
      title: isTr
        ? "Partner yolu: sponsor/partner bilgisi eksik"
        : "Partner pathway: sponsor or partner information not provided",
      explanation: isTr
        ? "Partner yolunda sponsorluk ve iliski baglami temel veri girdileridir; bu bilgiler eksik oldugunda karsilastirmali sinyal zayiflar."
        : "Sponsorship and relationship context are core data inputs for the partner pathway; when they are missing, the comparative signal weakens."
    });
  }

  if (ctx.estimatedPoints !== undefined && ctx.estimatedPoints < 65) {
    risks.push({
      level: "high",
      title: isTr
        ? "Puan tahmini eşiğin altında"
        : "Points-table position below minimum threshold",
      explanation: isTr
        ? `Mevcut veri setine gore tahmini temel puan ${ctx.estimatedPoints}. Tarihsel davet referanslari ve minimum esikler daha yuksek rekabet baskisina isaret edebilir.`
        : `Based on the current dataset, estimated base points are ${ctx.estimatedPoints}. Historical invitation references and minimum thresholds may indicate higher competitive pressure.`
    });
  }

  if (!ctx.currentCountry && !ctx.passportCountry) {
    risks.push({
      level: "low",
      title: isTr
        ? "Ülke ve pasaport bilgisi eksik"
        : "Country and passport information not provided",
      explanation: isTr
        ? "Bulunulan ulke ve pasaport ulkesi, bazi yollarin kural seti ve veri kapsaminda fark yaratabilir; bu bilgiler olmadan analiz kapsamı daralir."
        : "Current country and passport country can change the rule set and data context for some pathways; without them, the analysis scope narrows."
    });
  }

  if (ctx.biggestConcern && /document|paper|evidence|belge|evrak|kanıt/i.test(ctx.biggestConcern)) {
    risks.push({
      level: "medium",
      title: isTr ? "Belge hazırlığı endişesi" : "Document readiness concern",
      explanation: isTr
        ? "Girilen endise, belge hazirligi ve kanit tamlik duzeyinin bu analizde belirgin bir degisken oldugunu gostermektedir."
        : "The stated concern indicates document readiness and evidence completeness are material variables in this analysis."
    });
  }

  if (risks.length === 0) {
    risks.push({
      level: "low",
      title: isTr
        ? "Mevcut bilgiye dayalı risk göstergeleri sınırlı"
        : "Limited risk indicators based on available information",
      explanation: isTr
        ? "Mevcut veri seti, baskin bir risk sinyali uretmiyor; ek veri girisleri karsilastirma hassasiyetini artirabilir."
        : "The current dataset does not produce a dominant risk signal; additional inputs may increase comparison precision."
    });
  }

  return risks;
}

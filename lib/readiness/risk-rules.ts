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
        ? "45 yaş ve üzeri için puan tablosunda yaş puanı sıfıra düşmektedir. Bu durum yetenekli yol değerlendirmesini etkileyebilir ve kişisel duruma göre değişebilir."
        : "Age 45 or older receives zero age points in the skilled points table. This may affect skilled pathway considerations and depends on individual circumstances.",
    });
  }

  if (skilled && !ctx.englishLevel) {
    risks.push({
      level: "medium",
      title: isTr
        ? "Yetenekli yol: İngilizce seviyesi belirtilmedi"
        : "Skilled pathway: English level not provided",
      explanation: isTr
        ? "Yetenekli göç yolları için İngilizce seviyesi puan hesaplamasını ve değerlendirme gereksinimlerini etkileyebilir. Bu bilgi eksik olduğunda değerlendirme tam yapılamıyor."
        : "English level can affect points calculation and assessment requirements for skilled pathways. This review is limited without that information.",
    });
  }

  if (skilled && !ctx.occupation) {
    risks.push({
      level: "medium",
      title: isTr
        ? "Yetenekli yol: meslek belirtilmedi"
        : "Skilled pathway: occupation not provided",
      explanation: isTr
        ? "Yetenekli yollar genellikle beceri değerlendirmesi ve meslek listesi uyumunu gerektirir. Meslek bilgisi olmadan yol uyumu değerlendirilemiyor."
        : "Skilled pathways generally require a skills assessment and occupation list match. Pathway alignment cannot be reviewed without occupation details.",
    });
  }

  if (sponsored && !hasSponsorKeyword(ctx.sponsorOrFamily)) {
    risks.push({
      level: "high",
      title: isTr
        ? "482 vizesi: sponsor bilgisi eksik"
        : "482 visa: sponsor information not provided",
      explanation: isTr
        ? "482 Skills in Demand vizesi bir işveren sponsoru gerektirmektedir. Sponsor bağlamı olmadan bu yolun uygulanabilirliği değerlendirilemiyor. Bu durum kişisel duruma göre değişebilir."
        : "The 482 Skills in Demand visa requires an employer sponsor. The availability of this pathway cannot be assessed without sponsor context. This depends on individual circumstances.",
    });
  }

  if (partner && !hasPartnerKeyword(ctx.sponsorOrFamily)) {
    risks.push({
      level: "high",
      title: isTr
        ? "Partner yolu: sponsor/partner bilgisi eksik"
        : "Partner pathway: sponsor or partner information not provided",
      explanation: isTr
        ? "Partner vizesi için Avustralya vatandaşı, daimi oturum sahibi veya Yeni Zelanda vatandaşı olan bir sponsorun varlığı gereklidir. Bu bilgi eksik olduğunda yol değerlendirilemez."
        : "The partner visa pathway requires a sponsor who is an Australian citizen, permanent resident, or New Zealand citizen. This pathway cannot be reviewed without that information.",
    });
  }

  if (ctx.estimatedPoints !== undefined && ctx.estimatedPoints < 65) {
    risks.push({
      level: "high",
      title: isTr
        ? "Puan tahmini eşiğin altında"
        : "Points-table position below minimum threshold",
      explanation: isTr
        ? `Mevcut bilgiye dayanarak tahmini puan ${ctx.estimatedPoints}. Yetenekli yollar için genellikle 65 minimum olarak belirtilmekte olup davet eşikleri bunun üzerinde olabilir. Bu yalnızca kısmi bir tahmindir ve kişisel duruma göre değişebilir.`
        : `Based on available information, estimated points are ${ctx.estimatedPoints}. Skilled pathways generally list 65 as the minimum and invitation thresholds may be higher. This is a partial estimate only and depends on individual circumstances.`,
    });
  }

  if (!ctx.currentCountry && !ctx.passportCountry) {
    risks.push({
      level: "low",
      title: isTr
        ? "Ülke ve pasaport bilgisi eksik"
        : "Country and passport information not provided",
      explanation: isTr
        ? "Bulunduğunuz ülke ve pasaport ülkesi bazı yolların uygulanabilirliğini etkileyebilir. Bu bilgiler olmadan tam bir değerlendirme yapılamıyor."
        : "Current country and passport country can affect pathway availability. A complete review is limited without this information.",
    });
  }

  if (ctx.biggestConcern && /document|paper|evidence|belge|evrak|kanıt/i.test(ctx.biggestConcern)) {
    risks.push({
      level: "medium",
      title: isTr ? "Belge hazırlığı endişesi" : "Document readiness concern",
      explanation: isTr
        ? "Belirtilen endişeler belge hazırlığıyla ilgili görünüyor. Vize sürecine başlamadan önce ilgili belge kategorilerinin gözden geçirilmesi faydalı olabilir."
        : "The stated concern appears to relate to document readiness. Reviewing the relevant document categories before starting a visa process may be relevant.",
    });
  }

  if (risks.length === 0) {
    risks.push({
      level: "low",
      title: isTr
        ? "Mevcut bilgiye dayalı risk göstergeleri sınırlı"
        : "Limited risk indicators based on available information",
      explanation: isTr
        ? "Mevcut bilgilerle önemli bir risk tespit edilmedi. Daha fazla bilgi sağlandıkça değerlendirme daha kapsamlı hale gelecektir."
        : "No significant risks were identified based on available information. The assessment becomes more detailed as more information is provided.",
    });
  }

  return risks;
}

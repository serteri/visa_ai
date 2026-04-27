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
        ? "Gösterilen olası yollar için resmi vize bilgilerini incelemeyi değerlendirin."
        : "Review the official visa information for the possible pathways shown."
    );
  }

  if (ctx.hasMissingInfo) {
    steps.push(
      isTr
        ? "Eksik bilgileri tamamlayın — meslek, İngilizce seviyesi ve sponsorluk ayrıntıları değerlendirmeyi destekleyebilir."
        : "Prepare missing information — occupation, English level, and sponsorship details can support a more complete review."
    );
  }

  if (ctx.hasSkilledPathway && !ctx.hasOccupation) {
    steps.push(
      isTr
        ? "Yetenekli yollar için meslek listesi uyumunu araştırmak faydalı bir başlangıç noktası olabilir."
        : "Reviewing occupation list alignment may be a useful starting point for skilled pathways."
    );
  }

  if (ctx.hasSkilledPathway && !ctx.hasEnglish) {
    steps.push(
      isTr
        ? "Yetenekli yollar için İngilizce testi gereksinimleri genellikle göz önünde bulundurulur."
        : "English test requirements are generally considered for skilled pathways."
    );
  }

  if (ctx.hasSkilledPathway) {
    steps.push(
      isTr
        ? "Mevcut puan durumunu değerlendirmek için puan hesaplayıcıyı kullanmayı değerlendirin."
        : "Consider using the points calculator to review the current points position."
    );
  }

  if (ctx.has482Pathway) {
    steps.push(
      isTr
        ? "482 vizesi için işveren sponsorluğu bağlamı, değerlendirmeden önce netleştirilmesi gereken önemli bir faktördür."
        : "Employer sponsorship context is an important factor to clarify before assessing the 482 pathway."
    );
  }

  if (ctx.hasPartnerPathway) {
    steps.push(
      isTr
        ? "Partner yolu için ilişki kanıtı kategorilerini gözden geçirmek hazırlık sürecini destekleyebilir."
        : "Reviewing relationship evidence categories may support preparation for the partner pathway."
    );
  }

  steps.push(
    isTr
      ? "Yol değerlendirmesi yapmadan önce ilgili belge kategorilerinin hazırlanması genellikle ilk adım olarak önerilir."
      : "Preparing relevant document categories is generally considered a useful step before a detailed pathway assessment."
  );

  steps.push(
    isTr
      ? "Kişisel duruma göre değişen tavsiye için kayıtlı bir göç danışmanı ile görüşmeyi değerlendirin."
      : "Consider speaking with a registered migration agent for advice that depends on individual circumstances."
  );

  return steps;
}

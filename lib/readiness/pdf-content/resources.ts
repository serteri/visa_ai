import type { Locale } from "../types";

type Country = "AU" | "CA";

interface ResourceLink {
  label: string;
  url: string;
  description: string;
}

/**
 * Returns localized resource links for official immigration tools.
 * 1 page, localized for en/tr/zh-Hans and AU/CA.
 */
export function getResourcesSection(locale: Locale, country: Country): {
  title: string;
  intro: string;
  sections: Array<{ heading: string; links: ResourceLink[] }>;
} {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  if (country === "CA") {
    return {
      title: isTr ? "Resmi Kaynaklar" : isZh ? "官方资源" : "Official Resources",
      intro: isTr
        ? "Kanada göçmenliği için resmi bilgi kaynakları:"
        : isZh
          ? "加拿大移民官方信息资源："
          : "Official resources for Canadian immigration:",
      sections: [
        {
          heading: isTr ? "Devlet Kurumları" : isZh ? "政府机构" : "Government Bodies",
          links: [
            { label: "IRCC (Immigration, Refugees and Citizenship Canada)", url: "https://www.canada.ca/en/immigration-refugees-citizenship.html", description: isTr ? "Resmi göçmenlik portalı" : isZh ? "官方移民门户" : "Official immigration portal" },
            { label: "Express Entry Portal", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html", description: isTr ? "Express Entry başvuru sistemi" : isZh ? "快速入境申请系统" : "Express Entry application system" },
          ],
        },
        {
          heading: isTr ? "Meslek Sınıflandırması" : isZh ? "职业分类" : "Occupation Classification",
          links: [
            { label: "NOC 2021 Search Tool", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/find-national-occupation-code.html", description: isTr ? "NOC kodu arama aracı" : isZh ? "NOC代码搜索工具" : "NOC code search tool" },
            { label: "WES (World Education Services)", url: "https://www.wes.org/ca/", description: isTr ? "ECA değerlendirme kuruluşu" : isZh ? "ECA学历评估机构" : "ECA assessment body" },
          ],
        },
        {
          heading: isTr ? "Dil Testleri" : isZh ? "语言考试" : "Language Tests",
          links: [
            { label: "IELTS for Canada", url: "https://www.ielts.org/about-ielts/ielts-for-migration/canada", description: "IELTS General Training" },
            { label: "CELPIP", url: "https://www.celpip.ca/", description: isTr ? "Kanada'ya özgü dil testi" : isZh ? "加拿大专属语言考试" : "Canada-specific language test" },
            { label: "TEF Canada", url: "https://www.faitfrancais.org/", description: isTr ? "Fransızca dil testi" : isZh ? "法语语言考试" : "French language test" },
          ],
        },
      ],
    };
  }

  // Australia
  return {
    title: isTr ? "Resmi Kaynaklar" : isZh ? "官方资源" : "Official Resources",
    intro: isTr
      ? "Avustralya göçmenliği için resmi bilgi kaynakları:"
      : isZh
        ? "澳大利亚移民官方信息资源："
        : "Official resources for Australian immigration:",
    sections: [
      {
        heading: isTr ? "Devlet Kurumları" : isZh ? "政府机构" : "Government Bodies",
        links: [
          { label: "Department of Home Affairs", url: "https://immi.homeaffairs.gov.au/", description: isTr ? "Resmi göçmenlik portalı" : isZh ? "官方移民门户" : "Official immigration portal" },
          { label: "SkillSelect", url: "https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect", description: isTr ? "EOI başvuru sistemi" : isZh ? "EOI申请系统" : "EOI application system" },
        ],
      },
      {
        heading: isTr ? "Meslek Değerlendirme Kuruluşları" : isZh ? "技能评估机构" : "Skills Assessment Bodies",
        links: [
          { label: "ACS (Australian Computer Society)", url: "https://www.acs.org.au/", description: isTr ? "BT ve ICT meslekleri" : isZh ? "IT和ICT职业" : "IT and ICT occupations" },
          { label: "VETASSESS", url: "https://www.vetassess.com.au/", description: isTr ? "Genel meslekler" : isZh ? "一般职业" : "General occupations" },
          { label: "Engineers Australia", url: "https://www.engineersaustralia.org.au/", description: isTr ? "Mühendislik meslekleri" : isZh ? "工程类职业" : "Engineering occupations" },
          { label: "TRA (Trades Recognition Australia)", url: "https://www.tradesrecognitionaustralia.gov.au/", description: isTr ? "Ustalık meslekleri" : isZh ? "技工类职业" : "Trade occupations" },
        ],
      },
      {
        heading: isTr ? "Dil Testleri" : isZh ? "语言考试" : "Language Tests",
        links: [
          { label: "IELTS Australia", url: "https://www.ielts.org/about-ielts/ielts-for-migration/australia", description: "IELTS General Training / Academic" },
          { label: "PTE Academic", url: "https://www.pearsonpte.com/", description: isTr ? "Pearson dil testi" : isZh ? "培生语言考试" : "Pearson language test" },
          { label: "TOEFL iBT", url: "https://www.ets.org/toefl", description: "TOEFL iBT" },
        ],
      },
    ],
  };
}

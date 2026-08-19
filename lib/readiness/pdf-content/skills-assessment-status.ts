import type { Locale } from "../types";

type Country = "AU" | "CA";

/**
 * Generates skills assessment status content for the PDF.
 * Shows whether the user's occupation requires assessment and if it's done.
 */
export function getSkillsAssessmentStatus(
  locale: Locale,
  country: Country,
  occupation: string | undefined,
  assessmentDone: boolean,
  assessingAuthority?: string,
  firstName?: string,
): {
  title: string;
  status: string;
  statusColor: "green" | "amber" | "red";
  details: string[];
  nextAction?: string;
} {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  if (!occupation) {
    return {
      title: isTr ? "Beceri Değerlendirmesi" : isZh ? "技能评估" : "Skills Assessment",
      status: isTr ? "Belirtilmedi" : isZh ? "未填写" : "Not Specified",
      statusColor: "amber",
      details: [
        isTr
          ? "Mesleğiniz belirtilmediği için beceri değerlendirmesi durumu kontrol edilemedi."
          : isZh
            ? "由于未填写职业信息，无法检查技能评估状态。"
            : "Occupation not specified, so skills assessment status cannot be checked.",
      ],
    };
  }

  if (country === "CA") {
    // Canada: ECA (Educational Credential Assessment) is the equivalent
    return {
      title: isTr ? "ECA (Eğitim Dengeleme)" : isZh ? "ECA（学历认证）" : "ECA (Educational Credential Assessment)",
      status: assessmentDone
        ? (isTr ? "✅ Tamamlandı" : isZh ? "✅ 已完成" : "✅ Completed")
        : (isTr ? "❌ Yapılmadı" : isZh ? "❌ 未完成" : "❌ Not Done"),
      statusColor: assessmentDone ? "green" : "red",
      details: [
        isTr
          ? `Meslek: ${occupation}`
          : isZh
            ? `职业：${occupation}`
            : `Occupation: ${occupation}`,
        isTr
          ? "Kanada Express Entry için yurtdışı eğitim belgelerinizin ECA değerlendirmesi gereklidir."
          : isZh
            ? "加拿大Express Entry需要对海外学历进行ECA认证。"
            : "For Canada Express Entry, your foreign education documents require an ECA assessment.",
        isTr
          ? "WES (World Education Services) en yaygın değerlendirmeli kuruluştur."
          : isZh
            ? "WES（世界教育服务）是最常用的评估机构。"
            : "WES (World Education Services) is the most commonly used assessment body.",
      ],
      nextAction: assessmentDone
        ? undefined
        : (isTr
            ? "WES web sitesinden ECA başvurusu yapın."
            : isZh
              ? "请在WES网站上提交ECA申请。"
              : "Apply for ECA through the WES website."),
    };
  }

  // Australia
  const name = firstName?.trim();
  const namePrefix = name ? `${name}, ` : "";
  const namePrefixTr = name ? `${name}, ` : "";
  const namePrefixZh = name ? `${name}，` : "";

  // Personalized, occupation-aware sentence -- deliberately not a generic
  // "Assessing Authority: X" label. When the occupation resolves to a real
  // authority (exact ANZSCO match or fuzzy title match, see
  // getAssessingAuthority in occupation-authority-map.ts), name it directly;
  // when it doesn't, say so honestly instead of printing a placeholder that
  // looks like an answer but isn't one.
  const authorityLine = assessingAuthority
    ? (isTr
        ? `${namePrefixTr}${occupation} rolünüz için zorunlu beceri değerlendirmeniz ${assessingAuthority} tarafından yürütülecektir.`
        : isZh
          ? `${namePrefixZh}作为${occupation}，您的强制性技能评估将由${assessingAuthority}进行。`
          : `${namePrefix}for your role as a ${occupation}, your mandatory skills assessment will be conducted by ${assessingAuthority}.`)
    : (isTr
        ? `${namePrefixTr}${occupation} olarak, ilk kritik adımınız resmi mevzuat aracından size özel değerlendirme kurumunu belirlemektir.`
        : isZh
          ? `${namePrefixZh}作为${occupation}，您的首要关键步骤是通过官方立法文件确定您的具体评估机构。`
          : `${namePrefix}as a ${occupation}, your first critical step is identifying your specific assessing authority from the official legislative instrument.`);

  return {
    title: isTr ? "Beceri Değerlendirmesi" : isZh ? "技能评估" : "Skills Assessment",
    status: assessmentDone
      ? (isTr ? "✅ Tamamlandı" : isZh ? "✅ 已完成" : "✅ Completed")
      : (isTr ? "❌ Yapılmadı" : isZh ? "❌ 未完成" : "❌ Not Done"),
    statusColor: assessmentDone ? "green" : "red",
    details: [
      isTr
        ? `Meslek: ${occupation}`
        : isZh
          ? `职业：${occupation}`
          : `Occupation: ${occupation}`,
      authorityLine,
      isTr
        ? "Avustralya skilled migration için beceri değerlendirmesi zorunludur."
        : isZh
          ? "澳大利亚技术移民需要完成技能评估。"
          : "Skills assessment is mandatory for Australian skilled migration.",
      isTr
        ? "Değerlendirme olmadan puanlarınız hesaplanamaz ve başvuru yapılamaz."
        : isZh
          ? "没有评估结果，您的积分无法计算，也无法提交申请。"
          : "Without assessment, your points cannot be calculated and you cannot apply.",
    ],
    nextAction: assessmentDone
      ? undefined
      : (assessingAuthority
          ? (isTr
              ? `${assessingAuthority} web sitesinden beceri değerlendirmesi başvurusu yapın.`
              : isZh
                ? `请在${assessingAuthority}网站上提交技能评估申请。`
                : `Apply for skills assessment through the ${assessingAuthority} website.`)
          : (isTr
              ? "Doğru değerlendirme kurumunu belirlemek için resmi mevzuat aracını (Legislative Instrument) kontrol edin."
              : isZh
                ? "请查阅官方立法文件（Legislative Instrument）以确定正确的评估机构。"
                : "Check the official Legislative Instrument to identify the correct assessing authority.")),
  };
}

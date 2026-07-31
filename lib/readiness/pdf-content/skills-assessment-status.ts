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
  const authority = assessingAuthority || (isTr ? "İlgili değerlendirme kurumu" : isZh ? "相关评估机构" : "Relevant assessing authority");

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
      isTr
        ? `Değerlendirme Kurumu: ${authority}`
        : isZh
          ? `评估机构：${authority}`
          : `Assessing Authority: ${authority}`,
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
      : (isTr
          ? `${authority} web sitesinden beceri değerlendirmesi başvurusu yapın.`
          : isZh
            ? `请在${authority}网站上提交技能评估申请。`
            : `Apply for skills assessment through the ${authority} website.`),
  };
}

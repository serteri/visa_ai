import type { PDFContext, PDFSection } from "../pdf-types";

/**
 * Renders the glossary section of the PDF report.
 *
 * Lists key immigration terms with their definitions. Expanded to
 * 20+ terms covering visa types, scoring, documents, and processes.
 * All labels are locale-aware via the text object.
 *
 * Extracted from the original monolith (lines 2023-2046), expanded.
 */
export const drawGlossary: PDFSection = (ctx: PDFContext): void => {
  const { text, effectiveLocale, addHeading, addBody, addSmallText } = ctx;

  addHeading(text.glossaryTitle);
  addSmallText(text.glossaryIntro, 0);
  ctx.yPosition += 2;

  // Report-specific terms (from text object)
  const reportTerms: Array<[string, string]> = [
    [text.glossaryTermConfidence, text.definitionConfidence],
    [text.glossaryTermStrength, text.definitionStrength],
    [text.glossaryTermFriction, text.definitionFriction],
    [text.glossaryTermSignalConfidence, text.definitionSignalConfidence],
    [text.glossaryTermEvidenceLoad, text.definitionEvidenceLoad],
    [text.glossaryTermEvidenceStatus, text.definitionEvidenceStatus],
    [text.glossaryTermPointsGap, text.definitionPointsGap],
    [text.glossaryTermHardGate, text.definitionHardGate],
  ];

  // General immigration terms (locale-aware)
  const generalTerms: Array<[string, string]> = effectiveLocale === "tr"
    ? [
        ["ANZSCO", "Avustralya ve Yeni Zelanda Meslek Sınıflandırması. Her mesleğin benzersiz bir kodu vardır ve bu kod vize başvurularında kullanılır."],
        ["NOC", "Kanada Meslek Sınıflandırması. 2021 v1.0 sürümünde TEER 0-5 seviyeleri kullanılır."],
        ["EOI", "İfade of Interest (İlgi Beyanı). SkillSelect veya Express Entry sistemine profilinizi sunarak davet beklediğiniz başvurudur."],
        ["ITA", "Invitation to Apply (Başvuru Daveti). EOI'niz davet eşiğini aştığında收到davet."],
        ["ECA", "Educational Credential Assessment. Yurtdışı eğitim belgelerinizin Kanada/Australya standartlarına eşdeğerliğini doğrulayan değerlendirme."],
        ["CRS", "Comprehensive Ranking System. Kanada Express Entry'de adayları puanlayan sistemi. 1200 puana kadar."],
        ["PNP", "Province Nominee Program. Kanada'da eyaletlerin kendi adaylarını seçtiği program. +600 CRS puanı ekler."],
        ["Subclass 189", "Bağımsız Meslek Vizesi (AU). Eyalet desteği gerekmez, puana dayalı."],
        ["Subclass 190", "Eyalet Adaylığı Vizesi (AU). Eyalet desteği +5 puan ekler."],
        ["Subclass 491", "Bölgesel Geçici Vize (AU). Regional taahhüt +15 puan ekler."],
        ["LMIA", "Labour Market Impact Assessment. İşverenin yerli işçi bulamadığını kanıtlayan belge. Express Entry'de +50 puan."],
        ["FSW", "Federal Skilled Worker. Kanada'nın ana göçmenlik programı. Dil, eğitim ve iş deneyimi puanlanır."],
        ["PR", "Permanent Residence. Daimi oturum hakkı. Vatandaşlıktan önceki adım."],
        ["MARA", "Migration Agents Registration Authority. Avustralya'da lisanslı göçmenlik acentelerini düzenleyen kurum."],
        ["RCIC", "Regulated Canadian Immigration Consultant. Kanada'da lisanslı göçmenlik danışmanları."],
      ]
    : effectiveLocale === "zh-Hans"
      ? [
          ["ANZSCO", "澳大利亚和新西兰职业分类标准。每个职业有唯一代码，用于签证申请。"],
          ["NOC", "加拿大职业分类。2021 v1.0版本使用TEER 0-5级别。"],
          ["EOI", "意向书（Expression of Interest）。在SkillSelect或Express Entry系统中提交个人资料，等待邀请。"],
          ["ITA", "申请邀请（Invitation to Apply）。当EOI超过邀请门槛时收到的邀请。"],
          ["ECA", "学历认证（Educational Credential Assessment）。验证海外学历是否符合加拿大/澳大利亚标准。"],
          ["CRS", "综合排名系统（Comprehensive Ranking System）。加拿大Express Entry的评分系统，最高1200分。"],
          ["PNP", "省提名计划（Provincial Nominee Program）。加拿大各省自行选拔候选人的计划，可获得+600 CRS积分。"],
          ["Subclass 189", "独立技术移民签证（澳大利亚）。不需要州政府支持，基于积分。"],
          ["Subclass 190", "州提名签证（澳大利亚）。州政府支持可获得+5分加分。"],
          ["Subclass 491", "偏远地区临时签证（澳大利亚）。承诺在偏远地区居住可获得+15分加分。"],
          ["LMIA", "劳动力市场影响评估。雇主证明无法找到本地工人的文件。在Express Entry中可获得+50分。"],
          ["FSW", "联邦技术工人项目。加拿大主要移民项目，根据语言、学历和工作经验评分。"],
          ["PR", "永久居留权。获得公民身份之前的阶段。"],
          ["MARA", "澳大利亚移民代理注册管理局。监管持牌移民代理的机构。"],
          ["RCIC", "加拿大持牌移民顾问。加拿大持牌移民咨询师。"],
        ]
      : [
          ["ANZSCO", "Australian and New Zealand Standard Classification of Occupations. Each occupation has a unique code used in visa applications."],
          ["NOC", "National Occupational Classification. Canada's occupation classification system (2021 v1.0) with TEER levels 0-5."],
          ["EOI", "Expression of Interest. Your profile submitted to SkillSelect or Express Entry to receive an invitation."],
          ["ITA", "Invitation to Apply. Received when your EOI exceeds the invitation threshold."],
          ["ECA", "Educational Credential Assessment. Verifies your foreign education meets Canadian/Australian standards."],
          ["CRS", "Comprehensive Ranking System. Canada's Express Entry scoring system (up to 1200 points)."],
          ["PNP", "Provincial Nominee Program. Canadian provinces select their own candidates. Adds +600 CRS points."],
          ["Subclass 189", "Independent Skilled Visa (AU). No state support needed, points-tested."],
          ["Subclass 190", "State Nomination Visa (AU). State support adds +5 points."],
          ["Subclass 491", "Regional Provisional Visa (AU). Regional commitment adds +15 points."],
          ["LMIA", "Labour Market Impact Assessment. Employer proves no local worker available. +50 points in Express Entry."],
          ["FSW", "Federal Skilled Worker. Canada's main immigration program, scored on language, education, and work experience."],
          ["PR", "Permanent Residence. The stage before citizenship. Grants rights to live and work permanently."],
          ["MARA", "Migration Agents Registration Authority. Regulates licensed migration agents in Australia."],
          ["RCIC", "Regulated Canadian Immigration Consultant. Licensed immigration consultants in Canada."],
        ];

  // Render report-specific terms first
  reportTerms.forEach(([term, definition]) => {
    addBody(term);
    addSmallText(definition, 4);
    ctx.yPosition += 1;
  });

  // Then general immigration terms
  generalTerms.forEach(([term, definition]) => {
    addBody(term);
    addSmallText(definition, 4);
    ctx.yPosition += 1;
  });

  ctx.yPosition += 3;
};

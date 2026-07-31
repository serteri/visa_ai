import type { Locale } from "../types";

type Country = "AU" | "CA";

interface GuideStep {
  title: string;
  body: string;
}

/**
 * Returns localized step-by-step immigration application guide content.
 *
 * 3 pages: Overview (1), Key Milestones (1), Document Preparation (1).
 * All content is country-specific (AU vs CA) and locale-aware (en/tr/zh-Hans).
 *
 * This is manually-authored premium consulting content — not filler.
 */
export function getApplicationGuide(locale: Locale, country: Country): {
  title: string;
  intro: string;
  steps: GuideStep[];
  milestoneTitle: string;
  milestones: string[];
  docPrepTitle: string;
  docPrepIntro: string;
  docPrepItems: string[];
} {
  if (country === "CA") return getCanadaGuide(locale);
  return getAustraliaGuide(locale);
}

// ── Australia ───────────────────────────────────────────────────────────────

function getAustraliaGuide(locale: Locale): ReturnType<typeof getApplicationGuide> {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  return {
    title: isTr ? "Başvuru Rehberi" : isZh ? "申请指南" : "Application Guide",
    intro: isTr
      ? "Avustralya skilled migration süreci beş aşamadan oluşur. Her aşama için gereken süre ve belgeler aşağıda açıklanmıştır."
      : isZh
        ? "澳大利亚技术移民流程分为五个阶段。以下说明每个阶段所需的时间和材料。"
        : "The Australian skilled migration process consists of five stages. Below is a breakdown of the timeline and documents required for each stage.",
    steps: [
      {
        title: isTr ? "Adım 1: Beceri Değerlendirmesi" : isZh ? "第一步：技能评估" : "Step 1: Skills Assessment",
        body: isTr
          ? "Mesleğinizin ANZSCO koduna karşılık gelen değerlendirme kurumuna başvurun. Her meslek grubunun kendi değerlendirme kuruluşu vardır (ör. ACS için yazılım geliştirme, VETASSESS için genel meslekler). Başvuru ücreti 500-1200 AUD arasında değişir. Süre: 8-12 hafta."
          : isZh
            ? "向您职业ANZSCO代码对应的评估机构提交申请。每个职业群组有自己的评估机构（例如ACS负责软件开发，VETASSESS负责一般职业）。申请费在500-1200澳元之间。处理时间：8-12周。"
            : "Submit your skills assessment application to the designated assessing authority for your ANZSCO occupation code. Each occupation group has its own authority (e.g., ACS for software development, VETASSESS for general occupations). Application fee ranges from AUD 500-1,200. Processing time: 8-12 weeks.",
      },
      {
        title: isTr ? "Adım 2: İngilizce Dil Testi" : isZh ? "第二步：英语考试" : "Step 2: English Language Test",
        body: isTr
          ? "IELTS, PTE Academic veya TOEFL iBT ile dil seviyenizi kanıtlayın. Minimum gereksinim: IELTS 6.0 (Genel) / PTE 50. Superior (IELTS 8.0 / PTE 79) puanı +20 puan kazandırır. Test sonucu 3 yıl geçerlidir. Ücret: 400-550 AUD."
          : isZh
            ? "通过IELTS、PTE Academic或TOEFL iBT证明您的英语水平。最低要求：雅思6.0（通用类）/ PTE 50。雅思8.0/PTE 79的高分可获得+20分加分。考试成绩有效期3年。费用：400-550澳元。"
            : "Prove your English proficiency via IELTS, PTE Academic, or TOEFL iBT. Minimum requirement: IELTS 6.0 (General) / PTE 50. Superior English (IELTS 8.0 / PTE 79) earns +20 points. Test scores are valid for 3 years. Cost: AUD 400-550.",
      },
      {
        title: isTr ? "Adım 3: EOI Sunma" : isZh ? "第三步：提交EOI" : "Step 3: Lodge Expression of Interest (EOI)",
        body: isTr
          ? "SkillSelect sisteminden EOI sunun. Profil bilgileriniz (yaş, dil, eğitim, iş deneyimi) puanlarınızı otomatik hesaplar. Subclass 189 için minimum 65 puan gerekir. Subclass 190/491 için eyalet adaylığı +5/+15 puan ekler. EOI süresiz aktif kalır, istediğiniz zaman güncelleyebilirsiniz."
          : isZh
            ? "通过SkillSelect系统提交EOI。您的个人信息（年龄、语言、学历、工作经验）会自动计算积分。189子类别最低需要65分。190/491子类别可获得州/领地提名+5/+15分加分。EOI无限期保持有效，您可以随时更新。"
            : "Lodge your Expression of Interest (EOI) through SkillSelect. Your profile information (age, language, education, work experience) is automatically scored. Subclass 189 requires a minimum of 65 points. Subclass 190/491 adds +5/+15 points via state nomination. EOIs remain active indefinitely and can be updated anytime.",
      },
      {
        title: isTr ? "Adım 4: Davet ve Başvuru" : isZh ? "第四步：获邀与申请" : "Step 4: Invitation & Application",
        body: isTr
          ? "Puan barajını aştığınızda davet alırsınız. Davet aldıktan sonra 60 gün içinde tam başvuruyu sunmalısınız. Başvuru ücreti: 4640 AUD (başvuran) + 2320 AUD (ek eş/çocuk). Bu aşama 6-12 ay sürer."
          : isZh
            ? "达到积分门槛后您将收到邀请。收到邀请后须在60天内提交完整申请。申请费：4640澳元（主申请人）+ 2320澳元（随行配偶/子女）。此阶段需要6-12个月。"
            : "Once you exceed the points threshold, you receive an invitation. You must lodge the full application within 60 days of invitation. Application fee: AUD 4,640 (primary applicant) + AUD 2,320 (additional spouse/child). This stage takes 6-12 months.",
      },
      {
        title: isTr ? "Adım 5: Değerlendirme ve Sonuç" : isZh ? "第五步：审核与决定" : "Step 5: Assessment & Decision",
        body: isTr
          ? "Başvurunuz 6-12 ay içinde değerlendirilir. Ek belge istenebilir. Onaylanırsa vize verilir. Reddedilirse temyiz yolları mevcuttur. Vize alındıktan sonra 5 yıl içinde Avustralya'da yaşama hakkınız doğar."
          : isZh
            ? "您的申请将在6-12个月内被审核。可能会要求补充材料。批准后将发放签证。如被拒签，有申诉途径。获得签证后，您有5年时间在澳大利亚居住。"
            : "Your application is assessed within 6-12 months. Additional documents may be requested. If approved, the visa is granted. If refused, appeal options are available. Once granted, you have 5 years to live in Australia.",
      },
    ],
    milestoneTitle: isTr ? "Kritik Zaman Çizelgesi" : isZh ? "关键时间线" : "Critical Timeline",
    milestones: isTr
      ? [
          "Beceri değerlendirmesi: 8-12 hafta",
          "Dil testi: 2-4 hafta (sonuç bekleme)",
          "EOI → Davet: 1-18 ay (puanınıza bağlı)",
          "Davet → Başvuru: 60 gün (kesin süre)",
          "Başvuru → Sonuç: 6-12 ay",
          "Toplam tahmini süre: 12-24 ay",
        ]
      : isZh
        ? [
            "技能评估：8-12周",
            "语言考试：2-4周（等待成绩）",
            "EOI → 获邀：1-18个月（取决于积分）",
            "获邀 → 提交申请：60天（硬性期限）",
            "申请 → 审核结果：6-12个月",
            "预计总耗时：12-24个月",
          ]
        : [
            "Skills assessment: 8-12 weeks",
            "Language test: 2-4 weeks (waiting for results)",
            "EOI → Invitation: 1-18 months (depends on your points)",
            "Invitation → Application: 60 days (strict deadline)",
            "Application → Decision: 6-12 months",
            "Estimated total: 12-24 months",
          ],
    docPrepTitle: isTr ? "Belge Hazırlık Rehberi" : isZh ? "文件准备指南" : "Document Preparation Guide",
    docPrepIntro: isTr
      ? "Başvurunuz reddedilmesinin en yaygın nedeni eksik veya hatalı belgelerdir. Aşağıdaki belgeleri şimdiden hazırlamaya başlayın:"
      : isZh
        ? "申请被拒的最常见原因是材料不全或有误。请现在就开始准备以下文件："
        : "The most common reason for application rejection is incomplete or incorrect documents. Start preparing these now:",
    docPrepItems: isTr
      ? [
          "Pasaport (geçerlilik süresi vize başvuru tarihinden en az 6 ay daha uzun olmalı)",
          "Beceri değerlendirmesi sertifikası (orijinal + yeminli tercüme)",
          "İngilizce dil testi sonuç raporu",
          "İş deneyimi mektupları (employerdan, ANZSCO kodu içermeli)",
          "Eğitim belgeleri (transkript + derece sertifikası)",
          "Polis sabıka kaydı (tüm 12 aydan fazla kaldığınız ülkelerden)",
          "Sağlık muayene raporu (sadece davet sonrası)",
          "İlişki kanıtları (varsa eş/ortak için)",
        ]
      : isZh
        ? [
            "护照（有效期须比签证申请日期至少多6个月）",
            "技能评估证书（原件+认证翻译件）",
            "英语语言测试成绩报告",
            "工作经验证明信（雇主出具，需包含ANZSCO职业代码）",
            "学历文件（成绩单+学位证书）",
            "无犯罪记录证明（所有居住超过12个月的国家）",
            "体检报告（仅在获邀后需要）",
            "关系证明材料（如有配偶/伴侣）",
          ]
        : [
            "Passport (must be valid for at least 6 months beyond application date)",
            "Skills assessment certificate (original + certified translation)",
            "English language test results report",
            "Employment reference letters (from employer, must reference ANZSCO code)",
            "Educational documents (transcripts + degree certificates)",
            "Police clearances (from all countries where you lived 12+ months)",
            "Health examination report (only after invitation)",
            "Relationship evidence (if applying with spouse/partner)",
          ],
  };
}

// ── Canada ──────────────────────────────────────────────────────────────────

function getCanadaGuide(locale: Locale): ReturnType<typeof getApplicationGuide> {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  return {
    title: isTr ? "Başvuru Rehberi" : isZh ? "申请指南" : "Application Guide",
    intro: isTr
      ? "Kanada Express Entry sistemi üç ana programdan oluşur. Aşağıda her aşama için gereken süre ve belgeler açıklanmıştır."
      : isZh
        ? "加拿大快速入境系统由三个主要项目组成。以下说明每个阶段所需的时间和材料。"
        : "The Canada Express Entry system consists of three main programs. Below is a breakdown of the timeline and documents required for each stage.",
    steps: [
      {
        title: isTr ? "Adım 1: NOC ve ECA" : isZh ? "第一步：NOC和ECA" : "Step 1: NOC Classification & ECA",
        body: isTr
          ? "Mesleğinizi NOC 2021 v1.0 sistemine göre sınıflandırın (TEER 0-3 gerekli). Yurtdışı eğitim belgeleriniz için ECA (Educational Credential Assessment) alın. WES en yaygın değerlendirme kuruluşudur. Ücret: 200-300 CAD. Süre: 4-8 hafta."
          : isZh
            ? "根据NOC 2021 v1.0系统对您的职业进行分类（需要TEER 0-3级别）。海外学历需要申请ECA（学历认证）。WES是最常用的评估机构。费用：200-300加元。处理时间：4-8周。"
            : "Classify your occupation under the NOC 2021 v1.0 system (TEER 0-3 required). Obtain an Educational Credential Assessment (ECA) for your foreign education documents. WES is the most commonly used assessment body. Cost: CAD 200-300. Processing time: 4-8 weeks.",
      },
      {
        title: isTr ? "Adım 2: Dil Testi" : isZh ? "第二步：语言考试" : "Step 2: Language Test",
        body: isTr
          ? "IELTS General veya CELPIP (İngilizce) / TEF Canada (Fransızca) ile dil seviyenizi kanıtlayın. CLB 7 minimum gereksinimdir (IELTS 6.0 her bantta). CLB 9+ (IELTS 7.0+) güçlü CRS puanı sağlar. Test 2 yıl geçerlidir."
          : isZh
            ? "通过IELTS General或CELPIP（英语）/ TEF Canada（法语）证明您的语言水平。最低要求CLB 7（雅思各项6.0）。CLB 9+（雅思7.0+）可获得更高的CRS积分。考试有效期2年。"
            : "Prove your language proficiency via IELTS General or CELPIP (English) / TEF Canada (French). CLB 7 minimum required (IELTS 6.0 per band). CLB 9+ (IELTS 7.0+) yields a strong CRS score. Test scores valid for 2 years.",
      },
      {
        title: isTr ? "Adım 3: CRS Profili" : isZh ? "第三步：CRS档案" : "Step 3: Create Express Entry Profile",
        body: isTr
          ? "IRCC web sitesinden Express Entry profilinizi oluşturun. Profiliniz otomatik olarak CRS (Comprehensive Ranking System) puanınızı hesaplar. FSW, FST veya CEC programlarından birine uygun olmalısınız."
          : isZh
            ? "在IRCC网站上创建Express Entry档案。您的档案会自动计算CRS（综合排名系统）积分。您必须符合FSW、FST或CEC项目之一的资格。"
            : "Create your Express Entry profile on the IRCC website. Your profile automatically calculates your Comprehensive Ranking System (CRS) score. You must qualify for one of FSW, FST, or CEC programs.",
      },
      {
        title: isTr ? "Adım 4: Davet ve Başvuru" : isZh ? "第四步：获邀与申请" : "Step 4: Invitation & Application",
        body: isTr
          ? "CRS puanınız draw cutoff'unu aştığında ITA (Invitation to Apply) alırsınız. ITA aldıktan sonra 60 gün içinde tam başvuruyu sunmalısınız. Başvuru ücreti: 1365 CAD (başvuran) + ek ücretler."
          : isZh
            ? "当您的CRS分数超过抽签分数线时，您将收到ITA（申请邀请）。收到ITA后须在60天内提交完整申请。申请费：1365加元（主申请人）+额外费用。"
            : "When your CRS score exceeds the draw cutoff, you receive an Invitation to Apply (ITA). You must lodge the full application within 60 days of ITA. Application fee: CAD 1,365 (primary applicant) plus additional fees.",
      },
      {
        title: isTr ? "Adım 5: Değerlendirme" : isZh ? "第五步：审核" : "Step 5: Assessment & Decision",
        body: isTr
          ? "Başvurunuz 6 ay içinde değerlendirilir (hedef süre). Ek belge istenebilir. Onaylanırsa COPR (Confirmation of Permanent Residence) alırsınız. Kanada'ya giriş yaparak PR statünüzü aktifleştirirsiniz."
          : isZh
            ? "您的申请将在6个月内被审核（目标时间）。可能会要求补充材料。批准后将获得COPR（永久居民确认函）。入境加拿大后激活PR身份。"
            : "Your application is assessed within 6 months (target). Additional documents may be requested. If approved, you receive a COPR (Confirmation of Permanent Residence). Activate your PR status by entering Canada.",
      },
    ],
    milestoneTitle: isTr ? "Kritik Zaman Çizelgesi" : isZh ? "关键时间线" : "Critical Timeline",
    milestones: isTr
      ? [
          "NOC/ECA: 4-8 hafta",
          "Dil testi: 2-4 hafta",
          "Profil oluşturma: 1 gün",
          "Profil → ITA: 1-12 ay (CRS puanınıza bağlı)",
          "ITA → Başvuru: 60 gün (kesin süre)",
          "Başvuru → Sonuç: 6 ay (hedef)",
          "Toplam tahmini süre: 6-18 ay",
        ]
      : isZh
        ? [
            "NOC/ECA：4-8周",
            "语言考试：2-4周",
            "创建档案：1天",
            "档案 → 获邀：1-12个月（取决于CRS分数）",
            "ITA → 提交申请：60天（硬性期限）",
            "申请 → 审核结果：6个月（目标时间）",
            "预计总耗时：6-18个月",
          ]
        : [
            "NOC/ECA: 4-8 weeks",
            "Language test: 2-4 weeks",
            "Profile creation: 1 day",
            "Profile → ITA: 1-12 months (depends on CRS score)",
            "ITA → Application: 60 days (strict deadline)",
            "Application → Decision: 6 months (target)",
            "Estimated total: 6-18 months",
          ],
    docPrepTitle: isTr ? "Belge Hazırlık Rehberi" : isZh ? "文件准备指南" : "Document Preparation Guide",
    docPrepIntro: isTr
      ? "Başvuru reddedilmesinin en yaygın nedeni eksik belgelerdir. Aşağıdaki belgeleri şimdiden hazırlayın:"
      : isZh
        ? "申请被拒的最常见原因是材料不全。请现在就开始准备以下文件："
        : "The most common reason for application rejection is incomplete documents. Start preparing these now:",
    docPrepItems: isTr
      ? [
          "Pasaport (geçerli)",
          "NOC kodu onayı (meslek tanımları ile eşleşme)",
          "ECA sertifikası (WES veya diğer IRCC onaylı kuruluş)",
          "Dil testi sonuç raporu",
          "İş deneyimi mektupları (imzalı, şirket antetli kağıt)",
          "Eğitim belgeleri (transkript + derece)",
          "Polis sabıka kayıtları (tüm ülkelerden)",
          "Sağlık muayene raporu (sadece ITA sonrası)",
          "Finansal kanıt ( Settlement Funds )",
        ]
      : isZh
        ? [
            "有效护照",
            "NOC代码确认（与职业描述匹配）",
            "ECA证书（WES或IRCC认可的其他机构）",
            "语言测试成绩报告",
            "工作经验证明信（签字、公司抬头纸）",
            "学历文件（成绩单+学位证书）",
            "无犯罪记录证明（所有国家）",
            "体检报告（仅在ITA后需要）",
            "资金证明（定居资金）",
          ]
        : [
            "Valid passport",
            "NOC code confirmation (matched to occupation descriptions)",
            "ECA certificate (WES or other IRCC-approved body)",
            "Language test results report",
            "Employment reference letters (signed, company letterhead)",
            "Educational documents (transcripts + degree)",
            "Police clearances (from all countries)",
            "Health examination report (only after ITA)",
            "Proof of funds (Settlement Funds)",
          ],
  };
}

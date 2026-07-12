import { t3 } from "@/src/lib/readiness/localization";
import expressEntryConfig from "@/src/data/countries/ca/express-entry.json";
import type { DocumentCategory, Locale } from "./types";
import type { CanadaPathwayCode } from "./engine";

function localizedItems(
  locale: Locale,
  rows: Array<[en: string, tr: string, zh: string]>
): string[] {
  return rows.map(([en, tr, zh]) => t3(locale, en, tr, zh));
}

export function getDocumentChecklist(
  subclasses: string[],
  locale: Locale
): DocumentCategory[] {
  if (subclasses.length === 0) return [];

  const categories: DocumentCategory[] = [];

  categories.push({
    category: t3(locale, "Identity and passport", "Kimlik ve pasaport", "身份与护照"),
    items: localizedItems(locale, [
      ["Passport (valid, not expired)", "Pasaport (geçerli ve süresi dolmamış)", "护照（有效且未过期）"],
      ["Identity documents", "Kimlik belgeleri", "身份证明文件"],
    ]),
  });

  if (subclasses.includes("500")) {
    categories.push({
      category: t3(locale, "500 Student Visa", "500 Öğrenci Vizesi", "500 学生签证"),
      items: localizedItems(locale, [
        ["Confirmation of Enrolment (CoE)", "Kayıt Onayı (CoE)", "入学确认书（CoE）"],
        ["Overseas Student Health Cover (OSHC)", "Yurt dışı öğrenci sağlık sigortası (OSHC)", "海外学生健康保险（OSHC）"],
        ["English evidence if required", "Gerekiyorsa İngilizce kanıtı", "如适用，提供英语能力证明"],
        ["Financial evidence", "Mali yeterlilik kanıtı", "资金能力证明"],
        ["Welfare arrangement if under 18", "18 yaşından küçükse bakım düzenlemesi kanıtı", "未满 18 岁的监护安排证明"],
      ]),
    });
  }

  if (subclasses.includes("485")) {
    categories.push({
      category: t3(locale, "485 Temporary Graduate Visa", "485 Geçici Mezun Vizesi", "485 临时毕业生签证"),
      items: localizedItems(locale, [
        [
          "Qualification certificate and transcript from CRICOS-registered institution",
          "CRICOS kayıtlı kurumdan nitelik belgesi ve transkript",
          "CRICOS 注册院校的学历证书与成绩单",
        ],
        [
          "Evidence of having held a Student visa (subclass 500) in the last 6 months",
          "Son 6 ayda öğrenci vizesi (500) tutulduğuna dair kanıt",
          "过去 6 个月内持有学生签证（500）的证明",
        ],
        ["English language test results", "İngilizce dil testi sonuçları", "英语语言考试成绩"],
        ["Health insurance", "Sağlık sigortası", "健康保险"],
        ["Australian police clearance certificate", "Avustralya polis taraması sertifikası", "澳大利亚无犯罪记录证明"],
        ["Overseas police certificates if required", "Gerekiyorsa yurt dışı sabıka kayıtları", "如要求，海外无犯罪记录证明"],
        ["Health examination results if requested", "Gerekiyorsa sağlık muayenesi sonuçları", "如要求，体检结果"],
      ]),
    });
  }

  if (subclasses.includes("482")) {
    categories.push({
      category: t3(locale, "482 Skills in Demand Visa", "482 Skills in Demand Vizesi", "482 紧缺技能签证"),
      items: localizedItems(locale, [
        ["Employer nomination or TRN reference", "İşveren aday gösterimi veya TRN referansı", "雇主提名或 TRN 参考号"],
        ["Skills and qualification evidence", "Beceri ve nitelik kanıtı", "技能与学历证明"],
        ["Employment references and work experience evidence", "İstihdam referansları ve iş deneyimi kanıtı", "雇佣推荐信与工作经验证明"],
        ["English evidence", "İngilizce kanıtı", "英语能力证明"],
        ["Health insurance", "Sağlık sigortası", "健康保险"],
        ["Police certificates if required", "Gerekiyorsa sabıka kaydı", "如要求，无犯罪记录证明"],
      ]),
    });
  }

  const skilledSubclasses = subclasses.filter((s) =>
    ["189", "190", "491"].includes(s)
  );
  if (skilledSubclasses.length > 0) {
    const visaLabel = skilledSubclasses.join("/");
    const extraItems: string[] = [];
    if (subclasses.includes("190")) {
      extraItems.push(
        t3(locale, "State/territory nomination evidence for 190", "190 için eyalet/bölge adaylık kanıtı", "190 州或领地提名证明")
      );
    }
    if (subclasses.includes("491")) {
      extraItems.push(
        t3(locale, "Nomination or relative sponsorship evidence for 491", "491 için adaylık veya akraba sponsor kanıtı", "491 提名或亲属担保证明")
      );
    }
    categories.push({
      category: t3(
        locale,
        `${visaLabel} Skilled Migration Visa`,
        `${visaLabel} Yetenekli Göç Vizesi`,
        `${visaLabel} 技术移民签证`
      ),
      items: [
        ...localizedItems(locale, [
          ["Skills assessment from relevant assessing authority", "İlgili değerlendirme kurumundan beceri değerlendirmesi", "相关评估机构的职业评估"],
          ["English evidence", "İngilizce kanıtı", "英语能力证明"],
          ["Expression of Interest (EOI) / SkillSelect details", "EOI / SkillSelect bilgileri", "意向书（EOI）/ SkillSelect 信息"],
          ["Points claim evidence", "Puan iddiası belgeleri", "加分主张证明"],
          ["Employment evidence and references", "İstihdam kanıtı ve referanslar", "工作证明与推荐信"],
          ["Qualification certificates and transcripts", "Nitelik sertifikaları ve transkriptler", "学历证书与成绩单"],
          ["Police certificates if required", "Gerekiyorsa sabıka kaydı", "如要求，无犯罪记录证明"],
        ]),
        ...extraItems,
      ],
    });
  }

  if (subclasses.includes("820")) {
    categories.push({
      category: t3(locale, "820 Partner Visa (Temporary)", "820 Partner Vizesi (Geçici)", "820 配偶签证（临时）"),
      items: localizedItems(locale, [
        ["Sponsorship approval evidence", "Sponsorluk onay kanıtı", "担保批准证明"],
        ["Relationship history statement", "İlişki geçmişi beyanı", "关系历史陈述"],
        ["Financial relationship evidence", "Mali ilişki kanıtı", "财务关系证明"],
        ["Household evidence", "Ortak yaşam kanıtı", "共同生活证明"],
        ["Social evidence and Form 888", "Sosyal kanıt ve Form 888", "社会关系证明与 888 表格"],
        ["Commitment evidence", "Bağlılık kanıtı", "长期承诺证明"],
        ["Police certificates if required", "Gerekiyorsa sabıka kaydı", "如要求，无犯罪记录证明"],
      ]),
    });
  }

  if (subclasses.includes("801")) {
    categories.push({
      category: t3(locale, "801 Partner Visa (Permanent)", "801 Partner Vizesi (Kalıcı)", "801 配偶签证（永久）"),
      items: localizedItems(locale, [
        ["Updated statutory declaration from sponsor", "Sponsordan güncel yeminli beyan", "担保人更新的法定声明"],
        ["Updated financial and household evidence", "Güncel mali ve ev içi kanıtlar", "更新的财务及家庭证据"],
        ["Updated Australian police certificate, if previous one expired", "Önceki belge süresi dolduysa güncel Avustralya sabıka kaydı", "如先前证明已过期，需提供更新的澳大利亚无犯罪记录证明"],
        ["Confirmation that 2 years have passed since the subclass 820 application", "Subclass 820 başvurusundan itibaren 2 yıl geçtiğine dair teyit", "确认自820类别申请以来已满2年"],
      ]),
    });
  }

  return categories;
}

// Built from express-entry.json's documentsRequired + languageTests/ECA fields.
// NAATI (AU translator accreditation) has no Canadian equivalent and is
// intentionally not referenced anywhere in this function.
export function getCanadaDocumentChecklist(
  pathwayCodes: CanadaPathwayCode[],
  locale: Locale
): DocumentCategory[] {
  if (pathwayCodes.length === 0) return [];

  const categories: DocumentCategory[] = [];

  categories.push({
    category: t3(locale, "Identity and passport", "Kimlik ve pasaport", "身份与护照"),
    items: localizedItems(locale, [
      ["Passport or travel document (valid; copy of all used pages)", "Pasaport veya seyahat belgesi (geçerli; kullanılan tüm sayfaların kopyası)", "护照或旅行证件（有效；全部已用页面的复印件）"],
      ["Police certificates (applicant + family 18+, every country resided in 6+ months in last 10 years)", "Sabıka kaydı (başvuru sahibi ve 18+ aile üyeleri, son 10 yılda 6+ ay yaşanan her ülke için)", "无犯罪记录证明（申请人及18岁以上家庭成员，过去10年内居住6个月以上的每个国家）"],
      ["IMM 0008 — Generic Application Form for Canada (principal applicant)", "IMM 0008 — Kanada Genel Başvuru Formu (ana başvurucu)", "IMM 0008 — 加拿大通用申请表（主申请人）"],
      ["IMM 5669 — Schedule A Background/Declaration (all applicants 18+)", "IMM 5669 — Ek A Arkaplan/Beyan (18+ tüm başvurucular)", "IMM 5669 — 附表A 背景/声明（所有18岁以上申请人）"],
      ["IMM 5406 — Additional Family Information (all applicants 18+)", "IMM 5406 — Ek Aile Bilgileri (18+ tüm başvurucular)", "IMM 5406 — 附加家庭信息（所有18岁以上申请人）"],
    ]),
  });

  categories.push({
    category: t3(locale, "Language test", "Dil sınavı", "语言考试"),
    items: localizedItems(locale, [
      [
        `Language test results (${expressEntryConfig.languageTests.english.join(", ")} for English; ${expressEntryConfig.languageTests.french.join(", ")} for French)`,
        `Dil sınavı sonuçları (İngilizce için ${expressEntryConfig.languageTests.english.join(", ")}; Fransızca için ${expressEntryConfig.languageTests.french.join(", ")})`,
        `语言考试成绩（英语：${expressEntryConfig.languageTests.english.join("、")}；法语：${expressEntryConfig.languageTests.french.join("、")}）`,
      ],
      [
        `Test must be within validity window (${expressEntryConfig.languageTests.validityYears} years)`,
        `Sınav geçerlilik süresi içinde olmalıdır (${expressEntryConfig.languageTests.validityYears} yıl)`,
        `考试必须在有效期内（${expressEntryConfig.languageTests.validityYears} 年）`,
      ],
    ]),
  });

  categories.push({
    category: t3(locale, "Education (ECA)", "Eğitim (ECA)", "教育（ECA）"),
    items: localizedItems(locale, [
      [
        "Educational Credential Assessment (ECA) — IRCC-designated body required (WES, ICAS, IQAS, WES, PEBC, etc.) — valid within 5 years",
        "Eğitim Belgesi Değerlendirmesi (ECA) — IRCC tarafından belirlenmiş kurum gereklidir (WES, ICAS, IQAS, vb.) — 5 yıl içinde geçerli",
        "教育资历评估（ECA）——须由IRCC指定机构评估（WES、ICAS、IQAS等），有效期5年内",
      ],
      [
        "WES (World Education Services) — most common for FSW/CEC/FSTP; accepts transcripts + degree certificate; standard processing ~7–20 business days (AUD $239–$285)",
        "WES (Dünya Eğitim Hizmetleri) — FSW/CEC/FSTP için en yaygın; transkript + derece belgesi kabul eder; standart işlem ~7–20 iş günü",
        "WES（世界教育服务）——最常用于FSW/CEC/FSTP；接受成绩单+学位证书；标准处理约7-20个工作日",
      ],
      [
        "ICAS (International Credential Assessment Service) — accepted for most Express Entry streams; often faster than WES for some countries",
        "ICAS (Uluslararası Belge Değerlendirme Servisi) — çoğu Express Entry akışı için kabul edilir; bazı ülkeler için WES'ten daha hızlı olabilir",
        "ICAS（国际资历评估服务）——适用于大多数Express Entry通道；部分国家评估比WES更快",
      ],
      [
        "Original transcripts and degree certificates (notarized/certified translations if not in English or French)",
        "Orijinal transkriptler ve derece belgeleri (İngilizce veya Fransızca değilse noter/sertifikalı çeviriler)",
        "原版成绩单和学位证书（非英语或法语须经公证/认证翻译）",
      ],
    ]),
  });

  if (pathwayCodes.includes("FSTP")) {
    categories.push({
      category: t3(locale, "FSTP: trade qualification", "FSTP: esnaflık niteliği", "FSTP：技术工种资质"),
      items: localizedItems(locale, [
        ["Certificate of qualification from a provincial/territorial/federal authority, or a written job offer", "Eyalet/bölge/federal yetkiliden esnaflık sertifikası veya yazılı iş teklifi", "省/地区/联邦机构颁发的资格证书，或书面工作邀约"],
        ["Evidence of skilled trade work experience (2 years / 3,120 hours within last 5 years)", "Vasıflı esnaflık iş tecrübesi kanıtı (son 5 yılda 2 yıl / 3.120 saat)", "技术工种工作经验证明（过去5年内2年/3120小时）"],
      ]),
    });
  }

  if (pathwayCodes.includes("CEC")) {
    categories.push({
      category: t3(locale, "CEC: Canadian work experience", "CEC: Kanada iş tecrübesi", "CEC：加拿大工作经验"),
      items: localizedItems(locale, [
        ["Evidence of Canadian work experience (1 year / 1,560 hours within last 3 years, NOC TEER 0-3)", "Kanada iş tecrübesi kanıtı (son 3 yılda 1 yıl / 1.560 saat, NOC TEER 0-3)", "加拿大工作经验证明（过去3年内1年/1560小时，NOC TEER 0-3）"],
      ]),
    });
  }

  if (pathwayCodes.includes("FSW")) {
    categories.push({
      category: t3(locale, "FSW: work experience and funds", "FSW: iş tecrübesi ve fonlar", "FSW：工作经验与资金"),
      items: localizedItems(locale, [
        ["Evidence of skilled work experience (1 year continuous within last 10 years, NOC TEER 0-3) — employer letters on company letterhead with hours, salary, duties, dates", "Vasıflı iş tecrübesi kanıtı (son 10 yılda 1 yıl sürekli, NOC TEER 0-3) — saat, maaş, görevler ve tarihler içeren şirket antetli kağıdında işveren mektupları", "技术工作经验证明（过去10年内连续1年，NOC TEER 0-3）——含工作时间、薪资、职责、日期的公司抬头雇主信"],
        ["Proof of funds — bank statements showing consistent balance for 3–6 months. Required amounts (2024 IRCC): 1 person CAD $13,757 · 2 persons $17,127 · 3 persons $21,055 · 4 persons $25,564 · 5+ persons $28,994+. Funds must be unencumbered and transferable to Canada.", "Fon kanıtı — 3-6 aylık tutarlı bakiye gösteren banka ekstresi. Gerekli tutarlar (2024 IRCC): 1 kişi CAD 13.757 · 2 kişi 17.127 · 3 kişi 21.055 · 4 kişi 25.564 · 5+ kişi 28.994+. Fonlar serbest ve Kanada'ya transfer edilebilir olmalıdır.", "资金证明——3-6个月余额稳定的银行流水。所需金额（2024年IRCC）：1人CAD $13,757·2人$17,127·3人$21,055·4人$25,564·5人以上$28,994+。资金须无抵押且可转入加拿大。"],
      ]),
    });
  }

  categories.push({
    category: t3(locale, "If applicable", "Uygunsa", "如适用"),
    items: localizedItems(locale, [
      ["Provincial nomination certificate (PNP), if applying with a nomination — must match the name and information in your Express Entry profile", "PNP adaylık sertifikası — Express Entry profilinizdeki ad ve bilgilerle eşleşmesi gerekir", "省提名证书（PNP）——须与Express Entry档案中的姓名和信息一致"],
      ["Written job offer (IMM 5802) — only required if claiming job-offer CRS points; must be LMIA-supported unless LMIA-exempt under R204/R205", "Yazılı iş teklifi (IMM 5802) — yalnızca iş teklifi CRS puanları talep ediliyorsa gereklidir; R204/R205 kapsamında muaf değilse LMIA destekli olmalıdır", "书面工作邀约（IMM 5802）——仅在申领工作邀约CRS分时须提供；除R204/R205豁免外须有LMIA支持"],
      ["Medical examination results (valid 12 months) — completed by IRCC-designated Panel Physician only", "Sağlık muayenesi sonuçları (12 ay geçerli) — yalnızca IRCC tarafından belirlenmiş Panel Hekimi tarafından yapılmalıdır", "体检结果（有效期12个月）——须由IRCC指定的体检医生完成"],
      ["Biometric enrolment receipt (if biometrics previously collected and still valid)", "Biyometrik kayıt makbuzu (daha önce toplandı ve hâlâ geçerliyse)", "生物特征采集凭证（如之前已采集且仍在有效期内）"],
    ]),
  });

  return categories;
}

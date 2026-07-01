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
      ["Passport (valid, not expired)", "Pasaport (gecerli ve suresi dolmamis)", "护照（有效且未过期）"],
      ["Identity documents", "Kimlik belgeleri", "身份证明文件"],
    ]),
  });

  if (subclasses.includes("500")) {
    categories.push({
      category: t3(locale, "500 Student Visa", "500 Ogrenci Vizesi", "500 学生签证"),
      items: localizedItems(locale, [
        ["Confirmation of Enrolment (CoE)", "Kayit Onayi (CoE)", "入学确认书（CoE）"],
        ["Overseas Student Health Cover (OSHC)", "Yurt disi ogrenci saglik sigortasi (OSHC)", "海外学生健康保险（OSHC）"],
        ["English evidence if required", "Gerekiyorsa Ingilizce kaniti", "如适用，提供英语能力证明"],
        ["Financial evidence", "Mali yeterlilik kaniti", "资金能力证明"],
        ["Welfare arrangement if under 18", "18 yasindan kucukse bakim duzenlemesi kaniti", "未满 18 岁的监护安排证明"],
      ]),
    });
  }

  if (subclasses.includes("485")) {
    categories.push({
      category: t3(locale, "485 Temporary Graduate Visa", "485 Gecici Mezun Vizesi", "485 临时毕业生签证"),
      items: localizedItems(locale, [
        [
          "Qualification certificate and transcript from CRICOS-registered institution",
          "CRICOS kayitli kurumdan nitelik belgesi ve transkript",
          "CRICOS 注册院校的学历证书与成绩单",
        ],
        [
          "Evidence of having held a Student visa (subclass 500) in the last 6 months",
          "Son 6 ayda ogrenci vizesi (500) tutulduguna dair kanit",
          "过去 6 个月内持有学生签证（500）的证明",
        ],
        ["English language test results", "Ingilizce dil testi sonuclari", "英语语言考试成绩"],
        ["Health insurance", "Saglik sigortasi", "健康保险"],
        ["Australian police clearance certificate", "Avustralya polis taramasi sertifikasi", "澳大利亚无犯罪记录证明"],
        ["Overseas police certificates if required", "Gerekiyorsa yurt disi sabika kayitlari", "如要求，海外无犯罪记录证明"],
        ["Health examination results if requested", "Gerekiyorsa saglik muayenesi sonuclari", "如要求，体检结果"],
      ]),
    });
  }

  if (subclasses.includes("482")) {
    categories.push({
      category: t3(locale, "482 Skills in Demand Visa", "482 Skills in Demand Vizesi", "482 紧缺技能签证"),
      items: localizedItems(locale, [
        ["Employer nomination or TRN reference", "Isveren aday gosterimi veya TRN referansi", "雇主提名或 TRN 参考号"],
        ["Skills and qualification evidence", "Beceri ve nitelik kaniti", "技能与学历证明"],
        ["Employment references and work experience evidence", "Istihdam referanslari ve is deneyimi kaniti", "雇佣推荐信与工作经验证明"],
        ["English evidence", "Ingilizce kaniti", "英语能力证明"],
        ["Health insurance", "Saglik sigortasi", "健康保险"],
        ["Police certificates if required", "Gerekiyorsa sabika kaydi", "如要求，无犯罪记录证明"],
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
        t3(locale, "State/territory nomination evidence for 190", "190 icin eyalet/bolge adaylik kaniti", "190 州或领地提名证明")
      );
    }
    if (subclasses.includes("491")) {
      extraItems.push(
        t3(locale, "Nomination or relative sponsorship evidence for 491", "491 icin adaylik veya akraba sponsor kaniti", "491 提名或亲属担保证明")
      );
    }
    categories.push({
      category: t3(
        locale,
        `${visaLabel} Skilled Migration Visa`,
        `${visaLabel} Yetenekli Goc Vizesi`,
        `${visaLabel} 技术移民签证`
      ),
      items: [
        ...localizedItems(locale, [
          ["Skills assessment from relevant assessing authority", "Ilgili degerlendirme kurumundan beceri degerlendirmesi", "相关评估机构的职业评估"],
          ["English evidence", "Ingilizce kaniti", "英语能力证明"],
          ["Expression of Interest (EOI) / SkillSelect details", "EOI / SkillSelect bilgileri", "意向书（EOI）/ SkillSelect 信息"],
          ["Points claim evidence", "Puan iddiasi belgeleri", "加分主张证明"],
          ["Employment evidence and references", "Istihdam kaniti ve referanslar", "工作证明与推荐信"],
          ["Qualification certificates and transcripts", "Nitelik sertifikalari ve transkriptler", "学历证书与成绩单"],
          ["Police certificates if required", "Gerekiyorsa sabika kaydi", "如要求，无犯罪记录证明"],
        ]),
        ...extraItems,
      ],
    });
  }

  if (subclasses.includes("820")) {
    categories.push({
      category: t3(locale, "820 Partner Visa (Temporary)", "820 Partner Vizesi (Geçici)", "820 配偶签证（临时）"),
      items: localizedItems(locale, [
        ["Sponsorship approval evidence", "Sponsorluk onay kaniti", "担保批准证明"],
        ["Relationship history statement", "Iliski gecmisi beyani", "关系历史陈述"],
        ["Financial relationship evidence", "Mali iliski kaniti", "财务关系证明"],
        ["Household evidence", "Ortak yasam kaniti", "共同生活证明"],
        ["Social evidence and Form 888", "Sosyal kanit ve Form 888", "社会关系证明与 888 表格"],
        ["Commitment evidence", "Baglilik kaniti", "长期承诺证明"],
        ["Police certificates if required", "Gerekiyorsa sabika kaydi", "如要求，无犯罪记录证明"],
      ]),
    });
  }

  if (subclasses.includes("801")) {
    categories.push({
      category: t3(locale, "801 Partner Visa (Permanent)", "801 Partner Vizesi (Kalıcı)", "801 配偶签证（永久）"),
      items: localizedItems(locale, [
        ["Updated statutory declaration from sponsor", "Sponsordan guncel yeminli beyan", "担保人更新的法定声明"],
        ["Updated financial and household evidence", "Guncel mali ve ev ici kanitlar", "更新的财务及家庭证据"],
        ["Updated Australian police certificate, if previous one expired", "Onceki belge suresi dolduysa guncel Avustralya sabika kaydi", "如先前证明已过期，需提供更新的澳大利亚无犯罪记录证明"],
        ["Confirmation that 2 years have passed since the subclass 820 application", "Subclass 820 basvurusundan itibaren 2 yil gectigine dair teyit", "确认自820类别申请以来已满2年"],
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
      ["Passport or travel document (valid; copy of all used pages)", "Pasaport veya seyahat belgesi (gecerli; kullanilan tum sayfalarin kopyasi)", "护照或旅行证件（有效；全部已用页面的复印件）"],
      ["Police certificates (applicant + family 18+, every country resided in 6+ months in last 10 years)", "Sabika kaydi (basvuru sahibi ve 18+ aile uyeleri, son 10 yilda 6+ ay yasanan her ulke icin)", "无犯罪记录证明（申请人及18岁以上家庭成员，过去10年内居住6个月以上的每个国家）"],
      ["IMM 0008 — Generic Application Form for Canada (principal applicant)", "IMM 0008 — Kanada Genel Basvuru Formu (ana basvurucu)", "IMM 0008 — 加拿大通用申请表（主申请人）"],
      ["IMM 5669 — Schedule A Background/Declaration (all applicants 18+)", "IMM 5669 — Ek A Arkaplan/Beyan (18+ tum basvurucular)", "IMM 5669 — 附表A 背景/声明（所有18岁以上申请人）"],
      ["IMM 5406 — Additional Family Information (all applicants 18+)", "IMM 5406 — Ek Aile Bilgileri (18+ tum basvurucular)", "IMM 5406 — 附加家庭信息（所有18岁以上申请人）"],
    ]),
  });

  categories.push({
    category: t3(locale, "Language test", "Dil sinavi", "语言考试"),
    items: localizedItems(locale, [
      [
        `Language test results (${expressEntryConfig.languageTests.english.join(", ")} for English; ${expressEntryConfig.languageTests.french.join(", ")} for French)`,
        `Dil sinavi sonuclari (Ingilizce icin ${expressEntryConfig.languageTests.english.join(", ")}; Fransizca icin ${expressEntryConfig.languageTests.french.join(", ")})`,
        `语言考试成绩（英语：${expressEntryConfig.languageTests.english.join("、")}；法语：${expressEntryConfig.languageTests.french.join("、")}）`,
      ],
      [
        `Test must be within validity window (${expressEntryConfig.languageTests.validityYears} years)`,
        `Sinav gecerlilik suresi icinde olmalidir (${expressEntryConfig.languageTests.validityYears} yil)`,
        `考试必须在有效期内（${expressEntryConfig.languageTests.validityYears} 年）`,
      ],
    ]),
  });

  categories.push({
    category: t3(locale, "Education (ECA)", "Egitim (ECA)", "教育（ECA）"),
    items: localizedItems(locale, [
      [
        "Educational Credential Assessment (ECA) — IRCC-designated body required (WES, ICAS, IQAS, WES, PEBC, etc.) — valid within 5 years",
        "Egitim Belgesi Degerlendirmesi (ECA) — IRCC tarafindan belirlenmis kurum gereklidir (WES, ICAS, IQAS, vb.) — 5 yil icinde gecerli",
        "教育资历评估（ECA）——须由IRCC指定机构评估（WES、ICAS、IQAS等），有效期5年内",
      ],
      [
        "WES (World Education Services) — most common for FSW/CEC/FSTP; accepts transcripts + degree certificate; standard processing ~7–20 business days (AUD $239–$285)",
        "WES (Dunya Egitim Hizmetleri) — FSW/CEC/FSTP icin en yaygin; transkript + derece belgesi kabul eder; standart islem ~7–20 is gunu",
        "WES（世界教育服务）——最常用于FSW/CEC/FSTP；接受成绩单+学位证书；标准处理约7-20个工作日",
      ],
      [
        "ICAS (International Credential Assessment Service) — accepted for most Express Entry streams; often faster than WES for some countries",
        "ICAS (Uluslararasi Belge Degerlendirme Servisi) — cogu Express Entry akisi icin kabul edilir; bazi ulkeler icin WES'ten daha hizli olabilir",
        "ICAS（国际资历评估服务）——适用于大多数Express Entry通道；部分国家评估比WES更快",
      ],
      [
        "Original transcripts and degree certificates (notarized/certified translations if not in English or French)",
        "Orijinal transkriptler ve derece belgeleri (Ingilizce veya Fransizca degilse noter/sertifikayli ceviriler)",
        "原版成绩单和学位证书（非英语或法语须经公证/认证翻译）",
      ],
    ]),
  });

  if (pathwayCodes.includes("FSTP")) {
    categories.push({
      category: t3(locale, "FSTP: trade qualification", "FSTP: esnaflik niteligi", "FSTP：技术工种资质"),
      items: localizedItems(locale, [
        ["Certificate of qualification from a provincial/territorial/federal authority, or a written job offer", "Eyalet/bolge/federal yetkiliden esnaflik sertifikasi veya yazili is teklifi", "省/地区/联邦机构颁发的资格证书，或书面工作邀约"],
        ["Evidence of skilled trade work experience (2 years / 3,120 hours within last 5 years)", "Vasifli esnaflik is tecrubesi kaniti (son 5 yilda 2 yil / 3.120 saat)", "技术工种工作经验证明（过去5年内2年/3120小时）"],
      ]),
    });
  }

  if (pathwayCodes.includes("CEC")) {
    categories.push({
      category: t3(locale, "CEC: Canadian work experience", "CEC: Kanada is tecrubesi", "CEC：加拿大工作经验"),
      items: localizedItems(locale, [
        ["Evidence of Canadian work experience (1 year / 1,560 hours within last 3 years, NOC TEER 0-3)", "Kanada is tecrubesi kaniti (son 3 yilda 1 yil / 1.560 saat, NOC TEER 0-3)", "加拿大工作经验证明（过去3年内1年/1560小时，NOC TEER 0-3）"],
      ]),
    });
  }

  if (pathwayCodes.includes("FSW")) {
    categories.push({
      category: t3(locale, "FSW: work experience and funds", "FSW: is tecrubesi ve fonlar", "FSW：工作经验与资金"),
      items: localizedItems(locale, [
        ["Evidence of skilled work experience (1 year continuous within last 10 years, NOC TEER 0-3) — employer letters on company letterhead with hours, salary, duties, dates", "Vasifli is tecrubesi kaniti (son 10 yilda 1 yil surekli, NOC TEER 0-3) — saat, maas, gorevler ve tarihler iceren sirket antetli kagidinda isveren mektuplari", "技术工作经验证明（过去10年内连续1年，NOC TEER 0-3）——含工作时间、薪资、职责、日期的公司抬头雇主信"],
        ["Proof of funds — bank statements showing consistent balance for 3–6 months. Required amounts (2024 IRCC): 1 person CAD $13,757 · 2 persons $17,127 · 3 persons $21,055 · 4 persons $25,564 · 5+ persons $28,994+. Funds must be unencumbered and transferable to Canada.", "Fon kaniti — 3-6 aylik tutarli bakiye gosteren banka ekstresi. Gerekli tutarlar (2024 IRCC): 1 kisi CAD 13.757 · 2 kisi 17.127 · 3 kisi 21.055 · 4 kisi 25.564 · 5+ kisi 28.994+. Fonlar serbest ve Kanada'ya transfer edilebilir olmalidir.", "资金证明——3-6个月余额稳定的银行流水。所需金额（2024年IRCC）：1人CAD $13,757·2人$17,127·3人$21,055·4人$25,564·5人以上$28,994+。资金须无抵押且可转入加拿大。"],
      ]),
    });
  }

  categories.push({
    category: t3(locale, "If applicable", "Uygunsa", "如适用"),
    items: localizedItems(locale, [
      ["Provincial nomination certificate (PNP), if applying with a nomination — must match the name and information in your Express Entry profile", "PNP adaylik sertifikasi — Express Entry profilinizdeki ad ve bilgilerle eslesmesi gerekir", "省提名证书（PNP）——须与Express Entry档案中的姓名和信息一致"],
      ["Written job offer (IMM 5802) — only required if claiming job-offer CRS points; must be LMIA-supported unless LMIA-exempt under R204/R205", "Yazili is teklifi (IMM 5802) — yalnizca is teklifi CRS puanlari talep ediliyorsa gereklidir; R204/R205 kapsaminda muaf degilse LMIA destekli olmalidir", "书面工作邀约（IMM 5802）——仅在申领工作邀约CRS分时须提供；除R204/R205豁免外须有LMIA支持"],
      ["Medical examination results (valid 12 months) — completed by IRCC-designated Panel Physician only", "Saglik muayenesi sonuclari (12 ay gecerli) — yalnizca IRCC tarafindan belirlenmis Panel Hekimi tarafindan yapilmalidir", "体检结果（有效期12个月）——须由IRCC指定的体检医生完成"],
      ["Biometric enrolment receipt (if biometrics previously collected and still valid)", "Biyometrik kayit makbuzu (daha once toplandi ve hala gecerliyse)", "生物特征采集凭证（如之前已采集且仍在有效期内）"],
    ]),
  });

  return categories;
}

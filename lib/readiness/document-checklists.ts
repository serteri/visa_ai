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
      ["Passport or travel document", "Pasaport veya seyahat belgesi", "护照或旅行证件"],
      ["Police certificates (applicant + family 18+, every country resided in 6+ months in last 10 years)", "Sabika kaydi (basvuru sahibi ve 18+ aile uyeleri, son 10 yilda 6+ ay yasanan her ulke icin)", "无犯罪记录证明（申请人及18岁以上家庭成员，过去10年内居住6个月以上的每个国家）"],
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
    category: t3(locale, "Education", "Egitim", "教育"),
    items: localizedItems(locale, [
      [
        "Educational Credential Assessment (ECA) for foreign education, valid within 5 years",
        "Yurt disi egitim icin Egitim Belgesi Degerlendirmesi (ECA), 5 yil gecerlilik suresi icinde",
        "境外教育的教育资格评估（ECA），有效期5年内",
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
        ["Evidence of skilled work experience (1 year continuous within last 10 years, NOC TEER 0-3)", "Vasifli is tecrubesi kaniti (son 10 yilda 1 yil surekli, NOC TEER 0-3)", "技术工作经验证明（过去10年内连续1年，NOC TEER 0-3）"],
        ["Proof of funds (unless applying under CEC or with a valid job offer)", "Fon kaniti (CEC kapsaminda veya gecerli is teklifiyle basvurmadiginiz takdirde)", "资金证明（除非以CEC身份申请或持有有效工作邀约）"],
      ]),
    });
  }

  categories.push({
    category: t3(locale, "If applicable", "Uygunsa", "如适用"),
    items: localizedItems(locale, [
      ["Provincial nomination certificate, if applying with a PNP nomination", "PNP adaylik sertifikasi, varsa", "省提名证书（如适用）"],
      ["Written job offer, if claiming job-offer-related requirements", "Yazili is teklifi, ilgili gereksinimler icin", "书面工作邀约（如适用）"],
    ]),
  });

  return categories;
}

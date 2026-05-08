import { t3 } from "@/src/lib/readiness/localization";
import type { DocumentCategory, Locale } from "./types";

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

  if (subclasses.includes("820_801")) {
    categories.push({
      category: t3(locale, "820/801 Partner Visa", "820/801 Partner Vizesi", "820/801 配偶签证"),
      items: localizedItems(locale, [
        ["Sponsor evidence", "Sponsor kaniti", "担保人证明"],
        ["Relationship history statement", "Iliski gecmisi beyani", "关系历史陈述"],
        ["Financial relationship evidence", "Mali iliski kaniti", "财务关系证明"],
        ["Household evidence", "Ortak yasam kaniti", "共同生活证明"],
        ["Social evidence and Form 888", "Sosyal kanit ve Form 888", "社会关系证明与 888 表格"],
        ["Commitment evidence", "Baglilik kaniti", "长期承诺证明"],
        ["Police certificates if required", "Gerekiyorsa sabika kaydi", "如要求，无犯罪记录证明"],
      ]),
    });
  }

  return categories;
}

import { Locale } from "./types";

export interface PartnerIntakeData {
  relationshipType?: string;
  cohabitationDuration?: string;
  sponsorStatus?: string;
  previousSponsorship?: string;
  applicationLocationPreference?: string;
  relationshipEvidence?: string[];
}

export interface PartnerSponsorshipAssessment {
  relationshipSignalStrength: "Low" | "Medium" | "High";
  sponsorEligibilitySignal: "Eligible" | "Conditional" | "Blocked";
  hardGateFlags: string[];
  evidenceGaps: string[];
  recommendedNextSteps: string[];
}

export function parsePartnerIntakeFromText(sponsorOrFamilyText: string | undefined): PartnerIntakeData {
  if (!sponsorOrFamilyText) return {};
  const data: PartnerIntakeData = {};
  const parts = sponsorOrFamilyText.split(" | ");
  for (const part of parts) {
    const splitIndex = part.indexOf(": ");
    if (splitIndex === -1) continue;
    const key = part.slice(0, splitIndex).trim();
    const val = part.slice(splitIndex + 2).trim();
    if (key === "Relation") data.relationshipType = val;
    if (key === "Duration") data.cohabitationDuration = val;
    if (key === "Sponsor") data.sponsorStatus = val;
    if (key === "Prev Sponsor") data.previousSponsorship = val;
    if (key === "Pref") data.applicationLocationPreference = val;
    if (key === "Evidence") {
      data.relationshipEvidence = val.split(", ").map(s => s.trim());
    }
  }
  return data;
}

export function buildPartnerSponsorshipAssessment(
  input: PartnerIntakeData,
  country: "AU" | "CA",
  locale: Locale
): PartnerSponsorshipAssessment {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  const relationshipEvidence = input.relationshipEvidence ?? [];
  const cohab = input.cohabitationDuration ?? "";
  const relType = input.relationshipType ?? "";
  const prevSpon = input.previousSponsorship ?? "";

  // 1. Relationship Signal Strength
  let relationshipSignalStrength: "Low" | "Medium" | "High" = "Low";
  const evidenceCount = relationshipEvidence.length;

  if (cohab === "more_than_2_years") {
    relationshipSignalStrength = "High";
  } else if (cohab === "12_to_24_months") {
    relationshipSignalStrength = evidenceCount >= 3 ? "High" : "Medium";
  } else if (cohab === "less_than_12_months") {
    relationshipSignalStrength = (relType === "married" && evidenceCount >= 2) ? "Medium" : "Low";
  }

  if (evidenceCount <= 1) {
    relationshipSignalStrength = "Low";
  }

  // 2. Sponsor Eligibility & Hard Gates
  let sponsorEligibilitySignal: "Eligible" | "Conditional" | "Blocked" = "Eligible";
  const hardGateFlags: string[] = [];

  if (prevSpon === "yes_within_5_years") {
    sponsorEligibilitySignal = "Conditional";
    if (country === "AU") {
      hardGateFlags.push(
        isTr
          ? "Son 5 yıl içindeki sponsorluk geçmişi, Sponsorluk Engeli (Sponsorship Bar) kurallarını tetikleyebilir. İstisnaları Home Affairs veya bir MARA danışmanıyla doğrulayın."
          : isZh
            ? "在过去 5 年内有过担保历史可能会触发担保限制（Sponsorship Bar）。请向内政部或 MARA 注册移民代理核实豁免资格。"
            : "Previous sponsorship within the last 5 years may trigger a sponsorship bar. You must verify if you meet the exemption criteria with Home Affairs or a MARA agent."
      );
    } else {
      hardGateFlags.push(
        isTr
          ? "Son 5 yıl içinde birine sponsor olmak (veya kendinizin eş olarak sponsorlukla gelmiş olması) sponsorluk yasaklarını tetikleyebilir. IRCC veya bir RCIC danışmanıyla doğrulayın."
          : isZh
            ? "在过去 5 年内担保过他人（或自身作为配偶通过被担保方式移民）可能会触发担保限制。请向 IRCC 或 RCIC 顾问核实豁免资格。"
            : "Sponsoring someone within the last 5 years (or being sponsored yourself as a spouse within the last 5 years) can trigger sponsorship bans. Verify exemptions with IRCC or an RCIC consultant."
      );
    }
  }

  // 3. Evidence Gaps
  const evidenceGaps: string[] = [];
  const allEvidenceTypes = [
    { key: "marriage_cert", en: "Marriage Certificate or registry evidence", tr: "Evlilik cüzdanı veya resmi kayıt belgesi", zh: "结婚证书或官方登记证明" },
    { key: "joint_bank", en: "Joint bank account / shared financial statements", tr: "Ortak banka hesabı veya paylaşılan finansal dökümler", zh: "联名银行账户或共享财务声明" },
    { key: "joint_lease", en: "Joint lease agreement or co-signed utility bills", tr: "Ortak kira sözleşmesi veya ortak faturalar", zh: "联名租房协议或共同账单" },
    { key: "photos_social", en: "Photographs & social narrative proof", tr: "Birlikte fotoğraflar ve sosyal çevre kanıtları", zh: "合影及社交关系证明" },
    { key: "joint_children", en: "Joint children details / birth certificates", tr: "Ortak çocuk bilgileri / doğum belgesi", zh: "共同子女信息/出生证明" },
  ];

  for (const item of allEvidenceTypes) {
    if (!relationshipEvidence.includes(item.key)) {
      evidenceGaps.push(isTr ? item.tr : isZh ? item.zh : item.en);
    }
  }

  // 4. Next Steps
  const recommendedNextSteps: string[] = [];
  if (country === "AU") {
    recommendedNextSteps.push(
      isTr
        ? "İlişkinizin gerçekliğini ve sürekliliğini kanıtlayacak ortak fatura, kira sözleşmesi ve finansal dökümleri toplamaya başlayın."
        : isZh
          ? "收集共同账单、联名租约和共同财务流水，以证明关系的真实性与持续性。"
          : "Start collecting joint utilities, leases, and financial statements to establish relationship genuineness and continuity."
    );
    recommendedNextSteps.push(
      isTr
        ? "Avustralya vatandaşı/PR olan arkadaşlarınızdan veya ailenizden ilişki beyanları (Form 888) hazırlamalarını rica edin."
        : isZh
          ? "联系澳大利亚公民或永久居民身份的亲友，准备关系声明书（Form 888）。"
          : "Liaise with Australian citizen/PR friends or family to prepare statutory declarations (Form 888)."
    );
    if (sponsorEligibilitySignal === "Conditional") {
      recommendedNextSteps.push(
        isTr
          ? "Sponsorluk engeli (Sponsorship Bar) istisna durumunuzu incelemek üzere bir MARA danışmanı ile görüşün."
          : isZh
            ? "咨询 MARA 注册移民代理，审查您的担保限制豁免适用性。"
            : "Consult a MARA registered agent to review your sponsorship bar exemption eligibility."
      );
    }
  } else {
    recommendedNextSteps.push(
      isTr
        ? "Kanada Spousal Sponsorship başvurusu için ortak kira sözleşmesi, ortak faturalar ve resmi ikamet kanıtları hazırlayın."
        : isZh
          ? "为加拿大配偶担保申请准备联名租房合同、共同账单和共同居住地址证明。"
          : "Prepare joint lease agreements, utility bills, and official co-residency proofs for the Canada Spousal Sponsorship application."
    );
    recommendedNextSteps.push(
      isTr
        ? "Kanada içi (Inland) ve Kanada dışı (Outland) başvuru rotalarının bekleme süreleri ve çalışma izni (OWP) avantajlarını karşılaştırın."
        : isZh
          ? "对比境内递交（Inland）和境外递交（Outland）的审理周期及开放式工作许可（OWP）申请优势。"
          : "Compare wait times and Open Work Permit (OWP) benefits of Inland vs. Outland application streams."
    );
    if (sponsorEligibilitySignal === "Conditional") {
      recommendedNextSteps.push(
        isTr
          ? "Sponsorluk uygunluk kısıtlamalarını incelemek üzere yetkili bir RCIC danışmanından destek alın."
          : isZh
            ? "联系执业 RCIC 顾问咨询担保资格限制的具体豁免可能。"
            : "Connect with a licensed RCIC consultant to evaluate options regarding sponsorship eligibility constraints."
      );
    }
  }

  return {
    relationshipSignalStrength,
    sponsorEligibilitySignal,
    hardGateFlags,
    evidenceGaps,
    recommendedNextSteps,
  };
}

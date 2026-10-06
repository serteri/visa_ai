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
  sponsorEligibilitySignal: "Eligible" | "Conditional" | "Blocked";
  hardGateFlags: string[];
  evidenceGaps: string[];
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
  const prevSpon = input.previousSponsorship ?? "";

  // 2. Sponsor Eligibility & Hard Gates
  let sponsorEligibilitySignal: "Eligible" | "Conditional" | "Blocked" = "Eligible";
  const hardGateFlags: string[] = [];

  if (prevSpon === "yes_within_5_years") {
    sponsorEligibilitySignal = "Conditional";
    if (country === "AU") {
      hardGateFlags.push(
        isTr
          ? "Son 5 yıl içindeki sponsorluk geçmişi, Sponsorluk Engeli (Sponsorship Bar) kurallarını tetikleyebilir. İstisnaların uygulanıp uygulanmadığı Home Affairs veya kayıtlı bir göçmenlik danışmanının değerlendirmesine bağlıdır."
          : isZh
            ? "在过去 5 年内有过担保历史可能会触发担保限制（Sponsorship Bar）。是否适用豁免由内政部或注册移民代理判断。"
            : "Previous sponsorship within the last 5 years may trigger a sponsorship bar. Exemptions exist; whether one applies is a matter for the Department of Home Affairs or a registered migration agent."
      );
    } else {
      hardGateFlags.push(
        isTr
          ? "Son 5 yıl içinde birine sponsor olmak (veya kendinizin eş olarak sponsorlukla gelmiş olması) sponsorluk yasaklarını tetikleyebilir. Muafiyetlerin uygulanıp uygulanmadığı IRCC veya lisanslı bir danışmanın değerlendirmesine bağlıdır."
          : isZh
            ? "在过去 5 年内担保过他人（或自身作为配偶通过被担保方式移民）可能会触发担保限制。是否适用豁免由 IRCC 或持牌顾问判断。"
            : "Sponsoring someone within the last 5 years (or being sponsored yourself as a spouse within the last 5 years) can trigger sponsorship bans. Whether an exemption applies is a matter for IRCC or a licensed consultant."
      );
    }
  }

  // 3. Evidence types not entered (informational only; no assessment of the relationship)
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

  return {
    sponsorEligibilitySignal,
    hardGateFlags,
    evidenceGaps,
  };
}

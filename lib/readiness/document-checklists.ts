import type { DocumentCategory, Locale } from "./types";

export function getDocumentChecklist(
  subclasses: string[],
  locale: Locale
): DocumentCategory[] {
  const isTr = locale === "tr";
  if (subclasses.length === 0) return [];

  const categories: DocumentCategory[] = [];

  categories.push({
    category: isTr ? "Kimlik ve pasaport" : "Identity and passport",
    items: isTr
      ? ["Pasaport (geçerli ve süresi dolmamış)", "Kimlik belgeleri"]
      : ["Passport (valid, not expired)", "Identity documents"],
  });

  if (subclasses.includes("500")) {
    categories.push({
      category: isTr ? "500 Öğrenci Vizesi" : "500 Student Visa",
      items: isTr
        ? [
            "Kayıt Onayı (CoE)",
            "Yurt dışı öğrenci sağlık sigortası (OSHC)",
            "Gerekiyorsa İngilizce kanıtı",
            "Mali yeterliliğe ilişkin kanıt",
            "18 yaşından küçükse bakım düzenlemesi kanıtı",
          ]
        : [
            "Confirmation of Enrolment (CoE)",
            "Overseas Student Health Cover (OSHC)",
            "English evidence if required",
            "Financial evidence",
            "Welfare arrangement if under 18",
          ],
    });
  }

  if (subclasses.includes("485")) {
    categories.push({
      category: isTr ? "485 Geçici Mezun Vizesi" : "485 Temporary Graduate Visa",
      items: isTr
        ? [
            "CRICOS kayıtlı kurumdan tamamlanan nitelik belgesi ve transkript",
            "Son 6 ayda öğrenci vizesi (500) tutulduğuna dair kanıt",
            "İngilizce dil testi sonuçları (minimum eşikler uygulanır)",
            "Sağlık sigortası (Yurt dışı Öğrenci Sağlık Sigortası veya eşdeğeri)",
            "Avustralya polis taraması sertifikası",
            "Gerekiyorsa yurt dışı polis sertifikaları",
            "Gerekiyorsa sağlık muayenesi sonuçları",
          ]
        : [
            "Qualification certificate and transcript from CRICOS-registered institution",
            "Evidence of having held a Student visa (subclass 500) in the last 6 months",
            "English language test results (minimum thresholds apply)",
            "Health insurance (Overseas Student Health Cover or equivalent)",
            "Australian police clearance certificate",
            "Overseas police certificates if required",
            "Health examination results if requested",
          ],
    });
  }

  if (subclasses.includes("482")) {
    categories.push({
      category: isTr ? "482 Skills in Demand Vizesi" : "482 Skills in Demand Visa",
      items: isTr
        ? [
            "İşveren aday gösterimi veya TRN referansı",
            "Beceri ve nitelik kanıtı",
            "İstihdam referansları ve iş deneyimi kanıtı",
            "İngilizce kanıtı (IELTS veya eşdeğeri)",
            "Sağlık sigortası",
            "Gerekiyorsa sabıka kaydı",
          ]
        : [
            "Employer nomination or TRN reference",
            "Skills and qualification evidence",
            "Employment references and work experience evidence",
            "English evidence (IELTS or equivalent)",
            "Health insurance",
            "Police certificates if required",
          ],
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
        isTr
          ? "190 için eyalet/bölge adaylık kanıtı"
          : "State/territory nomination evidence for 190"
      );
    }
    if (subclasses.includes("491")) {
      extraItems.push(
        isTr
          ? "491 için adaylık veya akraba sponsorluk kanıtı"
          : "Nomination or relative sponsorship evidence for 491"
      );
    }
    categories.push({
      category: isTr
        ? `${visaLabel} Yetenekli Göç Vizesi`
        : `${visaLabel} Skilled Migration Visa`,
      items: [
        ...(isTr
          ? [
              "Beceri değerlendirmesi (ilgili değerlendirme kurumundan)",
              "İngilizce kanıtı (IELTS, PTE veya eşdeğeri)",
              "İfade formu (EOI) / SkillSelect bilgileri",
              "Puan iddiasına ilişkin belgeler (yaş, istihdam, eğitim, bonus vb.)",
              "İstihdam kanıtı ve referanslar",
              "Nitelik sertifikaları ve transkriptler",
              "Gerekiyorsa sabıka kaydı",
            ]
          : [
              "Skills assessment from relevant assessing authority",
              "English evidence (IELTS, PTE or equivalent)",
              "Expression of Interest (EOI) / SkillSelect details",
              "Points claim evidence (age, employment, education, bonus etc.)",
              "Employment evidence and references",
              "Qualification certificates and transcripts",
              "Police certificates if required",
            ]),
        ...extraItems,
      ],
    });
  }

  if (subclasses.includes("820_801")) {
    categories.push({
      category: isTr ? "820/801 Partner Vizesi" : "820/801 Partner Visa",
      items: isTr
        ? [
            "Sponsor kanıtı (Avustralya vatandaşı, daimi oturum veya NZ vatandaşı)",
            "İlişki geçmişi beyanı",
            "Mali ilişki kanıtı (ortak hesap, kira sözleşmesi vb.)",
            "Ortak yaşam kanıtı (faturalar, yazışmalar vb.)",
            "Sosyal kanıt ve Form 888 (ortak tanıkların beyanları)",
            "Bağlılık kanıtı (seyahat, iletişim kayıtları vb.)",
            "Gerekiyorsa sabıka kaydı",
          ]
        : [
            "Sponsor evidence (Australian citizen, permanent resident or NZ citizen)",
            "Relationship history statement",
            "Financial relationship evidence (joint accounts, rental agreement etc.)",
            "Household evidence (shared bills, correspondence etc.)",
            "Social evidence and Form 888 (statutory declarations from mutual witnesses)",
            "Commitment evidence (travel records, communication history etc.)",
            "Police certificates if required",
          ],
    });
  }

  return categories;
}

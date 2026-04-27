"use server";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { fullCheckWaitlist } from "@/db/schema";

export type FullCheckWaitlistState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
  report?: {
    possiblePathways: string[];
    riskIndicators: string[];
    documentChecklist: string[];
    nextSteps: string[];
  };
};

async function ensureFullCheckWaitlistTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS full_check_waitlist (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      full_name TEXT,
      visa_interest TEXT,
      preferred_language TEXT,
      current_country TEXT,
      main_goal TEXT,
      source TEXT DEFAULT 'full_check',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    ALTER TABLE full_check_waitlist
    ADD COLUMN IF NOT EXISTS full_name TEXT
  `);

  await db.execute(sql`
    ALTER TABLE full_check_waitlist
    ADD COLUMN IF NOT EXISTS visa_interest TEXT
  `);

  await db.execute(sql`
    ALTER TABLE full_check_waitlist
    ADD COLUMN IF NOT EXISTS preferred_language TEXT
  `);

  await db.execute(sql`
    ALTER TABLE full_check_waitlist
    ADD COLUMN IF NOT EXISTS current_country TEXT
  `);

  await db.execute(sql`
    ALTER TABLE full_check_waitlist
    ADD COLUMN IF NOT EXISTS main_goal TEXT
  `);

  await db.execute(sql`
    ALTER TABLE full_check_waitlist
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'full_check'
  `);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildBasicReport(input: {
  visaInterest: string;
  currentCountry: string;
  mainGoal: string;
  preferredLanguage: string;
}) {
  const isTr = input.preferredLanguage === "tr";
  const combined = `${input.visaInterest} ${input.mainGoal}`.toLowerCase();
  const possiblePathways: string[] = [];

  if (combined.includes("partner") || combined.includes("spouse") || combined.includes("eş")) {
    possiblePathways.push(
      isTr
        ? "820/801 Partner onshore yolu incelemeye değer olabilir."
        : "820/801 Partner onshore pathway may be relevant to review."
    );
  }

  if (
    combined.includes("student") ||
    combined.includes("study") ||
    combined.includes("course") ||
    combined.includes("öğrenci") ||
    combined.includes("eğitim")
  ) {
    possiblePathways.push(
      isTr
        ? "500 Öğrenci vizesi yolu incelemeye değer olabilir."
        : "500 Student visa pathway may be relevant to review."
    );
  }

  if (
    combined.includes("skilled") ||
    combined.includes("points") ||
    combined.includes("occupation") ||
    combined.includes("pr") ||
    combined.includes("nitelikli") ||
    combined.includes("puan")
  ) {
    possiblePathways.push(
      isTr
        ? "189, 190 veya 491 yetenekli yollar incelemeye değer olabilir."
        : "189, 190 or 491 skilled pathways may be relevant to review."
    );
  }

  if (
    combined.includes("work") ||
    combined.includes("employer") ||
    combined.includes("sponsor") ||
    combined.includes("isveren") ||
    combined.includes("çalış")
  ) {
    possiblePathways.push(
      isTr
        ? "482 Skills in Demand yolu incelemeye değer olabilir."
        : "482 Skills in Demand pathway may be relevant to review."
    );
  }

  if (possiblePathways.length === 0) {
    possiblePathways.push(
      isTr
        ? "500, 482, 189, 190, 491 ve 820/801 yolları karşılaştırılmaya değer başlangıç noktaları olabilir."
        : "500, 482, 189, 190, 491 and 820/801 pathways may be useful starting points to compare."
    );
  }

  return {
    possiblePathways,
    riskIndicators: isTr
      ? [
          input.currentCountry
            ? `Bulunduğunuz ülke ${input.currentCountry} olarak kaydedildi; konum mevcut adımları etkileyebilir.`
            : "Bulunduğunuz ülke belirtilmedi, bu nedenle konuma dayalı riskler daha fazla inceleme gerektirir.",
          input.visaInterest
            ? "Seçilen vize ilgi alanı genellikle mevcut yol gereksinimleriyle değerlendirilir."
            : "Vize ilgi alanı seçilmedi, bu nedenle rapor yalnızca genel yol sinyallerini kullanıyor.",
          "Zamanlama, belgeler ve kişisel durumlar sonraki adımları etkileyebilir.",
        ]
      : [
          input.currentCountry
            ? `Current country is recorded as ${input.currentCountry}; location can affect which steps may be available.`
            : "Current location was not provided, so location-based risks need further review.",
          input.visaInterest
            ? "The selected visa interest is often considered against current pathway requirements."
            : "No visa interest was selected, so the report is using broad pathway signals only.",
          "Timing, documents and personal circumstances may affect next steps.",
        ],
    documentChecklist: isTr
      ? [
          "Pasaport ve kimlik belgeleri",
          "Eğitim, iş, partner veya yetenekli geçmişe ilişkin kanıtlar",
          "Gerekiyorsa İngilizce testi, beceri değerlendirmesi, sponsor veya ilişki kanıtı",
          "Avustralya'daysa mevcut vize bilgileri ve seyahat geçmişi",
        ]
      : [
          "Passport and identity documents",
          "Evidence related to study, work, partner or skilled background",
          "English test, skills assessment, sponsor or relationship evidence if relevant",
          "Current visa details and travel history if the person is in Australia",
        ],
    nextSteps: isTr
      ? [
          "Olası yollar genellikle daha derin hazırlıktan önce karşılaştırılır.",
          "Listelenen belge kategorileri genellikle yol incelemesi için gereklidir.",
          "Daha sonraki ayrıntılı inceleme için yapılandırılmış bir hazırlık planı ilgili olabilir.",
          "Kişiselleştirilmiş tavsiye kayıtlı bir göç danışmanı tarafından verilir.",
        ]
      : [
          "Possible pathways are often compared before deeper preparation.",
          "Listed document categories are commonly required for pathway review.",
          "A structured preparation plan may be relevant for a later detailed review.",
          "Personalised advice is handled by a registered migration agent.",
        ],
  };
}

export async function submitFullCheckWaitlist(
  _prevState: FullCheckWaitlistState,
  formData: FormData
): Promise<FullCheckWaitlistState> {
  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const visaInterest = String(formData.get("visaInterest") ?? "").trim();
  const preferredLanguage = String(formData.get("preferredLanguage") ?? "").trim();
  const currentCountry = String(formData.get("currentCountry") ?? "").trim();
  const mainGoal = String(formData.get("mainGoal") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim() || "full_check";

  const isTr = preferredLanguage === "tr";
  const errors: Record<string, string> = {};

  if (!email) errors.email = isTr ? "E-posta adresi gereklidir." : "Email is required.";
  if (email && !isValidEmail(email)) errors.email = isTr ? "Geçerli bir e-posta adresi girin." : "Enter a valid email address.";

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      errors,
      message: isTr ? "Lütfen geçerli bir e-posta adresi girin." : "Please enter a valid email address.",
    };
  }

  await ensureFullCheckWaitlistTable();

  await db.insert(fullCheckWaitlist).values({
    email,
    full_name: fullName || null,
    visa_interest: visaInterest || null,
    preferred_language: preferredLanguage || null,
    current_country: currentCountry || null,
    main_goal: mainGoal || null,
    source,
  });

  return {
    status: "success",
    message: isTr
      ? "Temel raporunuz oluşturuldu."
      : "Your basic report has been generated.",
    report: buildBasicReport({
      visaInterest,
      currentCountry,
      mainGoal,
      preferredLanguage,
    }),
  };
}

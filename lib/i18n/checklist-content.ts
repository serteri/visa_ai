export type ChecklistLocale = "en" | "tr" | "zh-Hans";
export type VisaSubclass = "189" | "190" | "491" | "482" | "485";

export type ChecklistDoc = {
  id: string;
  category: string;
  name: string;
  description: string;
  required: boolean;
  expiryTracking: boolean;
  expiryMonths?: number;
  warningMonths?: number;
  tips: string;
  apostilleRequired: boolean;
  naatiRequired: boolean;
};

export type ChecklistLocalePack = {
  pageTitle: string;
  pageSubtitle: string;
  viewChecklist: string;
  autoSaveNotice: string;
  backButton: string;
  printButton: string;
  loginNotice: string;
  loginButton: string;
  expiryTitle: string;
  differentVisa: string;
  printedTitle: string;
  savedSuffix: string;
  visaTitle: Record<VisaSubclass, { title: string; description: string }>;
  categories: Record<string, string>;
  docs: Record<VisaSubclass, ChecklistDoc[]>;
};

export type DocumentChecklist2026Dictionary = {
  pageTitle: string;
  pageSubtitle: string;
  viewChecklist?: string;
  autoSaveNotice?: string;
  visas: Record<VisaSubclass, { title: string; description: string }>;
};

const commonEnglish = {
  pageTitle: "Australian Visa Document Checklist 2026",
  pageSubtitle: "Choose the visa subclass you want to track documents for.",
  viewChecklist: "View checklist ->",
  autoSaveNotice: "Your progress is automatically saved in your browser.",
  backButton: "Back to Visas",
  printButton: "Print",
  loginNotice: "Your progress is being saved locally in your browser. Sign in to save it permanently.",
  loginButton: "Sign in",
  expiryTitle: "Expiry Warnings",
  differentVisa: "Choose a different visa",
  printedTitle: "Document checklist",
  savedSuffix: "ready",
};

const commonTurkish = {
  pageTitle: "Avustralya Vize Belge Kontrol Listesi 2026",
  pageSubtitle: "Belgeleri takip etmek istediğiniz vize alt sınıfını seçin.",
  viewChecklist: "Kontrol listesini görüntüle ->",
  autoSaveNotice: "İlerlemeniz otomatik olarak tarayıcıda kaydedilir.",
  backButton: "Vizelere Dön",
  printButton: "Yazdır",
  loginNotice: "İlerlemeniz tarayıcıda yerel olarak kaydediliyor. Kalıcı kayıt için giriş yapın.",
  loginButton: "Giriş Yap",
  expiryTitle: "Süre Uyarıları",
  differentVisa: "Farklı vize seç",
  printedTitle: "Belge kontrol listesi",
  savedSuffix: "hazır",
};

const commonChinese = {
  pageTitle: "澳大利亚签证材料清单 2026",
  pageSubtitle: "请选择要跟踪材料的签证类别。",
  viewChecklist: "查看清单 ->",
  autoSaveNotice: "你的进度会自动保存在浏览器中。",
  backButton: "返回签证列表",
  printButton: "打印",
  loginNotice: "你的进度正在保存在本地浏览器中。登录后可永久保存。",
  loginButton: "登录",
  expiryTitle: "到期提醒",
  differentVisa: "选择其他签证",
  printedTitle: "材料清单",
  savedSuffix: "已就绪",
};

function buildPack(
  locale: ChecklistLocale,
  overrides: Pick<ChecklistLocalePack, "visaTitle" | "categories" | "docs">,
  common = commonEnglish,
): ChecklistLocalePack {
  const base =
    locale === "tr" ? commonTurkish : locale === "zh-Hans" ? commonChinese : commonEnglish;
  return {
    ...base,
    ...overrides,
  };
}

const visaBase = {
  en: {
    visaTitle: {
      "189": { title: "Subclass 189", description: "Skilled Independent" },
      "190": { title: "Subclass 190", description: "Skilled Nominated" },
      "491": { title: "Subclass 491", description: "Skilled Work Regional" },
      "482": { title: "Subclass 482", description: "Skills in Demand" },
      "485": { title: "Subclass 485", description: "Temporary Graduate" },
    },
    categories: {
      Identity: "Identity & Personal Documents",
      Skills: "Skills & Employment",
      English: "English Language Capability",
      Health: "Health & Character",
      Education: "Education",
      Nomination: "State Nomination",
      Employer: "Employer Documents",
      Finance: "Financial Evidence",
      Registration: "Registration & Study Documents",
    },
  },
  tr: {
    visaTitle: {
      "189": { title: "Subclass 189", description: "Bağımsız Yetenekli" },
      "190": { title: "Subclass 190", description: "Eyalet Adaylı" },
      "491": { title: "Subclass 491", description: "Bölgesel Çalışma" },
      "482": { title: "Subclass 482", description: "Talep Üzerine Beceri" },
      "485": { title: "Subclass 485", description: "Geçici Mezun" },
    },
    categories: {
      Identity: "Kimlik ve Kişisel Belgeler",
      Skills: "Beceri ve İş Deneyimi",
      English: "İngilizce Yeterlilik",
      Health: "Sağlık ve Karakter",
      Education: "Eğitim",
      Nomination: "Eyalet Adaylığı",
      Employer: "İşveren Belgeleri",
      Finance: "Mali Kanıtlar",
      Registration: "Kayıt ve Eğitim Belgeleri",
    },
  },
  "zh-Hans": {
    visaTitle: {
      "189": { title: "189 子类", description: "独立技术移民" },
      "190": { title: "190 子类", description: "州担保技术移民" },
      "491": { title: "491 子类", description: "偏远地区技术工作" },
      "482": { title: "482 子类", description: "技能需求签证" },
      "485": { title: "485 子类", description: "临时毕业生" },
    },
    categories: {
      Identity: "身份与个人文件",
      Skills: "技能与工作经历",
      English: "英语能力",
      Health: "健康与品格",
      Education: "学历教育",
      Nomination: "州提名",
      Employer: "雇主文件",
      Finance: "资金与收入证明",
      Registration: "注册与学习文件",
    },
  },
} as const;

const docs = {
  en: {
    "189": [
      { id: "passport", category: "Identity", name: "Valid passport", description: "Biometric page and any visa pages", required: true, expiryTracking: true, expiryMonths: 120, warningMonths: 6, tips: "Keep a clean scanned copy of the bio page and all stamped pages.", apostilleRequired: false, naatiRequired: false },
      { id: "birth_certificate", category: "Identity", name: "Birth certificate", description: "Certified copy of your birth record", required: true, expiryTracking: false, tips: "Use the version that matches your passport and civil records.", apostilleRequired: true, naatiRequired: true },
      { id: "english_test", category: "English", name: "English test result", description: "IELTS, PTE, TOEFL or OET result report", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "Use the result you can prove at invitation and lodgement time.", apostilleRequired: false, naatiRequired: false },
      { id: "skills_assessment", category: "Skills", name: "Positive skills assessment", description: "Outcome letter from the correct assessing authority", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "The assessment must match your nominated ANZSCO occupation.", apostilleRequired: false, naatiRequired: false },
      { id: "employment_ref", category: "Skills", name: "Employer references", description: "Duty, date and hours evidence from past employers", required: true, expiryTracking: false, tips: "References should match the duties used in your points claim.", apostilleRequired: false, naatiRequired: false },
      { id: "cv", category: "Skills", name: "CV / resume", description: "Current role history and skill summary", required: true, expiryTracking: false, tips: "Keep the chronology identical to your references.", apostilleRequired: false, naatiRequired: false },
      { id: "police_check", category: "Health", name: "Police clearances", description: "Country clearances for all required jurisdictions", required: true, expiryTracking: true, expiryMonths: 12, warningMonths: 3, tips: "Order these after invitation so they remain valid at lodgement.", apostilleRequired: false, naatiRequired: false },
    ],
    "190": [
      { id: "passport", category: "Identity", name: "Valid passport", description: "Biometric page and any visa pages", required: true, expiryTracking: true, expiryMonths: 120, warningMonths: 6, tips: "Keep a clean scanned copy of the bio page and all stamped pages.", apostilleRequired: false, naatiRequired: false },
      { id: "skills_assessment", category: "Skills", name: "Positive skills assessment", description: "Outcome letter from the correct assessing authority", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "The assessment must match your nominated ANZSCO occupation.", apostilleRequired: false, naatiRequired: false },
      { id: "employment_ref", category: "Skills", name: "Employer references", description: "Duty, date and hours evidence from past employers", required: true, expiryTracking: false, tips: "References should match the duties used in your points claim.", apostilleRequired: false, naatiRequired: false },
      { id: "state_nomination", category: "Nomination", name: "State nomination invitation", description: "Nomination approval from the relevant state or territory", required: true, expiryTracking: true, expiryMonths: 24, warningMonths: 3, tips: "Update your EOI after the nomination is approved.", apostilleRequired: false, naatiRequired: false },
      { id: "english_test", category: "English", name: "English test result", description: "IELTS, PTE, TOEFL or OET result report", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "Use the result you can prove at invitation and lodgement time.", apostilleRequired: false, naatiRequired: false },
      { id: "police_check", category: "Health", name: "Police clearances", description: "Country clearances for all required jurisdictions", required: true, expiryTracking: true, expiryMonths: 12, warningMonths: 3, tips: "Order these after invitation so they remain valid at lodgement.", apostilleRequired: false, naatiRequired: false },
      { id: "residence_proof", category: "Nomination", name: "State residency evidence", description: "Documents proving current residence or commitment to the state", required: false, expiryTracking: false, tips: "Some states want local address, lease or employment evidence.", apostilleRequired: false, naatiRequired: false },
    ],
    "491": [
      { id: "passport", category: "Identity", name: "Valid passport", description: "Biometric page and any visa pages", required: true, expiryTracking: true, expiryMonths: 120, warningMonths: 6, tips: "Keep a clean scanned copy of the bio page and all stamped pages.", apostilleRequired: false, naatiRequired: false },
      { id: "skills_assessment", category: "Skills", name: "Positive skills assessment", description: "Outcome letter from the correct assessing authority", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "The assessment must match your nominated ANZSCO occupation.", apostilleRequired: false, naatiRequired: false },
      { id: "employment_ref", category: "Skills", name: "Employer references", description: "Duty, date and hours evidence from past employers", required: true, expiryTracking: false, tips: "References should match the duties used in your points claim.", apostilleRequired: false, naatiRequired: false },
      { id: "regional_commitment", category: "Nomination", name: "Regional commitment evidence", description: "Evidence you can live and work in regional Australia", required: true, expiryTracking: false, tips: "Provide a genuine plan for the regional area you will live in.", apostilleRequired: false, naatiRequired: false },
      { id: "english_test", category: "English", name: "English test result", description: "IELTS, PTE, TOEFL or OET result report", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "Use the result you can prove at invitation and lodgement time.", apostilleRequired: false, naatiRequired: false },
      { id: "police_check", category: "Health", name: "Police clearances", description: "Country clearances for all required jurisdictions", required: true, expiryTracking: true, expiryMonths: 12, warningMonths: 3, tips: "Order these after invitation so they remain valid at lodgement.", apostilleRequired: false, naatiRequired: false },
      { id: "regional_address", category: "Nomination", name: "Regional address evidence", description: "Lease, utility bill or address plan for the regional area", required: false, expiryTracking: false, tips: "Useful for state nomination and settlement planning.", apostilleRequired: false, naatiRequired: false },
    ],
    "482": [
      { id: "passport", category: "Identity", name: "Valid passport", description: "Biometric page and any visa pages", required: true, expiryTracking: true, expiryMonths: 120, warningMonths: 6, tips: "Keep a clean scanned copy of the bio page and all stamped pages.", apostilleRequired: false, naatiRequired: false },
      { id: "employer_nomination", category: "Employer", name: "Employer nomination approval", description: "Approved nomination from the sponsoring employer", required: true, expiryTracking: false, tips: "The sponsor must hold an approved standard business sponsorship where required.", apostilleRequired: false, naatiRequired: false },
      { id: "employment_contract", category: "Employer", name: "Employment contract", description: "Signed contract with salary and duties", required: true, expiryTracking: false, tips: "Salary must meet the relevant threshold and the role must be genuine.", apostilleRequired: false, naatiRequired: false },
      { id: "skills_assessment_optional", category: "Skills", name: "Skills assessment if required", description: "Some occupations need a formal assessment", required: false, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "Check the occupation list before lodging.", apostilleRequired: false, naatiRequired: false },
      { id: "salary_evidence", category: "Finance", name: "Salary evidence", description: "Offer letter or payslips showing market salary", required: true, expiryTracking: false, tips: "Show that the package meets the current threshold.", apostilleRequired: false, naatiRequired: false },
      { id: "police_check", category: "Health", name: "Police clearances", description: "Country clearances for all required jurisdictions", required: true, expiryTracking: true, expiryMonths: 12, warningMonths: 3, tips: "Order these after invitation so they remain valid at lodgement.", apostilleRequired: false, naatiRequired: false },
    ],
    "485": [
      { id: "passport", category: "Identity", name: "Valid passport", description: "Biometric page and any visa pages", required: true, expiryTracking: true, expiryMonths: 120, warningMonths: 6, tips: "Keep a clean scanned copy of the bio page and all stamped pages.", apostilleRequired: false, naatiRequired: false },
      { id: "degree", category: "Education", name: "Australian degree or qualification", description: "Award letter and completion evidence", required: true, expiryTracking: false, tips: "Use the qualification linked to your recent studies.", apostilleRequired: false, naatiRequired: false },
      { id: "transcript", category: "Education", name: "Official transcript", description: "Mailed or sealed transcript from the provider", required: true, expiryTracking: false, tips: "Ensure the transcript shows completion and course dates.", apostilleRequired: false, naatiRequired: false },
      { id: "coe", category: "Registration", name: "Confirmation of Enrolment (CoE)", description: "Enrollment record for the completed course", required: true, expiryTracking: false, tips: "Keep your final CoE or completion confirmation if available.", apostilleRequired: false, naatiRequired: false },
      { id: "oshc", category: "Health", name: "Health insurance", description: "OSHC or relevant student cover for the stay", required: true, expiryTracking: true, expiryMonths: 24, warningMonths: 3, tips: "Coverage should span the full visa period.", apostilleRequired: false, naatiRequired: false },
      { id: "english_test", category: "English", name: "English test result", description: "IELTS, PTE, TOEFL or OET result report", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "Use the result you can prove at invitation and lodgement time.", apostilleRequired: false, naatiRequired: false },
      { id: "police_check", category: "Health", name: "Police clearances", description: "Country clearances for all required jurisdictions", required: true, expiryTracking: true, expiryMonths: 12, warningMonths: 3, tips: "Order these after invitation so they remain valid at lodgement.", apostilleRequired: false, naatiRequired: false },
    ],
  },
  tr: {
    "189": [
      { id: "passport", category: "Identity", name: "Geçerli pasaport", description: "Biyometrik sayfa ve vize sayfaları", required: true, expiryTracking: true, expiryMonths: 120, warningMonths: 6, tips: "Pasaport biyometrik sayfanızın ve damgalı sayfaların net kopyasını saklayın.", apostilleRequired: false, naatiRequired: false },
      { id: "birth_certificate", category: "Identity", name: "Doğum belgesi", description: "Doğum kaydınızın onaylı kopyası", required: true, expiryTracking: false, tips: "Pasaport ve medeni kayıtlarınızla uyumlu sürümü kullanın.", apostilleRequired: true, naatiRequired: true },
      { id: "english_test", category: "English", name: "İngilizce test sonucu", description: "IELTS, PTE, TOEFL veya OET sonuç raporu", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "Davet ve lodgement aşamasında kanıtlayabildiğiniz sonucu kullanın.", apostilleRequired: false, naatiRequired: false },
      { id: "skills_assessment", category: "Skills", name: "Olumlu beceri değerlendirmesi", description: "Doğru değerlendirme kurumundan sonuç mektubu", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "Değerlendirme, aday gösterdiğiniz ANZSCO mesleğiyle eşleşmelidir.", apostilleRequired: false, naatiRequired: false },
      { id: "employment_ref", category: "Skills", name: "İşveren referansları", description: "Önceki işverenlerden görev, tarih ve saat kanıtı", required: true, expiryTracking: false, tips: "Referanslar, puan iddianızdaki görevlerle uyumlu olmalı.", apostilleRequired: false, naatiRequired: false },
      { id: "cv", category: "Skills", name: "CV / özgeçmiş", description: "Güncel rol geçmişi ve beceri özeti", required: true, expiryTracking: false, tips: "Kronoloji referanslarınızla aynı olmalı.", apostilleRequired: false, naatiRequired: false },
      { id: "police_check", category: "Health", name: "Adli sicil kayıtları", description: "Gerekli tüm ülkelerden alınmış kayıtlar", required: true, expiryTracking: true, expiryMonths: 12, warningMonths: 3, tips: "Lodgement sırasında geçerli kalması için davetten sonra alın.", apostilleRequired: false, naatiRequired: false },
    ],
    "190": [
      { id: "passport", category: "Identity", name: "Geçerli pasaport", description: "Biyometrik sayfa ve vize sayfaları", required: true, expiryTracking: true, expiryMonths: 120, warningMonths: 6, tips: "Pasaport biyometrik sayfanızın ve damgalı sayfaların net kopyasını saklayın.", apostilleRequired: false, naatiRequired: false },
      { id: "skills_assessment", category: "Skills", name: "Olumlu beceri değerlendirmesi", description: "Doğru değerlendirme kurumundan sonuç mektubu", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "Değerlendirme, aday gösterdiğiniz ANZSCO mesleğiyle eşleşmelidir.", apostilleRequired: false, naatiRequired: false },
      { id: "employment_ref", category: "Skills", name: "İşveren referansları", description: "Önceki işverenlerden görev, tarih ve saat kanıtı", required: true, expiryTracking: false, tips: "Referanslar, puan iddianızdaki görevlerle uyumlu olmalı.", apostilleRequired: false, naatiRequired: false },
      { id: "state_nomination", category: "Nomination", name: "Eyalet adaylık onayı", description: "İlgili eyalet veya bölgeden gelen adaylık mektubu", required: true, expiryTracking: true, expiryMonths: 24, warningMonths: 3, tips: "Adaylık onaylandıktan sonra EOI'nizi güncelleyin.", apostilleRequired: false, naatiRequired: false },
      { id: "english_test", category: "English", name: "İngilizce test sonucu", description: "IELTS, PTE, TOEFL veya OET sonuç raporu", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "Davet ve lodgement aşamasında kanıtlayabildiğiniz sonucu kullanın.", apostilleRequired: false, naatiRequired: false },
      { id: "police_check", category: "Health", name: "Adli sicil kayıtları", description: "Gerekli tüm ülkelerden alınmış kayıtlar", required: true, expiryTracking: true, expiryMonths: 12, warningMonths: 3, tips: "Lodgement sırasında geçerli kalması için davetten sonra alın.", apostilleRequired: false, naatiRequired: false },
      { id: "residence_proof", category: "Nomination", name: "Eyalet ikamet kanıtı", description: "Mevcut ikamet, kira veya iş kanıtı", required: false, expiryTracking: false, tips: "Bazı eyaletler yerel adres veya iş kanıtı ister.", apostilleRequired: false, naatiRequired: false },
    ],
    "491": [
      { id: "passport", category: "Identity", name: "Geçerli pasaport", description: "Biyometrik sayfa ve vize sayfaları", required: true, expiryTracking: true, expiryMonths: 120, warningMonths: 6, tips: "Pasaport biyometrik sayfanızın ve damgalı sayfaların net kopyasını saklayın.", apostilleRequired: false, naatiRequired: false },
      { id: "skills_assessment", category: "Skills", name: "Olumlu beceri değerlendirmesi", description: "Doğru değerlendirme kurumundan sonuç mektubu", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "Değerlendirme, aday gösterdiğiniz ANZSCO mesleğiyle eşleşmelidir.", apostilleRequired: false, naatiRequired: false },
      { id: "employment_ref", category: "Skills", name: "İşveren referansları", description: "Önceki işverenlerden görev, tarih ve saat kanıtı", required: true, expiryTracking: false, tips: "Referanslar, puan iddianızdaki görevlerle uyumlu olmalı.", apostilleRequired: false, naatiRequired: false },
      { id: "regional_commitment", category: "Nomination", name: "Bölgesel yaşam taahhüdü", description: "Bölgesel Avustralya'da yaşayabileceğinizi gösteren kanıt", required: true, expiryTracking: false, tips: "Yaşayacağınız bölge için gerçekçi plan sunun.", apostilleRequired: false, naatiRequired: false },
      { id: "english_test", category: "English", name: "İngilizce test sonucu", description: "IELTS, PTE, TOEFL veya OET sonuç raporu", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "Davet ve lodgement aşamasında kanıtlayabildiğiniz sonucu kullanın.", apostilleRequired: false, naatiRequired: false },
      { id: "police_check", category: "Health", name: "Adli sicil kayıtları", description: "Gerekli tüm ülkelerden alınmış kayıtlar", required: true, expiryTracking: true, expiryMonths: 12, warningMonths: 3, tips: "Lodgement sırasında geçerli kalması için davetten sonra alın.", apostilleRequired: false, naatiRequired: false },
      { id: "regional_address", category: "Nomination", name: "Bölgesel adres kanıtı", description: "Bölgesel alan için kira, fatura veya adres planı", required: false, expiryTracking: false, tips: "Eyalet adaylığı ve yerleşim planlaması için faydalıdır.", apostilleRequired: false, naatiRequired: false },
    ],
    "482": [
      { id: "passport", category: "Identity", name: "Geçerli pasaport", description: "Biyometrik sayfa ve vize sayfaları", required: true, expiryTracking: true, expiryMonths: 120, warningMonths: 6, tips: "Pasaport biyometrik sayfanızın ve damgalı sayfaların net kopyasını saklayın.", apostilleRequired: false, naatiRequired: false },
      { id: "employer_nomination", category: "Employer", name: "İşveren adaylık onayı", description: "Sponsor işverenden onaylı nomination", required: true, expiryTracking: false, tips: "Sponsor gerekli durumlarda onaylı iş sponsorluğu sahibi olmalıdır.", apostilleRequired: false, naatiRequired: false },
      { id: "employment_contract", category: "Employer", name: "İş sözleşmesi", description: "Maaş ve görevleri içeren imzalı sözleşme", required: true, expiryTracking: false, tips: "Maaş ilgili eşiği karşılamalı ve rol gerçek olmalıdır.", apostilleRequired: false, naatiRequired: false },
      { id: "skills_assessment_optional", category: "Skills", name: "Gerekirse beceri değerlendirmesi", description: "Bazı meslekler için zorunlu olabilir", required: false, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "Lodgement öncesi meslek listesini kontrol edin.", apostilleRequired: false, naatiRequired: false },
      { id: "salary_evidence", category: "Finance", name: "Maaş kanıtı", description: "Piyasa maaşını gösteren teklif mektubu veya bordro", required: true, expiryTracking: false, tips: "Paketin güncel eşiği karşıladığını gösterin.", apostilleRequired: false, naatiRequired: false },
      { id: "police_check", category: "Health", name: "Adli sicil kayıtları", description: "Gerekli tüm ülkelerden alınmış kayıtlar", required: true, expiryTracking: true, expiryMonths: 12, warningMonths: 3, tips: "Lodgement sırasında geçerli kalması için davetten sonra alın.", apostilleRequired: false, naatiRequired: false },
    ],
    "485": [
      { id: "passport", category: "Identity", name: "Geçerli pasaport", description: "Biyometrik sayfa ve vize sayfaları", required: true, expiryTracking: true, expiryMonths: 120, warningMonths: 6, tips: "Pasaport biyometrik sayfanızın ve damgalı sayfaların net kopyasını saklayın.", apostilleRequired: false, naatiRequired: false },
      { id: "degree", category: "Education", name: "Avustralya diploması veya yeterliliği", description: "Ödül mektubu ve tamamlanma kanıtı", required: true, expiryTracking: false, tips: "Son eğitiminizle bağlantılı yeterliliği kullanın.", apostilleRequired: false, naatiRequired: false },
      { id: "transcript", category: "Education", name: "Resmi transkript", description: "Sağlayıcıdan mühürlü veya resmi transkript", required: true, expiryTracking: false, tips: "Transkript tamamlanma ve eğitim tarihlerini göstermeli.", apostilleRequired: false, naatiRequired: false },
      { id: "coe", category: "Registration", name: "Kayıt Onay Belgesi (CoE)", description: "Tamamlanan kurs için kayıt belgesi", required: true, expiryTracking: false, tips: "Son CoE veya tamamlanma onayını saklayın.", apostilleRequired: false, naatiRequired: false },
      { id: "oshc", category: "Health", name: "Sağlık sigortası", description: "OSHC veya uygun öğrenci kapsamı", required: true, expiryTracking: true, expiryMonths: 24, warningMonths: 3, tips: "Kapsam vize süresinin tamamını kapsamalıdır.", apostilleRequired: false, naatiRequired: false },
      { id: "english_test", category: "English", name: "İngilizce test sonucu", description: "IELTS, PTE, TOEFL veya OET sonuç raporu", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "Davet ve lodgement aşamasında kanıtlayabildiğiniz sonucu kullanın.", apostilleRequired: false, naatiRequired: false },
      { id: "police_check", category: "Health", name: "Adli sicil kayıtları", description: "Gerekli tüm ülkelerden alınmış kayıtlar", required: true, expiryTracking: true, expiryMonths: 12, warningMonths: 3, tips: "Lodgement sırasında geçerli kalması için davetten sonra alın.", apostilleRequired: false, naatiRequired: false },
    ],
  },
  "zh-Hans": {
    "189": [
      { id: "passport", category: "Identity", name: "有效护照", description: "个人信息页和所有签证页", required: true, expiryTracking: true, expiryMonths: 120, warningMonths: 6, tips: "保存护照信息页和盖章页的清晰扫描件。", apostilleRequired: false, naatiRequired: false },
      { id: "birth_certificate", category: "Identity", name: "出生证明", description: "经认证的出生记录副本", required: true, expiryTracking: false, tips: "使用与护照和民事记录一致的版本。", apostilleRequired: true, naatiRequired: true },
      { id: "english_test", category: "English", name: "英语考试成绩", description: "IELTS、PTE、TOEFL或OET成绩报告", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "使用你在邀请和递交时都能证明的成绩。", apostilleRequired: false, naatiRequired: false },
      { id: "skills_assessment", category: "Skills", name: "正面技能评估", description: "来自正确评估机构的结果信", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "评估必须与你提名的ANZSCO职业一致。", apostilleRequired: false, naatiRequired: false },
      { id: "employment_ref", category: "Skills", name: "雇主推荐信", description: "证明职责、日期和工作时长的文件", required: true, expiryTracking: false, tips: "推荐信应与积分声明中的职责相一致。", apostilleRequired: false, naatiRequired: false },
      { id: "cv", category: "Skills", name: "简历 / 履历", description: "当前工作经历和技能总结", required: true, expiryTracking: false, tips: "时间顺序应与你的推荐信一致。", apostilleRequired: false, naatiRequired: false },
      { id: "police_check", category: "Health", name: "无犯罪记录证明", description: "所有必需司法辖区的证明", required: true, expiryTracking: true, expiryMonths: 12, warningMonths: 3, tips: "最好在收到邀请后再办理，以确保递交时有效。", apostilleRequired: false, naatiRequired: false },
    ],
    "190": [
      { id: "passport", category: "Identity", name: "有效护照", description: "个人信息页和所有签证页", required: true, expiryTracking: true, expiryMonths: 120, warningMonths: 6, tips: "保存护照信息页和盖章页的清晰扫描件。", apostilleRequired: false, naatiRequired: false },
      { id: "skills_assessment", category: "Skills", name: "正面技能评估", description: "来自正确评估机构的结果信", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "评估必须与你提名的ANZSCO职业一致。", apostilleRequired: false, naatiRequired: false },
      { id: "employment_ref", category: "Skills", name: "雇主推荐信", description: "证明职责、日期和工作时长的文件", required: true, expiryTracking: false, tips: "推荐信应与积分声明中的职责相一致。", apostilleRequired: false, naatiRequired: false },
      { id: "state_nomination", category: "Nomination", name: "州提名批准", description: "来自相关州或领地的提名信", required: true, expiryTracking: true, expiryMonths: 24, warningMonths: 3, tips: "提名获批后要更新EOI。", apostilleRequired: false, naatiRequired: false },
      { id: "english_test", category: "English", name: "英语考试成绩", description: "IELTS、PTE、TOEFL或OET成绩报告", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "使用你在邀请和递交时都能证明的成绩。", apostilleRequired: false, naatiRequired: false },
      { id: "police_check", category: "Health", name: "无犯罪记录证明", description: "所有必需司法辖区的证明", required: true, expiryTracking: true, expiryMonths: 12, warningMonths: 3, tips: "最好在收到邀请后再办理，以确保递交时有效。", apostilleRequired: false, naatiRequired: false },
      { id: "residence_proof", category: "Nomination", name: "州居住证明", description: "当前住址、租约或工作证明", required: false, expiryTracking: false, tips: "有些州会要求本地地址或工作证明。", apostilleRequired: false, naatiRequired: false },
    ],
    "491": [
      { id: "passport", category: "Identity", name: "有效护照", description: "个人信息页和所有签证页", required: true, expiryTracking: true, expiryMonths: 120, warningMonths: 6, tips: "保存护照信息页和盖章页的清晰扫描件。", apostilleRequired: false, naatiRequired: false },
      { id: "skills_assessment", category: "Skills", name: "正面技能评估", description: "来自正确评估机构的结果信", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "评估必须与你提名的ANZSCO职业一致。", apostilleRequired: false, naatiRequired: false },
      { id: "employment_ref", category: "Skills", name: "雇主推荐信", description: "证明职责、日期和工作时长的文件", required: true, expiryTracking: false, tips: "推荐信应与积分声明中的职责相一致。", apostilleRequired: false, naatiRequired: false },
      { id: "regional_commitment", category: "Nomination", name: "区域居住承诺", description: "证明你可以在澳洲偏远地区生活和工作的材料", required: true, expiryTracking: false, tips: "为你打算居住的地区提供真实计划。", apostilleRequired: false, naatiRequired: false },
      { id: "english_test", category: "English", name: "英语考试成绩", description: "IELTS、PTE、TOEFL或OET成绩报告", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "使用你在邀请和递交时都能证明的成绩。", apostilleRequired: false, naatiRequired: false },
      { id: "police_check", category: "Health", name: "无犯罪记录证明", description: "所有必需司法辖区的证明", required: true, expiryTracking: true, expiryMonths: 12, warningMonths: 3, tips: "最好在收到邀请后再办理，以确保递交时有效。", apostilleRequired: false, naatiRequired: false },
      { id: "regional_address", category: "Nomination", name: "区域地址证明", description: "偏远地区的租约、水电单或地址计划", required: false, expiryTracking: false, tips: "对州提名和安置规划都很有帮助。", apostilleRequired: false, naatiRequired: false },
    ],
    "482": [
      { id: "passport", category: "Identity", name: "有效护照", description: "个人信息页和所有签证页", required: true, expiryTracking: true, expiryMonths: 120, warningMonths: 6, tips: "保存护照信息页和盖章页的清晰扫描件。", apostilleRequired: false, naatiRequired: false },
      { id: "employer_nomination", category: "Employer", name: "雇主提名批准", description: "担保雇主批准的提名文件", required: true, expiryTracking: false, tips: "如适用，担保人必须拥有有效的标准商业担保资格。", apostilleRequired: false, naatiRequired: false },
      { id: "employment_contract", category: "Employer", name: "雇佣合同", description: "包含工资和职责的签字合同", required: true, expiryTracking: false, tips: "工资必须达到相应门槛，职位也必须真实。", apostilleRequired: false, naatiRequired: false },
      { id: "skills_assessment_optional", category: "Skills", name: "如需要则提供技能评估", description: "某些职业需要正式评估", required: false, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "递交前先查看职业清单。", apostilleRequired: false, naatiRequired: false },
      { id: "salary_evidence", category: "Finance", name: "工资证明", description: "显示市场工资的 offer 或工资单", required: true, expiryTracking: false, tips: "证明套餐薪资达到最新门槛。", apostilleRequired: false, naatiRequired: false },
      { id: "police_check", category: "Health", name: "无犯罪记录证明", description: "所有必需司法辖区的证明", required: true, expiryTracking: true, expiryMonths: 12, warningMonths: 3, tips: "最好在收到邀请后再办理，以确保递交时有效。", apostilleRequired: false, naatiRequired: false },
    ],
    "485": [
      { id: "passport", category: "Identity", name: "有效护照", description: "个人信息页和所有签证页", required: true, expiryTracking: true, expiryMonths: 120, warningMonths: 6, tips: "保存护照信息页和盖章页的清晰扫描件。", apostilleRequired: false, naatiRequired: false },
      { id: "degree", category: "Education", name: "澳大利亚学位或资格", description: "奖项信和完成证明", required: true, expiryTracking: false, tips: "使用与你近期学习相关的资格。", apostilleRequired: false, naatiRequired: false },
      { id: "transcript", category: "Education", name: "正式成绩单", description: "学校盖章或官方成绩单", required: true, expiryTracking: false, tips: "成绩单应显示完成情况和课程日期。", apostilleRequired: false, naatiRequired: false },
      { id: "coe", category: "Registration", name: "入学确认书 (CoE)", description: "已完成课程的注册记录", required: true, expiryTracking: false, tips: "保留最终CoE或完成确认信。", apostilleRequired: false, naatiRequired: false },
      { id: "oshc", category: "Health", name: "健康保险", description: "OSHC 或相应的学生保险", required: true, expiryTracking: true, expiryMonths: 24, warningMonths: 3, tips: "保险应覆盖整个签证期限。", apostilleRequired: false, naatiRequired: false },
      { id: "english_test", category: "English", name: "英语考试成绩", description: "IELTS、PTE、TOEFL或OET成绩报告", required: true, expiryTracking: true, expiryMonths: 36, warningMonths: 6, tips: "使用你在邀请和递交时都能证明的成绩。", apostilleRequired: false, naatiRequired: false },
      { id: "police_check", category: "Health", name: "无犯罪记录证明", description: "所有必需司法辖区的证明", required: true, expiryTracking: true, expiryMonths: 12, warningMonths: 3, tips: "最好在收到邀请后再办理，以确保递交时有效。", apostilleRequired: false, naatiRequired: false },
    ],
  },
};

export function getChecklistContent(locale: ChecklistLocale): ChecklistLocalePack {
  const base = visaBase[locale] ?? visaBase.en;
  return buildPack(locale, {
    visaTitle: base.visaTitle,
    categories: base.categories,
    docs: docs[locale] ?? docs.en,
  });
}

import { DOCUMENT_INVENTORY, type DocInventorySubclass } from "@/lib/readiness/document-inventory";

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

const docs: Record<ChecklistLocale, Record<VisaSubclass, ChecklistLocalePack["docs"][VisaSubclass]>> = ((): Record<ChecklistLocale, Record<VisaSubclass, ChecklistLocalePack["docs"][VisaSubclass]>> => {
  const locales: ChecklistLocale[] = ["en", "tr", "zh-Hans"];
  const subclasses = Object.keys(DOCUMENT_INVENTORY) as DocInventorySubclass[];
  const result = {} as Record<ChecklistLocale, Record<VisaSubclass, ChecklistLocalePack["docs"][VisaSubclass]>>;

  for (const locale of locales) {
    result[locale] = {} as Record<VisaSubclass, ChecklistLocalePack["docs"][VisaSubclass]>;
    for (const subclass of subclasses) {
      result[locale][subclass] = DOCUMENT_INVENTORY[subclass].map((item) => ({
        id: item.id,
        category: item.category,
        name: item.name[locale],
        description: item.description[locale],
        required: item.required,
        expiryTracking: item.expiryTracking,
        expiryMonths: item.expiryMonths,
        warningMonths: item.warningMonths,
        tips: item.tips[locale],
        apostilleRequired: item.apostilleRequired,
        naatiRequired: item.naatiRequired,
      }));
    }
  }

  return result;
})();

export function getChecklistContent(locale: ChecklistLocale): ChecklistLocalePack {
  const base = visaBase[locale] ?? visaBase.en;
  return buildPack(locale, {
    visaTitle: base.visaTitle,
    categories: base.categories,
    docs: docs[locale] ?? docs.en,
  });
}

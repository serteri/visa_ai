/**
 * The lead magnets (free PDF downloads), their files, names and messages -- one registry, no "which file does this modal send" logic anywhere
 * else. Pure data and pure functions: safe to import from client components, the API route, the email builder and tests.
 *
 *   occupation-list  /australia-skilled-occupation-list-2026.pdf   modals: footer "Occupation list", home guides row, ANZSCO finder / classifier,
 *                                                                   full-check occupation dialog, /resources/occupation-list
 *   guide-global     /australia-guide-2026.pdf                      modals: home guides row, ANZSCO classifier
 *   guide-turkish    /avustralya-pr-rehberi-2026.pdf                modals: home guides row, the end-of-hope article (tr)
 */
export type Locale3 = "en" | "tr" | "zh-Hans";

export const PDF_SLUGS = {
  turkish: "avustralya-pr-rehberi-2026",
  global: "australia-guide-2026",
  occupation: "australia-skilled-occupation-list-2026",
} as const;

export type PdfProduct = keyof typeof PDF_SLUGS;

type L3 = { en: string; tr: string; zh: string };

export type LeadMagnet = {
  product: PdfProduct;
  slug: string;
  /** The CRM lead-source label the business classifies the lead under. */
  category: string;
  /** What the file is called to the reader. */
  name: L3;
  /** The modal's title and one-line description. */
  title: L3;
  description: L3;
  /** The banner above the form. */
  banner: L3;
};

export const LEAD_MAGNETS: Record<PdfProduct, LeadMagnet> = {
  occupation: {
    product: "occupation",
    slug: PDF_SLUGS.occupation,
    category: "2026 Skilled Occupation List",
    name: {
      en: "2026 Australian Skilled Occupation List (compiled from official sources)",
      tr: "2026 Avustralya Kalifiye Meslek Listesi (resmi kaynaklardan derlenmiştir)",
      zh: "2026 澳大利亚技术职业清单（根据官方来源整理）",
    },
    title: {
      en: "📋 2026 Australian Skilled Occupation List",
      tr: "📋 2026 Avustralya Kalifiye Meslek Listesi",
      zh: "📋 2026 澳大利亚技术职业清单",
    },
    description: {
      en: "Download the Australian Skilled Occupation List as a PDF, compiled by LogiVisa from official sources. It is not a government document: the source and date are inside the PDF.",
      tr: "Avustralya Kalifiye Meslek Listesi'ni, LogiVisa tarafından resmi kaynaklardan derlenmiş PDF olarak indirin. Resmi bir devlet belgesi değildir: kaynak ve tarih PDF'in içindedir.",
      zh: "下载由 LogiVisa 根据官方来源整理的澳大利亚技术职业清单 PDF。它不是政府文件：来源和日期见 PDF 内部。",
    },
    banner: {
      en: "✅ Occupations with skill levels and visa types, compiled from official sources (source and date inside the PDF).",
      tr: "✅ Beceri düzeyleri ve vize türleriyle meslekler, resmi kaynaklardan derlenmiştir (kaynak ve tarih PDF'in içindedir).",
      zh: "✅ 含技能等级和签证类型的职业清单，根据官方来源整理（来源和日期见 PDF 内部）。",
    },
  },
  global: {
    product: "global",
    slug: PDF_SLUGS.global,
    category: "Global Guide",
    name: { en: "Australia Migration Blueprint", tr: "Avustralya Göç Planı (Migration Blueprint)", zh: "澳大利亚移民蓝图" },
    title: { en: "🌏 The Ultimate Australia Migration Blueprint", tr: "🌏 The Ultimate Australia Migration Blueprint", zh: "🌏 终极澳大利亚移民蓝图" },
    description: {
      en: "Download the global English guide covering skilled migration and the Student Visa (Subclass 500) bridge, with 2026 cost-of-living data.",
      tr: "Skilled migration ve öğrenci vizesi (Subclass 500) yol haritasını, 2026 yaşam maliyeti verileriyle birlikte indirin.",
      zh: "下载涵盖技术移民和学生签证（500 类别）路径的全球英文指南，附 2026 年生活成本数据。",
    },
    banner: {
      en: "✅ Get the comprehensive, up-to-date 2026 guide right away.",
      tr: "✅ Kapsamlı ve güncel 2026 rehberini hemen edinin.",
      zh: "✅ 立即获取全面、最新的 2026 指南。",
    },
  },
  turkish: {
    product: "turkish",
    slug: PDF_SLUGS.turkish,
    category: "Turkish Guide",
    name: { en: "Australia PR Guide 2026 (Turkish)", tr: "Avustralya PR Rehberi 2026", zh: "澳大利亚 PR 指南 2026（土耳其语）" },
    title: { en: "📘 Australia PR Guide 2026", tr: "📘 Avustralya PR Rehberi 2026", zh: "📘 澳大利亚 PR 指南 2026" },
    description: {
      en: "Download the free Turkish PDF guide. A comprehensive permanent residency guide built on real data.",
      tr: "Ücretsiz Türkçe PDF rehberini indirin. Gerçek verilerle hazırlanmış kapsamlı kalıcı oturma izni kılavuzu.",
      zh: "下载免费的土耳其语 PDF 指南。基于真实数据整理的永久居留申请全流程指南。",
    },
    banner: {
      en: "✅ Get the comprehensive, up-to-date 2026 guide right away.",
      tr: "✅ Kapsamlı ve güncel 2026 rehberini hemen edinin.",
      zh: "✅ 立即获取全面、最新的 2026 指南。",
    },
  },
};

export function leadMagnetBySlug(slug: string | null | undefined): LeadMagnet {
  return Object.values(LEAD_MAGNETS).find((m) => m.slug === slug) ?? LEAD_MAGNETS.turkish;
}

/** Maps the friendly ids used in <LeadMagnetForm documentId=...> to a lead magnet. */
export const DOCUMENT_IDS: Record<string, PdfProduct> = {
  "csol-2026": "occupation",
  "guide-global-2026": "global",
  "guide-turkish-2026": "turkish",
};

export const pick = (v: L3, locale: string): string => (locale === "tr" ? v.tr : locale === "zh-Hans" ? v.zh : v.en);

export const pdfPath = (slug: string) => `/${slug}.pdf`;

/** Every message of the form: validation, success, failure. en / tr / zh-Hans. */
export const FORM_TEXT = {
  legend: { en: "* Required field", tr: "* Zorunlu alan", zh: "* 必填项" } as L3,
  nameRequired: { en: "Full Name is required.", tr: "Ad Soyad zorunludur.", zh: "姓名为必填项。" } as L3,
  emailRequired: { en: "Email is required.", tr: "E-posta zorunludur.", zh: "邮箱为必填项。" } as L3,
  emailInvalid: { en: "Enter a valid email address.", tr: "Geçerli bir e-posta adresi girin.", zh: "请输入有效的邮箱地址。" } as L3,
  phoneInvalid: { en: "Enter a valid phone number or leave it empty.", tr: "Geçerli bir telefon numarası girin veya boş bırakın.", zh: "请输入有效的手机号，或留空。" } as L3,
  termsRequired: { en: "Please accept the legal terms to proceed.", tr: "Lütfen devam etmek için yasal koşulları onaylayın.", zh: "请接受法律条款以继续。" } as L3,
  generic: { en: "Something went wrong. Please try again.", tr: "Bir hata oluştu. Lütfen tekrar deneyin.", zh: "发生错误。请重试。" } as L3,
  connection: { en: "Connection error. Please try again.", tr: "Bağlantı hatası. Lütfen tekrar deneyin.", zh: "连接错误。请重试。" } as L3,
  alreadyDownloaded: {
    en: "This file was already requested from this IP. Only 1 request is allowed per IP.",
    tr: "Bu dosya bu IP adresinden daha önce istendi. Her IP'den yalnızca 1 istek yapılabilir.",
    zh: "该 IP 地址已请求过此文件。每个 IP 仅允许请求 1 次。",
  } as L3,
  checkInbox: { en: "Check your inbox and spam folder.", tr: "Gelen kutunuzu ve spam/gereksiz klasörünü kontrol edin.", zh: "请检查您的收件箱和垃圾邮件文件夹。" } as L3,
  notDelivered: {
    en: "We could not send the email right now. Your details were received. You can download the file here:",
    tr: "E-postayı şu anda gönderemedik. Bilgileriniz alındı. Dosyayı buradan indirebilirsiniz:",
    zh: "我们暂时无法发送邮件。您的信息已收到。您可以在此下载文件：",
  } as L3,
  suppressed: {
    en: "No email is sent to this address (internal or test address). You can download the file here:",
    tr: "Bu adrese e-posta gönderilmez (dahili veya test adresi). Dosyayı buradan indirebilirsiniz:",
    zh: "不会向此地址发送邮件（内部或测试地址）。您可以在此下载文件：",
  } as L3,
  download: { en: "Download the PDF", tr: "PDF'i indir", zh: "下载 PDF" } as L3,
  close: { en: "Close", tr: "Kapat", zh: "关闭" } as L3,
};

export function sentMessage(name: string, email: string, locale: string): string {
  return locale === "tr"
    ? `Başarılı! ${name}, ${email} adresine gönderildi.`
    : locale === "zh-Hans"
      ? `成功！${name} 已发送至 ${email}。`
      : `Done! ${name} has been sent to ${email}.`;
}

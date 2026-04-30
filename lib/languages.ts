export interface Language {
  code: string;
  label: string;
  localLabel: string;
  flag: string;
  enabled: boolean;
}

export const languages: Language[] = [
  { code: "en", label: "English", localLabel: "English", flag: "🇬🇧", enabled: true },
  { code: "tr", label: "Turkish", localLabel: "Türkçe", flag: "🇹🇷", enabled: true },
  { code: "zh-Hans", label: "Simplified Chinese", localLabel: "简体中文", flag: "🇨🇳", enabled: true },
  { code: "hi", label: "Hindi", localLabel: "हिन्दी", flag: "🇮🇳", enabled: false },
  { code: "pa", label: "Punjabi", localLabel: "ਪੰਜਾਬੀ", flag: "🇮🇳", enabled: false },
  { code: "zh", label: "Mandarin", localLabel: "中文", flag: "🇨🇳", enabled: false },
  { code: "ar", label: "Arabic", localLabel: "العربية", flag: "🇸🇦", enabled: false },
  { code: "es", label: "Spanish", localLabel: "Español", flag: "🇪🇸", enabled: false },
  { code: "vi", label: "Vietnamese", localLabel: "Tiếng Việt", flag: "🇻🇳", enabled: false },
  { code: "ne", label: "Nepali", localLabel: "नेपाली", flag: "🇳🇵", enabled: false },
];

export const getLanguage = (code: string): Language | undefined => {
  return languages.find((lang) => lang.code === code);
};

export const enabledLanguages = languages.filter((lang) => lang.enabled);
export const comingSoonLanguages = languages.filter((lang) => !lang.enabled);

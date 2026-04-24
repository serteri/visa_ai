export interface Language {
  code: string;
  label: string;
  localLabel: string;
  enabled: boolean;
}

export const languages: Language[] = [
  { code: "en", label: "English", localLabel: "English", enabled: true },
  { code: "tr", label: "Turkish", localLabel: "Türkçe", enabled: true },
  { code: "hi", label: "Hindi", localLabel: "हिन्दी", enabled: false },
  { code: "pa", label: "Punjabi", localLabel: "ਪੰਜਾਬੀ", enabled: false },
  { code: "zh", label: "Mandarin", localLabel: "中文", enabled: false },
  { code: "ar", label: "Arabic", localLabel: "العربية", enabled: false },
  { code: "es", label: "Spanish", localLabel: "Español", enabled: false },
  { code: "vi", label: "Vietnamese", localLabel: "Tiếng Việt", enabled: false },
  { code: "ne", label: "Nepali", localLabel: "नेपाली", enabled: false },
];

export const getLanguage = (code: string): Language | undefined => {
  return languages.find((lang) => lang.code === code);
};

export const enabledLanguages = languages.filter((lang) => lang.enabled);
export const comingSoonLanguages = languages.filter((lang) => !lang.enabled);

"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Locale } from "@/lib/i18n/config";

interface LanguageContextType {
  language: Locale;
  setLanguage: (code: Locale) => void;
  translations: Record<string, string>;
  isReady: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

async function loadTranslations(languageCode: Locale) {
  try {
    const response = await fetch(`/locales/${languageCode}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load translations for ${languageCode}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error loading translations:", error);
    return {};
  }
}

export function LanguageProvider({
  children,
  initialLocale = "en",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [language, setLanguageState] = useState<Locale>(initialLocale);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadTranslations(initialLocale).then((trans) => {
      setTranslations(trans);
      setIsReady(true);
    });
  }, [initialLocale]);

  const setLanguage = useCallback((code: Locale) => {
    setLanguageState(code);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations, isReady }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}

export function useTranslation() {
  const { translations } = useLanguage();

  const t = (key: string, defaultValue?: string): string => {
    return translations[key] || defaultValue || key;
  };

  return { t };
}

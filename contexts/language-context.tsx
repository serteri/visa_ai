"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const LANGUAGE_STORAGE_KEY = "visa-ai-language";

interface LanguageContextType {
  language: string;
  setLanguage: (code: string) => void;
  translations: Record<string, string>;
  isReady: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

async function loadTranslations(languageCode: string) {
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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>("en");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) || "en";
    setLanguageState(savedLanguage);

    loadTranslations(savedLanguage).then((trans) => {
      setTranslations(trans);
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isReady || language === (localStorage.getItem(LANGUAGE_STORAGE_KEY) || "en")) {
      return;
    }

    loadTranslations(language).then(setTranslations);
  }, [language, isReady]);

  const setLanguage = useCallback((code: string) => {
    setLanguageState(code);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    document.documentElement.lang = code;
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

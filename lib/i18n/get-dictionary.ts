import 'server-only'
import type { Locale } from './config'

// We intentionally do not use a caching mechanism like `next-intl`
// to ensure the latest translations are always fetched.

const dictionaries = {
  en: () => import('@/public/locales/en.json').then((module) => module.default),
  tr: () => import('@/public/locales/tr.json').then((module) => module.default),
  'zh-Hans': () => import('@/public/locales/zh-Hans.json').then((module) => module.default),
}



export interface GuidePageDictionary {
  title: string;
  subtitle: string;
  limitedCopiesBadge: string;
  whatsInsideTitle: string;
  bullet1: string;
  bullet2: string;
  bullet3: string;
  bullet4: string;
  remainingCopies: string;
  limitReachedMessage: string;
  form: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    submitButton: string;
  };
  spamDisclaimer: string;
  successMessage: string;
  downloadButton: string;
  exploreToolsCta: string;
  limitReachedError: string;
  genericError: string;
  email: {
    subject: string;
    greeting: string;
    body1: string;
    downloadButton: string;
    body2: string;
    body3: string;
  };
}

export interface Dictionary {
  "nav.home": string;
  "nav.checker": string;
  "nav.legal": string;
  guidePage: GuidePageDictionary;
  // ... other top-level properties as needed
  [key: string]: any; // Fallback for other properties
}

// ...existing code...

export const getDictionary = async (locale: Locale) => {
  const dictionary = await dictionaries[locale]?.() ?? dictionaries.en();
  return dictionary as Dictionary;
};


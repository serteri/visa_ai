/** The site guide: a small deterministic navigation layer (no model call, no persisted text). */
export type GuideLocale = "en" | "tr" | "zh-Hans";
export type L3 = { en: string; tr: string; "zh-Hans": string };
export type GuideCountry = "AU" | "CA";
export type DestinationCategory =
  | "occupation"
  | "visa"
  | "comparison"
  | "points"
  | "skills-assessment"
  | "state-nomination"
  | "guide"
  | "assessment"
  | "tool"
  | "australia"
  | "canada";

/** One page the guide may send a visitor to. `country` ANY is country-neutral (the Assessment, whose destination selector shows both). */
export type Destination = {
  id: string;
  path: string;
  country: GuideCountry | "ANY";
  category: DestinationCategory;
  title: L3;
  description: L3;
  /** Lower-case words and phrases (en, tr, zh) that route a typed question here. */
  keywords: string[];
  /** The page exists in English only (the research guides): it is linked without a locale prefix. */
  englishOnly?: boolean;
};

export type GuideLink = {
  id: string;
  href: string;
  title: string;
  description: string;
  category: DestinationCategory;
  country: GuideCountry | "ANY";
  englishOnly: boolean;
};

export type PageType = "home" | "occupation" | "visa" | "comparison" | "points" | "guide" | "tool" | "canada" | "other";

export type PageContext = {
  /** True on checkout, payment, private report / result, download, account and admin routes: no launcher, no nudge. */
  hidden: boolean;
  pageType: PageType;
  /** The destination the current page is about; null on a country-neutral page. */
  country: GuideCountry | null;
  /** Occupation code (six digits) on an occupation page. */
  occupationCode?: string;
  /** Visa subclass slug on a visa page. */
  visaSlug?: string;
};

export type GuideResponse = {
  kind: "routes" | "boundary" | "fallback" | "choose-country";
  message: string;
  links: GuideLink[];
  assessment: boolean;
  handoff: boolean;
  country: GuideCountry | null;
};

/**
 * The shape of a source-backed occupation research module (ANZSCO 149311, 225113, ...). A module resolves every string for one locale, so
 * the renderer (components/occupations/occupation-research.tsx) holds no occupation-specific text. Each statement paraphrases the
 * assessing authority's page, the ANZSCO description or the published lists; nothing says whether a person qualifies, which visa applies
 * or what will happen.
 */
export type ResearchBlock = { heading?: string; paragraphs?: string[]; bullets?: string[]; note?: string };
export type ResearchLink = { label: string; path: string; destination?: string };
export type ResearchSection = { id?: string; heading: string; blocks: ResearchBlock[]; links?: ResearchLink[] };
export type ResearchFaq = { q: string; a: string };

export type OccupationResearch = {
  code: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  /** Replaces the generic ANZSCO duties of the template page. */
  duties: string[];
  dutiesHeading: string;
  /** ISO day the authority page was read; the page itself may carry no review date. */
  checked: string;
  authority: { name: string; url: string };
  /** At-a-glance rows after the authority row (group, qualification level, skill level ...). */
  glance: Array<[string, string]>;
  about: { heading: string; paragraphs: string[] };
  suitable: { heading: string; intro: string; roles: readonly string[] };
  notConsidered: { heading: string; intro: string; roles: readonly string[] };
  assessment: { heading: string; blocks: ResearchBlock[]; finderLabel: string; officialLabel: string };
  /** Sections between the duties and the list placement (comparisons ...). */
  afterDuties: ResearchSection[];
  lists: {
    /** One sentence from the list names and the subclass text. */
    sentence: (listText: string, subclasses: string) => string;
    /** Subclasses to show when the template's derived mapping is not the verified one. */
    subclasses?: string[];
    sourceNote?: string;
  };
  visaSubclassPaths: string[];
  faqs: ResearchFaq[];
};

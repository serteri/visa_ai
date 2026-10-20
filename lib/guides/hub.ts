import type { Locale } from "@/lib/i18n/config";

/** Hub / homepage presentation of the six Wave 1 research guides (English only: the guides have no tr / zh-Hans version). scripts/test-research-guides.ts checks these slugs against lib/guides/slugs.ts. */
export type HubGuide = { slug: string; title: string; category: string; description: string };

export const HUB_GUIDES: HubGuide[] = [
  { slug: "chef-vs-cook-australia", title: "Chef vs Cook in Australia", category: "Occupations", description: "The published ANZSCO descriptions of Chef (351311) and Cook (351411) side by side, and why a job title alone does not settle the classification." },
  { slug: "tra-msa-vs-osap", title: "TRA MSA vs OSAP", category: "Skills Assessment", description: "What Trades Recognition Australia's Migration Skills Assessment and Offshore Skills Assessment Program are, and where the current rules are published." },
  { slug: "developer-programmer-vs-software-engineer", title: "Developer Programmer vs Software Engineer", category: "ICT", description: "ANZSCO 261312 and 261313 compared using the ABS entries and ACS's own wording." },
  { slug: "skills-assessment-vs-visa-eligibility", title: "Skills Assessment vs Visa Eligibility", category: "Visa Research", description: "Seven separate steps from skills assessment to visa grant, and who decides each one." },
  { slug: "engineers-australia-accredited-vs-cdr", title: "Engineers Australia: Accredited Qualification vs CDR", category: "Engineering", description: "How Engineers Australia separates the accredited qualification pathway from a Competency Demonstration Report, and where to verify accreditation." },
  { slug: "state-occupation-list-vs-nomination", title: "State Occupation List vs State Nomination", category: "State Nomination", description: "Why appearing on a state list is not a nomination, with a dated worked example from the ACT." },
];

/** The three featured on the homepage. */
export const HOME_GUIDE_SLUGS = ["chef-vs-cook-australia", "tra-msa-vs-osap", "skills-assessment-vs-visa-eligibility"];

export const guidesAvailableIn = (locale: Locale | string) => locale === "en";

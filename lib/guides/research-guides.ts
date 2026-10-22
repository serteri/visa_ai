/**
 * Sprint 2E, Wave 1: six English search-intent research guides, served at /guides/<slug>.
 *
 * Every migration-specific statement is taken from a primary source named in that guide's `sources` (ABS ANZSCO 2022 pages,
 * Engineers Australia, ACS, Trades Recognition Australia program guidelines as captured in this repository on 2026-10-11,
 * ACT Government pages captured 2026-10-13) and each guide carries the date the sources were last checked. The guides explain
 * what the published sources say; they never say which occupation, assessment or state applies to a reader.
 * Content map and SERP research: docs/acquisition-sprint-2e/content-map.md.
 */

export { RESEARCH_GUIDE_SLUGS } from "./slugs";

export const GUIDES_CHECKED_ON = "2026-10-20";

export type GuideSource = { label: string; url: string; note: string };
export type GuideLink = { label: string; path: string; type: "tool" | "occupation" | "visa" | "guide"; destination?: string };
export type GuideTable = { caption: string; head: string[]; rows: string[][] };
export type GuideSection = { heading: string; paragraphs?: string[]; bullets?: string[]; table?: GuideTable };
export type ResearchGuide = {
  slug: string;
  /** Page title without the brand (the layout's title template appends it once). */
  title: string;
  h1: string;
  description: string;
  primaryQuery: string;
  /** The short direct answer shown first. */
  directAnswer: string[];
  sections: GuideSection[];
  sources: GuideSource[];
  related: GuideLink[];
  /** Short list of what this page adds over the search results and the existing LogiVisa pages (also held in the content map). */
  value: string;
};

const ABS = "https://www.abs.gov.au/statistics/classifications/anzsco-australian-and-new-zealand-standard-classification-occupations/2022/browse-classification";
const ABS_ROOT = "https://www.abs.gov.au/statistics/classifications/australian-and-new-zealand-standard-classification-occupation-anzsco";
const TRA = "https://www.tradesrecognitionaustralia.gov.au/";
const ACS_IT = "https://www.acs.org.au/msa/information-for-applicants/occupations-anzsco-codes/information-technology.html";
const EA = "https://www.engineersaustralia.org.au/migrants/migration-skills-assessment";
const IEA = "https://www.internationalengineeringalliance.org/";
const HA_189 = "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189";
const HA_190 = "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190";
const HA_491 = "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-work-regional-provisional-491";
const HA_SKILLSELECT = "https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect";
const ACT_NOMINATION = "https://www.act.gov.au/migration/skilled-migrants/act-government-nomination";
const ACT_190 = "https://www.act.gov.au/migration/skilled-migrants/190-nomination-criteria/canberra-resident-applicant-eligibility";
const ACT_ROUNDS = "https://www.act.gov.au/migration/resources/canberra-matrix-invitation-round";

const L = {
  skills: { label: "Skills Assessment Finder", path: "/tools/skills-assessment", type: "tool", destination: "skills_assessment" },
  anzsco: { label: "ANZSCO Finder", path: "/tools/anzsco-finder", type: "tool", destination: "anzsco_finder" },
  occList: { label: "Australian skilled occupation list", path: "/occupations", type: "occupation", destination: "occupation_list" },
  points: { label: "Points Calculator", path: "/tools/points-calculator", type: "tool", destination: "points_calculator" },
  compare: { label: "Visa comparison", path: "/tools/visa-comparison", type: "tool", destination: "visa_comparison" },
  state: { label: "State nomination research", path: "/tools/state-nomination", type: "tool", destination: "state_nomination" },
  rounds: { label: "Invitation rounds", path: "/tools/invitation-rounds", type: "tool" },
  chef: { label: "Chef (351311) occupation page", path: "/occupations/351311-chef", type: "occupation" },
  cook: { label: "Cook (351411) occupation page", path: "/occupations/351411-cook", type: "occupation" },
  dev: { label: "Developer Programmer (261312) occupation page", path: "/occupations/261312-developer-programmer", type: "occupation" },
  swe: { label: "Software Engineer (261313) occupation page", path: "/occupations/261313-software-engineer", type: "occupation" },
  civil: { label: "Civil Engineer (233211) occupation page", path: "/occupations/233211-civil-engineer", type: "occupation" },
  v189: { label: "Subclass 189", path: "/visas/189", type: "visa" },
  v190: { label: "Subclass 190", path: "/visas/190", type: "visa" },
  v491: { label: "Subclass 491", path: "/visas/491", type: "visa" },
} satisfies Record<string, GuideLink>;

export const RESEARCH_GUIDES: ResearchGuide[] = [
  {
    slug: "chef-vs-cook-australia",
    title: "Chef (351311) vs Cook (351411): ANZSCO descriptions compared",
    h1: "Chef 351311 vs Cook 351411: what the official descriptions say",
    description: "The published ANZSCO descriptions of Chef (351311) and Cook (351411) side by side, why a job title alone does not settle the classification, and where TRA fits in.",
    primaryQuery: "Chef 351311 vs Cook 351411",
    directAnswer: [
      "Chef (351311) and Cook (351411) are two separate ANZSCO occupations in two separate unit groups (3513 and 3514). ANZSCO describes a Chef as planning and organising food preparation and cooking, and a Cook as preparing, seasoning and cooking food. ANZSCO also gives them different skill levels (2 and 3).",
      "Which description a person's actual work matches is decided by the assessing authority from the evidence, not by the job title. For both occupations the assessing authority listed by TRA is Trades Recognition Australia.",
    ],
    sections: [
      {
        heading: "The two ANZSCO entries side by side",
        table: {
          caption: "Chef and Cook as published in ANZSCO (ABS 2022 pages)",
          head: ["", "Chef 351311", "Cook 351411"],
          rows: [
            ["Unit group", "3513 Chefs", "3514 Cooks"],
            ["Occupation description", "Plans and organises the preparation and cooking of food in a dining or catering establishment.", "Prepares, seasons and cooks food in a dining or catering establishment."],
            ["Skill level (Australia)", "Skill Level 2", "Skill Level 3"],
            ["Indicative qualification", "AQF Associate Degree, Advanced Diploma or Diploma; at least three years of relevant experience may substitute.", "AQF Certificate III including at least two years of on-the-job training, or AQF Certificate IV; at least three years of relevant experience may substitute."],
            ["Tasks that appear in the entry", "Planning menus, estimating food and labour costs and ordering food supplies; monitoring the quality of dishes at all stages; demonstrating techniques and advising on cooking procedures; enforcing hygiene regulations; may select and train staff.", "Examining foodstuffs for quality; regulating oven and grill temperatures; seasoning and portioning food; preparing food for special dietary requirements; may plan menus and estimate food requirements; may train kitchen staff and apprentices."],
            ["Specialisations listed", "Chef de Partie, Commis Chef, Demi Chef, Second Chef, Sous Chef", "None listed on the page"],
          ],
        },
        paragraphs: ["Source: the ABS ANZSCO 2022 unit group pages for 3513 and 3514, checked " + GUIDES_CHECKED_ON + ". The ABS marks that release as not the latest, so confirm the version the assessing authority and the Department of Home Affairs currently use."],
      },
      {
        heading: "Why the job title alone does not settle it",
        paragraphs: [
          "Both entries describe work in a dining or catering establishment, and the Cook entry says a Cook may plan menus and estimate food requirements, which are also Chef tasks. Each ANZSCO unit group also states that the other occupation is excluded from it: Chefs are excluded from 3514 and Cooks are excluded from 3513.",
          "Kitchens use titles such as head chef, chef de partie or cook inconsistently. ANZSCO classifies by the tasks performed and the skill level of the work, so an assessing authority reads evidence of duties and responsibilities rather than the title on a contract.",
        ],
      },
      {
        heading: "Where TRA fits",
        paragraphs: [
          "Trades Recognition Australia (TRA) is the assessing authority for trade occupations including Chef and Cook. TRA runs the Migration Skills Assessment (MSA) and, for listed occupations and passport countries, the Offshore Skills Assessment Program (OSAP). In the TRA program page capture held by LogiVisa (July 2026), both Chef and Cook appear on the OSAP occupation list for a published set of passport countries.",
          "Whether MSA or OSAP is the program for a given person depends on TRA's current rules. See the separate comparison of the two programs below.",
        ],
      },
      {
        heading: "Skills assessment is a separate step",
        paragraphs: [
          "An assessment of skills by TRA is a different thing from a visa decision. It does not establish that a person can be granted any visa, will be nominated by a state, or will be invited to apply. The guide on skills assessment versus visa requirements sets out the separation.",
        ],
      },
    ],
    sources: [
      { label: "ABS ANZSCO 2022: Unit Group 3513 Chefs", url: `${ABS}/3/35/351/3513`, note: "Chef description, tasks, skill level, indicative qualification, exclusions" },
      { label: "ABS ANZSCO 2022: Unit Group 3514 Cooks", url: `${ABS}/3/35/351/3514`, note: "Cook description, tasks, skill level, indicative qualification, exclusions" },
      { label: "ABS: ANZSCO classification", url: ABS_ROOT, note: "Current ANZSCO release information" },
      { label: "Trades Recognition Australia", url: TRA, note: "Current Migration Skills Assessment and OSAP information" },
    ],
    related: [L.chef, L.cook, { label: "TRA MSA vs OSAP", path: "/guides/tra-msa-vs-osap", type: "guide" }, L.skills, L.anzsco, L.occList],
    value: "Both ABS descriptions in one table with skill levels, tasks and the exclusion wording, the TRA context from primary sources, and no verdict on which applies. The existing occupation pages carry only a short 'do not confuse' note.",
  },
  {
    slug: "tra-msa-vs-osap",
    title: "TRA MSA vs OSAP: two Trades Recognition Australia programs",
    h1: "TRA Migration Skills Assessment (MSA) vs Offshore Skills Assessment Program (OSAP)",
    description: "What TRA's Migration Skills Assessment and Offshore Skills Assessment Program are, how they differ in scope, and where to check which rules are current.",
    primaryQuery: "TRA MSA vs OSAP",
    directAnswer: [
      "Trades Recognition Australia (TRA) offers more than one skills assessment program. The standard Migration Skills Assessment (MSA) is the general program. The Offshore Skills Assessment Program (OSAP) is a separate program that TRA's guidelines apply to listed occupations and, for most of them, listed passport countries.",
      "This page describes the programs as published. It does not say which one a particular person needs; TRA's current guidelines and occupation list decide that.",
    ],
    sections: [
      {
        heading: "The two programs as TRA publishes them",
        table: {
          caption: "MSA and OSAP, from TRA's Migration Skills Assessment Program Guidelines (July 2026) and program page capture",
          head: ["", "Migration Skills Assessment (MSA)", "Offshore Skills Assessment Program (OSAP)"],
          rows: [
            ["What it is", "TRA's standard skills assessment for migration in trade occupations.", "A separate TRA program with its own pathways (documentary evidence, technical interview and, if required, a practical assessment)."],
            ["Who it is not open to", "The four licensed occupations (Airconditioning and Refrigeration Mechanic, Electrician (General), Electrician (Special Class), Plumber (General)), and applicants whose passport country and occupation require OSAP.", "Not applicable to occupations that are not on the OSAP occupation list."],
            ["How listing works", "The default program for trade occupations that are not caught by an OSAP requirement.", "An occupation on the OSAP list, with a passport from a country listed for that occupation. A person on the list but from another country may still choose OSAP."],
            ["Licensed occupations", "Not available for the four licensed occupations.", "Compulsory for permanent migration in those four occupations (two pathways, depending on whether the person holds a relevant Australian VET qualification or a current Australian licence)."],
            ["Fee in the guidelines held by LogiVisa", "AUD 795 (guidelines dated July 2026).", "Pathway-based; see TRA for the current fee schedule."],
          ],
        },
        paragraphs: ["TRA changes these rules. TRA revises its program rules and occupation list, so treat any summary, including this one, as a pointer to TRA's current guidelines."],
      },
      {
        heading: "Assessment is not a licence",
        paragraphs: [
          "A TRA skills assessment is made for migration purposes. It is not an Australian occupational licence. For licensed occupations such as electrician or plumber, working in Australia also involves the relevant state or territory licensing body, which is a separate process with separate requirements.",
          "The reverse also holds: an Australian licence or qualification can be relevant evidence for TRA, as the OSAP pathway split above shows, but it is not the same decision.",
        ],
      },
      {
        heading: "Where to check what is current",
        bullets: [
          "TRA's Migration Skills Assessment Program Guidelines and OSAP occupation list, on the TRA website.",
          "The licensing authority in the state or territory where the person intends to work, for licensed occupations.",
          "The Department of Home Affairs for which assessing authority and assessment each visa requires.",
        ],
      },
    ],
    sources: [
      { label: "Trades Recognition Australia", url: TRA, note: "Program guidelines, OSAP occupation list and fees (this page's table follows the July 2026 edition captured by LogiVisa on 2026-10-11)" },
      { label: "Department of Home Affairs: SkillSelect", url: HA_SKILLSELECT, note: "How a skills assessment is used in skilled visa applications" },
    ],
    related: [
      L.skills,
      { label: "Chef vs Cook", path: "/guides/chef-vs-cook-australia", type: "guide" },
      { label: "Skills assessment vs visa requirements", path: "/guides/skills-assessment-vs-visa-eligibility", type: "guide" },
      L.chef,
      L.cook,
    ],
    value: "A neutral, dated side-by-side of the two programs taken from TRA's own guidelines (including the licensed-occupation rule), plus the assessment-versus-licence distinction. Agent pages mix the programs with fee and timing claims that are not dated.",
  },
  {
    slug: "developer-programmer-vs-software-engineer",
    title: "Developer Programmer (261312) vs Software Engineer (261313)",
    h1: "Developer Programmer 261312 vs Software Engineer 261313: the published descriptions",
    description: "The ANZSCO descriptions of Developer Programmer (261312) and Software Engineer (261313) compared, what ACS publishes, and why an employer's job title is not the classification.",
    primaryQuery: "261312 vs 261313",
    directAnswer: [
      "ANZSCO describes Developer Programmer (261312) as interpreting specifications, technical designs and flow charts to build, maintain and modify code. Software Engineer (261313) is described as designing, developing, modifying, documenting, testing, implementing, installing and supporting software applications and systems. Both are Skill Level 1 occupations in unit group 2613.",
      "The Australian Computer Society (ACS) assesses both. ACS's published occupation page lists near-identical duties for them and does not say which code suits which profile, so the choice cannot be read off a job title.",
    ],
    sections: [
      {
        heading: "The two entries side by side",
        table: {
          caption: "Developer Programmer and Software Engineer as published in ANZSCO (ABS 2022 page, unit group 2613)",
          head: ["", "Developer Programmer 261312", "Software Engineer 261313"],
          rows: [
            ["Occupation description", "Interprets specifications, technical designs and flow charts, builds, maintains and modifies the code for software applications; also writes technical specifications and tests and documents the work.", "Designs, develops, modifies, documents, tests, implements, installs and supports software applications and systems."],
            ["Skill level", "1", "1"],
            ["Alternative titles", "Applications Developer, ICT Developer, ICT Programmer", "Software Architect, Software Designer"],
            ["Specialisations", "Cyber Security Developer, Database Developer, Database Programmer (Systems), Network Programmer, Software Developer, Software Programmer", "Computer Applications Engineer, Database Designer, Systems Architect"],
            ["Assessing authority", "ACS", "ACS"],
          ],
        },
        paragraphs: ["Unit group 2613 (Software and Applications Programmers) lists tasks and the indicative qualification (a bachelor degree or higher, with five years of relevant experience and/or vendor certification able to substitute) once for the whole group, not per occupation."],
      },
      {
        heading: "Where they overlap and where the wording differs",
        bullets: [
          "Overlap: both cover writing, testing, documenting and maintaining code, and both sit in the same unit group with the same indicative qualification.",
          "Wording: the Developer Programmer entry is framed around building code from existing specifications and designs. The Software Engineer entry is framed around designing as well as developing, and its alternative titles (Software Architect, Software Designer) point to design work.",
          "Neither entry is defined by a seniority or a job title. A person called a 'software engineer' by an employer may do work that reads as either entry.",
        ],
      },
      {
        heading: "What ACS publishes",
        paragraphs: [
          "ACS's page on IT occupations and ANZSCO codes lists duties for 261312 and 261313 that are nearly identical. It gives no code-specific qualification requirement for either; it describes a general process in which ACS compares the qualification with the AQF, rates the ICT content, and then decides how much work experience is needed.",
          "The page does not tell applicants which code matches which profile. It advises applicants to match the occupation to their own qualifications and to describe their skills accurately.",
        ],
      },
      {
        heading: "Classification is not a visa requirement",
        paragraphs: [
          "An ANZSCO code identifies an occupation. Whether an occupation is on the list a visa or a state uses, and what each visa requires, are separate questions answered by the Department of Home Affairs and the state or territory. The guide on skills assessment versus visa requirements covers that separation.",
        ],
      },
    ],
    sources: [
      { label: "ABS ANZSCO 2022: Unit Group 2613 Software and Applications Programmers", url: `${ABS}/2/26/261/2613`, note: "Descriptions, skill level, alternative titles, specialisations" },
      { label: "ACS: IT occupations and ANZSCO codes", url: ACS_IT, note: "Duties and process for 261312 and 261313" },
      { label: "ABS: ANZSCO classification", url: ABS_ROOT, note: "Current ANZSCO release information" },
    ],
    related: [L.dev, L.swe, L.anzsco, L.occList, L.skills, { label: "Skills assessment vs visa requirements", path: "/guides/skills-assessment-vs-visa-eligibility", type: "guide" }],
    value: "Both ABS entries and ACS's own wording in one table, with the specialisations and alternative titles that explain the overlap. The existing occupation pages carry only a short 'compare with' note.",
  },
  {
    slug: "skills-assessment-vs-visa-eligibility",
    title: "Skills assessment vs visa eligibility: separate steps",
    h1: "A skills assessment and visa eligibility are separate things",
    description: "How a skills assessment, visa requirements, points, occupation lists, state nomination, invitation and the visa application relate, and what a positive assessment does not establish.",
    primaryQuery: "skills assessment vs visa eligibility Australia",
    directAnswer: [
      "A skills assessment is an opinion from an assessing authority about a person's qualifications and work experience against an occupation. It is one document that skilled visa processes ask for. It is not a visa decision.",
      "A positive skills assessment does not by itself establish visa eligibility, state or territory nomination, an invitation to apply, or a visa grant. Each of those is a separate step with its own rules and decision-maker.",
    ],
    sections: [
      {
        heading: "The steps and who decides each",
        table: {
          caption: "Separate decisions in the skilled migration process",
          head: ["Step", "What it is", "Decided by"],
          rows: [
            ["Skills assessment", "An assessment of qualifications and experience against an ANZSCO occupation.", "The assessing authority for that occupation (for example ACS, Engineers Australia, TRA, VETASSESS)."],
            ["Visa requirements", "The criteria written for each visa subclass, including age, English, and a suitable skills assessment for points-tested visas.", "The Department of Home Affairs."],
            ["Points", "A score from published factors, claimed in an Expression of Interest. A pass mark allows an EOI to be made; it is not a guarantee of anything further.", "Claimed by the applicant; tested by Home Affairs."],
            ["Occupation lists", "Lists that decide which occupations a visa stream or a state accepts.", "Home Affairs for the national lists; each state or territory for its own list."],
            ["State or territory nomination", "A state or territory choosing to nominate a person for the 190 or 491, under its own criteria and its limited annual allocation.", "The state or territory."],
            ["Invitation", "An invitation to apply for the visa, issued from the SkillSelect pool of Expressions of Interest.", "Home Affairs in invitation rounds for the subclass 189; for the 190 and 491, the process of the nominating state or territory."],
            ["Visa application and grant", "The formal application lodged after an invitation, including health, character and evidence checks.", "The Department of Home Affairs."],
          ],
        },
      },
      {
        heading: "Common confusions",
        bullets: [
          "'My assessment is positive, so I meet the visa requirements.' The assessment is one requirement; the visa has others, and the decision is made on the application.",
          "'I have enough points, so I will be invited.' Invitations are issued in rounds from the pool of EOIs, and the points of the lowest invited EOI in each round are not set in advance.",
          "'My occupation is on a list, so I am assessed as skilled.' Being on a list says what the list accepts; it is not an assessment of a person.",
          "'The assessment was done for one occupation, so it covers a similar one.' An assessment is made for the occupation nominated in the application.",
        ],
      },
      {
        heading: "Why the order and validity matter",
        paragraphs: [
          "Skilled visa processes ask that the assessment is suitable for the nominated occupation and, in many cases, current when the EOI is lodged and when a state nominates. The ACT Government, for example, requires the English test and skills assessment to be valid at the date of its Canberra Matrix submission and again at the date of nomination. Check the validity rule of each assessing authority and each state.",
        ],
      },
      {
        heading: "Where to continue",
        paragraphs: [
          "The Skills Assessment Finder lists the published assessing authority for an occupation; the Points Calculator shows how points are counted; the visa comparison and state nomination research set out the published requirements. None of them decides eligibility, and this page does not either.",
        ],
      },
    ],
    sources: [
      { label: "Department of Home Affairs: Skilled Independent visa (subclass 189)", url: HA_189, note: "Visa requirements and process" },
      { label: "Department of Home Affairs: Skilled Nominated visa (subclass 190)", url: HA_190, note: "Nomination requirement" },
      { label: "Department of Home Affairs: Skilled Work Regional (Provisional) visa (subclass 491)", url: HA_491, note: "Nomination or family sponsorship requirement" },
      { label: "Department of Home Affairs: SkillSelect", url: HA_SKILLSELECT, note: "Expressions of Interest and invitation rounds" },
      { label: "ACT Government: 190 nomination criteria", url: ACT_190, note: "Example of a state requiring a valid skills assessment and English test at submission and at nomination (captured 2026-10-13)" },
    ],
    related: [L.skills, L.points, L.compare, L.state, L.anzsco, L.v189, L.v190, L.v491, { label: "State occupation list vs nomination", path: "/guides/state-occupation-list-vs-nomination", type: "guide" }],
    value: "One table that separates seven decisions and names the decision-maker for each, tied to the LogiVisa tools that report the published facts for each step. Search results mostly cover one step each or are agent pages written to sell an assessment.",
  },
  {
    slug: "engineers-australia-accredited-vs-cdr",
    title: "Engineers Australia: accredited qualification vs CDR",
    h1: "Engineers Australia: the accredited qualification pathway and the CDR pathway",
    description: "How Engineers Australia separates an accredited qualification from a Competency Demonstration Report (CDR), what the Washington, Sydney and Dublin Accords are, and where to verify accreditation.",
    primaryQuery: "Engineers Australia accredited qualification vs CDR",
    directAnswer: [
      "Engineers Australia assesses engineering qualifications and skills for migration through more than one pathway. The accredited (qualification) pathway applies to qualifications that Engineers Australia, or an Accord signatory it recognises, has accredited. The Competency Demonstration Report (CDR) pathway applies to provisionally accredited or non-accredited qualifications, and to qualifications that do not match the occupation sought.",
      "A CDR is a written report assessed against Engineers Australia's standards; it is not a qualification. Neither pathway is a visa decision. This page does not say whether any particular degree is accredited; the official checkers do.",
    ],
    sections: [
      {
        heading: "The two pathways as Engineers Australia describes them",
        table: {
          caption: "Accredited qualification pathway and CDR pathway (Engineers Australia migration skills assessment page, updated 27 February 2026)",
          head: ["", "Accredited qualification pathway", "CDR pathway"],
          rows: [
            ["Applies to", "A program accredited by Engineers Australia (Australian qualification), or an overseas qualification recognised under the Washington, Sydney or Dublin Accord.", "A provisionally accredited Australian qualification, a non-accredited engineering qualification, a qualification that does not match the occupation sought, or a combination of qualifications that shows the underpinning knowledge."],
            ["What is assessed", "The accredited qualification.", "Knowledge, skills and competency, written up in a Competency Demonstration Report, against Engineers Australia standards for the occupation."],
            ["Overseas recognition conditions", "Completed after (or in the year) the country became a full signatory; within the accredited period on the signatory's site; fully accredited. Provisional accreditation is not sufficient.", "Not applicable."],
            ["Where to check", "The International Engineering Alliance qualification checker for overseas qualifications; Engineers Australia's accredited program list for Australian ones.", "Engineers Australia's CDR guidance."],
          ],
        },
        paragraphs: ["Engineers Australia states that from 1 September 2024 Advanced Diploma and Associate Degree holders can use the accredited pathway only with Engineers Australia-accredited qualifications."],
      },
      {
        heading: "The three Accords",
        paragraphs: [
          "The Washington, Sydney and Dublin Accords are international agreements that recognise engineering education accredited by member bodies. Which Accord a qualification falls under depends on its level and type, and a qualification is recognised only under the conditions in the table above.",
        ],
      },
      {
        heading: "Qualification assessment is not a migration outcome",
        paragraphs: [
          "An Engineers Australia outcome tells a visa process how a qualification or competency compares with an engineering occupation. It does not decide that a person can apply for a visa, is nominated by a state, or is invited. The guide on skills assessment versus visa requirements covers the later steps.",
        ],
      },
      {
        heading: "Official verification",
        bullets: [
          "Overseas qualification: use the International Engineering Alliance qualification checker linked below, then confirm against the current Engineers Australia page.",
          "Australian qualification: check Engineers Australia's list of accredited programs, including the program's accredited period.",
          "Occupation: Engineers Australia's application offers 31 engineering occupations; the occupation page for Civil Engineer shows how LogiVisa reports that assessing authority.",
        ],
      },
    ],
    sources: [
      { label: "Engineers Australia: Migration skills assessment", url: EA, note: "Pathways, Accords, accreditation checks, 1 September 2024 change (page updated 27 February 2026)" },
      { label: "International Engineering Alliance", url: IEA, note: "Washington, Sydney and Dublin Accords; qualification checker for overseas programs" },
    ],
    related: [L.civil, L.skills, L.anzsco, { label: "Skills assessment vs visa requirements", path: "/guides/skills-assessment-vs-visa-eligibility", type: "guide" }],
    value: "A single table tying each pathway to the official conditions and verification destination, with the 2024 change dated. Search results are mostly consultancies selling CDR writing.",
  },
  {
    slug: "state-occupation-list-vs-nomination",
    title: "State occupation list vs state nomination",
    h1: "An occupation on a state list is not a state nomination",
    description: "Why appearing on a state or territory occupation list does not by itself mean nomination: criteria, invitation processes, allocations and changing programs, with the ACT as a worked example.",
    primaryQuery: "state occupation list vs nomination 190 491",
    directAnswer: [
      "A state or territory occupation list says which occupations that state accepts for its nomination program. Nomination is a separate decision by the state, made under its own criteria and its limited allocation of places.",
      "That an occupation appears on a list therefore does not mean the state will nominate a person in that occupation. This page does not name a state for anyone, rank states or predict nomination.",
    ],
    sections: [
      {
        heading: "What the list does and does not do",
        table: {
          caption: "A state occupation list versus a state nomination",
          head: ["", "Occupation list", "Nomination"],
          rows: [
            ["What it is", "The occupations a state or territory currently accepts for its program.", "The state or territory choosing to nominate a particular person for the subclass 190 or 491."],
            ["Who decides", "The state or territory publishes it, and can change it.", "The state or territory, on its own criteria."],
            ["Other conditions", "Usually only one of several criteria.", "May include residence or work requirements, English and skills assessment validity, points, and an invitation process."],
            ["Capacity", "Not limited by number.", "Limited by the allocation of places the Australian Government gives each state and territory for each visa."],
          ],
        },
      },
      {
        heading: "Worked example: the ACT",
        paragraphs: [
          "Official ACT pages (captured 2026-10-13) show how a list sits among other steps. For the subclass 190 as a Canberra resident, the ACT requires, at the date a person submits or updates the Canberra Matrix, that the person meets Home Affairs criteria including a valid English test and skills assessment, and that the nominated occupation is on the latest ACT Nominated Migration Program Occupation List (or that a doctorate or small-business-owner pathway applies, where the occupation need not be on the list).",
          "The same page requires residence in Canberra for at least six months at the date of Matrix submission, continuing until the date of invitation, evidenced by ACT banking activity. The ACT states that the Australian Government allocates it a fixed number of nomination places for each visa subclass each financial year (800 for each of the 190 and 491 in 2025-26), and it publishes a tentative schedule of Canberra Matrix invitation rounds for 2026-27.",
          "So an occupation on the ACT list is one requirement. The list does not, on these pages, select who is nominated; the Matrix and the invitation rounds do. Other states set their own steps, and some publish rankings or rounds of their own; read each state's current pages.",
        ],
      },
      {
        heading: "Programs change",
        paragraphs: [
          "Lists, criteria and the number of places are reviewed by each state, commonly at the start of each program year, and can change within a year. A list read last year, or on an agent site, can be out of date. Check the date on the state's own page.",
        ],
      },
      {
        heading: "Where the national process comes in",
        paragraphs: [
          "State nomination under the 190 or 491 still sits inside the Home Affairs process: an EOI in SkillSelect, a suitable skills assessment, the visa's own criteria, and the visa application after the nomination and invitation. The guide on skills assessment versus visa requirements separates those steps.",
        ],
      },
    ],
    sources: [
      { label: "ACT Government: ACT Government nomination", url: ACT_NOMINATION, note: "Allocation of nomination places (captured 2026-10-13)" },
      { label: "ACT Government: 190 nomination, Canberra resident applicants", url: ACT_190, note: "List, Matrix, residence and validity criteria (captured 2026-10-13)" },
      { label: "ACT Government: Canberra Matrix invitation rounds", url: ACT_ROUNDS, note: "Tentative 2026-27 round schedule (captured 2026-10-13)" },
      { label: "Department of Home Affairs: Skilled Nominated visa (subclass 190)", url: HA_190, note: "National requirements for the 190" },
      { label: "Department of Home Affairs: Skilled Work Regional (Provisional) visa (subclass 491)", url: HA_491, note: "National requirements for the 491" },
    ],
    related: [L.state, L.points, L.v190, L.v491, L.skills, L.anzsco, { label: "Skills assessment vs visa requirements", path: "/guides/skills-assessment-vs-visa-eligibility", type: "guide" }],
    value: "States the list-versus-nomination gap with a primary-source worked example (ACT criteria, allocation and rounds, dated). Agent pages usually give a generic warning with no source.",
  },
];


export function findResearchGuide(slug: string): ResearchGuide | undefined {
  return RESEARCH_GUIDES.find((g) => g.slug === slug);
}

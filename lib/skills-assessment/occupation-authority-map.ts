import { normalizeOccupationCode } from "./types";

/**
 * Occupation → Skills Assessment Authority map.
 *
 * Maps an ANZSCO code to the assessing authority that covers it, based on the
 * `occupations[]` arrays declared in the 12 authority files under
 * `lib/skills-assessment/authorities/`:
 *
 *   AACA, ACS, ADC, AIMS, CA-ANZ, CASA, CPA, EA, IPA, OTC, TRA, VETASSESS
 *
 * Notes:
 * - Where multiple authorities cover the same code (the 6 accounting codes are
 *   covered by CPA Australia, CA ANZ and IPA), the code maps to the authority
 *   that `getSkillsAssessmentAuthority()` in `index.ts` resolves first —
 *   CPA Australia (declared first in the registry).
 * - VETASSESS declares an empty `occupations[]` (its 341 professional
 *   occupations are matched from the occupations registry, not enumerated), so
 *   it contributes no codes to this map.
 * - AACA also declares the OSCA code 241131 for Architect (forward compat);
 *   this map keys on ANZSCO only.
 *
 * Generated from `src/data/occupations.json` (1463 occupations) and the
 * 12 authority files. Do not hand-edit the audit section.
 */

export const occupationAuthorityMap: Record<string, string> = {
  // ── AACA (1) ──
  "232111": "AACA",
  // ── ACS (35) ──
  "224999": "ACS",
  "224114": "ACS",
  "224115": "ACS",
  "135111": "ACS",
  "135112": "ACS",
  "135199": "ACS",
  "223211": "ACS",
  "261111": "ACS",
  "261112": "ACS",
  "261211": "ACS",
  "261212": "ACS",
  "261311": "ACS",
  "261312": "ACS",
  "261313": "ACS",
  "261314": "ACS",
  "261316": "ACS",
  "261399": "ACS",
  "262111": "ACS",
  "262113": "ACS",
  "262112": "ACS",
  "263111": "ACS",
  "263112": "ACS",
  "263113": "ACS",
  "263211": "ACS",
  "263212": "ACS",
  "263213": "ACS",
  "263299": "ACS",
  "313113": "ACS",
  "261315": "ACS",
  "261317": "ACS",
  "262114": "ACS",
  "262115": "ACS",
  "262116": "ACS",
  "262117": "ACS",
  "262118": "ACS",
  // ── ADC (2) ──
  "252311": "ADC",
  "252312": "ADC",
  // ── EA (27) ──
  "233911": "EA",
  "233912": "EA",
  "233913": "EA",
  "233111": "EA",
  "233211": "EA",
  "312211": "EA",
  "233311": "EA",
  "312311": "EA",
  "312312": "EA",
  "312412": "EA",
  "233411": "EA",
  "312411": "EA",
  "133211": "EA",
  "233999": "EA",
  "233914": "EA",
  "233915": "EA",
  "233212": "EA",
  "233511": "EA",
  "233112": "EA",
  "233512": "EA",
  "312511": "EA",
  "312512": "EA",
  "233612": "EA",
  "233916": "EA",
  "233214": "EA",
  "263311": "EA",
  "263312": "EA",
  // ── CPA (6) ──
  "221111": "CPA",
  "221212": "CPA",
  "221213": "CPA",
  "132211": "CPA",
  "221112": "CPA",
  "221113": "CPA",
  // ── AIMS (2) ──
  "234611": "AIMS",
  "311213": "AIMS",
  // ── TRA (6) ──
  "351311": "TRA",
  "351411": "TRA",
  "331212": "TRA",
  "341111": "TRA",
  "334111": "TRA",
  "321211": "TRA",
  // ── CASA (3) ──
  "231111": "CASA",
  "231113": "CASA",
  "231114": "CASA",
  // ── OTC (1) ──
  "252411": "OTC",
  // ── ANMAC (15) ──
  "411411": "ANMAC",
  "254311": "ANMAC",
  "254211": "ANMAC",
  "254212": "ANMAC",
  "254411": "ANMAC",
  "254412": "ANMAC",
  "254413": "ANMAC",
  "254414": "ANMAC",
  "254415": "ANMAC",
  "254416": "ANMAC",
  "254418": "ANMAC",
  "254422": "ANMAC",
  "254425": "ANMAC",
  "254423": "ANMAC",
  "254499": "ANMAC",
  // ── AHPRA (29) ──
  "134211": "AHPRA",
  "253917": "AHPRA",
  "253912": "AHPRA",
  "253111": "AHPRA",
  "253999": "AHPRA",
  "253513": "AHPRA",
  "253911": "AHPRA",
  "253913": "AHPRA",
  "253914": "AHPRA",
  "253512": "AHPRA",
  "253515": "AHPRA",
  "253516": "AHPRA",
  "253517": "AHPRA",
  "253411": "AHPRA",
  "253211": "AHPRA",
  "253112": "AHPRA",
  "253312": "AHPRA",
  "253313": "AHPRA",
  "253314": "AHPRA",
  "253315": "AHPRA",
  "253316": "AHPRA",
  "253317": "AHPRA",
  "253318": "AHPRA",
  "253321": "AHPRA",
  "253322": "AHPRA",
  "253323": "AHPRA",
  "253324": "AHPRA",
  "253511": "AHPRA",
  "253514": "AHPRA",
};

/**
 * Returns the assessing authority ID for a given ANZSCO code, or `null`
 * when no authority in the registry covers it.
 *
 * The code is normalized the same way as `getSkillsAssessmentAuthority()`
 * (strip non-digits, zero-pad to 6 digits), so `"261313"`, `"261313 Software
 * Engineer"` and `"Software Engineer 261313"` all resolve the same way.
 */
export function getAuthorityIdForOccupation(anzscoCode: string): string | null {
  const code = normalizeOccupationCode(anzscoCode);
  if (!code) return null;
  return occupationAuthorityMap[code] ?? null;
}

// ============================================================================
// FUZZY TITLE MATCHING (fallback for occupations with no ANZSCO code, or a
// code not covered by occupationAuthorityMap above -- covers just 83 of 1463
// occupations by exact code). Keyword-based, not exhaustive: matches on
// common role-family words rather than requiring an exact dictionary hit, so
// "Software Engineer" (no code attached) still resolves instead of falling
// through to a generic "contact the relevant authority" message.
//
// Two authorities here (ANMAC, AHPRA) have no full SkillsAssessmentAuthority
// module under lib/skills-assessment/authorities/ (no pathways/fees data
// modeled) -- they're display-name-only entries, sufficient for the
// personalized "[Authority] will assess you" sentence but not for a detailed
// fees/pathway breakdown the way ACS/EA/TRA/etc. get elsewhere.
// ============================================================================

export type AssessingAuthorityMatch = {
  authorityId: string;
  authorityName: string;
};

/**
 * Ordered so more specific keywords are checked before broader ones that
 * would otherwise shadow them -- e.g. "software engineer" must resolve to
 * ACS, not EA, so "software"/"developer"/"programmer" are listed before the
 * generic "engineer" keyword.
 */
const AUTHORITY_KEYWORDS: Array<{ keywords: string[]; match: AssessingAuthorityMatch }> = [
  {
    keywords: ["software", "developer", "programmer", "web design", "ict", "cyber security", "data scientist", "database", "network engineer", "systems analyst", "it support", "information technology"],
    match: { authorityId: "ACS", authorityName: "Australian Computer Society (ACS)" },
  },
  {
    keywords: ["chef", "cook", "mechanic", "electrician", "plumber", "carpenter", "hairdresser", "baker", "butcher", "welder", "bricklayer", "cabinetmaker", "boilermaker", "toolmaker", "fitter", "joiner"],
    match: { authorityId: "TRA", authorityName: "Trades Recognition Australia (TRA)" },
  },
  {
    keywords: ["nurse", "nursing", "midwife", "midwifery"],
    match: { authorityId: "ANMAC", authorityName: "Australian Nursing and Midwifery Accreditation Council (ANMAC)" },
  },
  {
    keywords: ["doctor", "physician", "surgeon", "medical practitioner", "general practitioner", "psychiatrist", "anaesthetist", "paediatrician", "dentist"],
    match: { authorityId: "AHPRA", authorityName: "Australian Health Practitioner Regulation Agency (AHPRA)" },
  },
  {
    keywords: ["account", "auditor", "bookkeeper", "tax agent"],
    match: { authorityId: "CPA", authorityName: "CPA Australia" },
  },
  {
    keywords: ["engineer", "engineering"],
    match: { authorityId: "EA", authorityName: "Engineers Australia (EA)" },
  },
  {
    keywords: ["architect"],
    match: { authorityId: "AACA", authorityName: "Architects Accreditation Council of Australia (AACA)" },
  },
];

/**
 * Normalizes a free-text occupation title for keyword matching:
 * lowercases, strips a leading/trailing ANZSCO code (e.g. "261313 - Software
 * Engineer" or "Software Engineer 261313" -> "software engineer"), and
 * trims whitespace/stray punctuation left behind by the strip.
 */
function normalizeOccupationTitle(occupationTitle: string): string {
  return occupationTitle
    .toLowerCase()
    .replace(/^\s*\d{4,6}\s*[-–—]?\s*/, "") // leading code, optionally followed by a dash
    .replace(/\s*\d{4,6}\s*$/, "") // trailing code
    .replace(/[()]/g, " ")
    .trim();
}

/**
 * Resolves an assessing authority from a free-text occupation title via
 * fuzzy keyword matching -- for occupations with no ANZSCO code attached (or
 * a code outside occupationAuthorityMap's 83-entry exact-match coverage), so
 * "Software Engineer" alone still resolves to ACS instead of falling back to
 * a generic placeholder. Returns `null` when no keyword matches; callers
 * should fall back to a personalized-but-honest "identify your authority"
 * message rather than a hardcoded generic one (see
 * lib/readiness/pdf-content/skills-assessment-status.ts).
 */
export function getAssessingAuthority(occupationTitle: string | undefined): AssessingAuthorityMatch | null {
  if (!occupationTitle) return null;
  const normalized = normalizeOccupationTitle(occupationTitle);
  if (!normalized) return null;

  for (const { keywords, match } of AUTHORITY_KEYWORDS) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return match;
    }
  }
  return null;
}

// ============================================================================
// AUDIT REPORT
// ============================================================================
//
// Source dataset   : src/data/occupations.json (1463 occupations)
// Map entries      : 83 unique ANZSCO codes
// Covered          : 83 / 1463 occupations (5.7%)
// Uncovered        : 1380 / 1463 occupations
// Generated        : 2026-08-06
//
// Occupations the dataset attributes to the 12 modeled authorities, vs. the
// codes actually declared in each authority file's occupations[] array:
//
//   AACA      dataset=   0  declared=  1  gap=  -1
//   ACS       dataset=  39  declared= 35  gap=  +4
//   ADC       dataset=   3  declared=  2  gap=  +1
//   EA        dataset=   0  declared= 27  gap= -27
//   VETASSESS dataset= 276  declared=  0  gap=+276
//   CPA       dataset=   6  declared=  6  gap=   0
//   AIMS      dataset=   1  declared=  2  gap=  -1
//   CA-ANZ    dataset=   0  declared=  6  gap=  -6
//   IPA       dataset=   0  declared=  6  gap=  -6
//   TRA       dataset=  98  declared=  6  gap= +92
//   CASA      dataset=   3  declared=  3  gap=   0
//   OTC       dataset=   1  declared=  1  gap=   0
//
// The 1380 uncovered occupations break down as follows by the
// authority the dataset itself assigns:
//
//    903  ( 65.4%)  Unknown
//    267  ( 19.3%)  VETASSESS
//     93  (  6.7%)  TRA
//     34  (  2.5%)  MedBA
//     16  (  1.2%)  ANMAC
//      6  (  0.4%)  Legal admissions authority of a state or territory
//      6  (  0.4%)  ACS
//      4  (  0.3%)  IML
//      4  (  0.3%)  APS
//      4  (  0.3%)  AMSA
//      4  (  0.3%)  AITSL
//      3  (  0.2%)  ACECQA
//      3  (  0.2%)  ACWA
//      3  (  0.2%)  APharmC
//      3  (  0.2%)  AIR
//      2  (  0.1%)  Community Work Australia
//      2  (  0.1%)  ALIA
//      1  (  0.1%)  VETASSESS Council of Ambulance Authorities
//      1  (  0.1%)  Council of Ambulance Authorities
//      1  (  0.1%)  CMBA VETASSESS
//      1  (  0.1%)  VETASSESS AITSL
//      1  (  0.1%)  SPA
//      1  (  0.1%)  TRA VETASSESS
//      1  (  0.1%)  VETASSESS Defence Force
//      1  (  0.1%)  DAA
//      1  (  0.1%)  CAANZ CPAA IPA
//      1  (  0.1%)  SSSI
//      1  (  0.1%)  AHRI
//      1  (  0.1%)  VETASSESS SSSI
//      1  (  0.1%)  NAATI
//      1  (  0.1%)  Optometry Council of Australia and New Zealand
//      1  (  0.1%)  ADC
//      1  (  0.1%)  AVBC
//      1  (  0.1%)  APC
//      1  (  0.1%)  APodC
//      1  (  0.1%)  VETASSESS ACWA
//      1  (  0.1%)  AIQS
//      1  (  0.1%)  AASW
//      1  (  0.1%)  (empty)
//      1  (  0.1%)  AOPA
//
// ── Missing authorities (real registry gaps) ────────────────────────────
// Authorities that appear in the dataset but have NO module under
// lib/skills-assessment/authorities/ (occupations would return null):
//
//   MedBA (Medical Board of Australia), ANMAC (Australian Nursing and Midwifery Accreditation Council), ACECQA (Australian Children's Education and Care Quality Authority), ACWA (Australian Community Workers Association), APharmC (Australian Pharmacy Council), AITSL (Australian Institute for Teaching and School Leadership), AMSA (Australian Maritime Safety Authority), APS (Australian Psychological Society), IML (Institute of Managers and Leaders), AIR (Australian Institute of Radiography), ALIA (Australian Library and Information Association), AASW (Australian Association of Social Workers), AOPA (Australian Orthotic Prosthetic Association), APodC (Australian Podiatry Council), APC (Australasian Podiatry Council), AVBC (Australasian Veterinary Boards Council), AIQS (Australian Institute of Quantity Surveyors), SSSI (Surveying and Spatial Sciences Institute), NAATI (National Accreditation Authority for Translators and Interpreters), AHRI (Australian HR Institute), DAA (Dietitians Australia), SPA (Speech Pathology Australia)
//   plus: Legal admissions authority of a state or territory, Community Work
//   Australia, Optometry Council of Australia and New Zealand, Council of
//   Ambulance Authorities, VETASSESS Council of Ambulance Authorities,
//   CMBA (Chinese Medicine Board of Australia).
//
// ── Modeled authorities with undeclared dataset codes ────────────────────
// Occupations the dataset attributes to an authority already modeled, but
// whose code is NOT in that authority's occupations[] array:
//
//   VETASSESS  : 276 dataset rows, 0 declared (module lists no codes).
//                VETASSESS covers 341 professional occupations in reality — these
//                rows are effectively covered but will resolve to null here.
//   TRA        : 98 dataset rows, 6 declared (module lists the 6 most common of 133).
//   ACS        : 39 dataset rows, 35 declared.
//   ADC        : 3 dataset rows, 2 declared.
//   AIMS       : 1 dataset rows, 2 declared.
//   OTC        : 1 dataset rows, 1 declared.
//   CASA       : 3 dataset rows, 3 declared.
//   EA         : 0 dataset rows, 27 declared.
//   CPA        : 6 dataset rows, 6 declared.
//   CA-ANZ     : 0 dataset rows, 6 declared.
//   IPA        : 0 dataset rows, 6 declared.
//   AACA       : 0 dataset rows, 1 declared.
//
// ── Full list of uncovered occupations ──────────────────────────────────
// Grouped by the authority the dataset assigns; "(empty)" rows have a blank
// authority field. Format: ANZSCO code — occupation name.
//
//
// [Unknown] (903)
//   111212 — Chief Information Officer
//   111213 — Chief Technology Officer
//   111311 — Local Government Legislator
//   111312 — Member of Parliament
//   111399 — Legislators nec
//   121112 — Finance Manager
//   121113 — Payroll Manager
//   121114 — Supply and Distribution Manager
//   121212 — IT Project Manager
//   121216 — Mixed Crop Farmer
//   121217 — Sugar Cane Grower
//   121218 — Turf Grower
//   121221 — Vegetable Grower
//   121317 — Mixed Livestock Farmer
//   121321 — Poultry Farmer
//   121322 — Sheep Farmer
//   121323 — Mixed Cattle and Sheep Farmer
//   121399 — Livestock Farmers nec
//   121411 — Mixed Crop and Livestock Farmer
//   121511 — Cotton Grower
//   121512 — Grain, Oilseed, Pulse or Pasture Grower / Field Crop Grower
//   121513 — Sugar Cane Grower
//   121599 — Broadacre Crop Growers nec
//   121612 — Fruit Grower
//   121613 — Nut Grower
//   121614 — Production Nursery Grower
//   121615 — Turf Grower
//   121616 — Vegetable Grower (Aus) / Market Gardener (NZ)
//   121617 — Wine Grape Grower
//   121699 — Horticultural Crop Growers nec
//   121711 — Broadacre Crop and Livestock Farmer
//   121799 — Mixed Production Farmers nec
//   131111 — Construction Manager
//   131211 — Advertising Manager
//   131212 — Aquaculture Farmer
//   131213 — Horticultural Farmer
//   131214 — Livestock Farmer
//   131215 — Dairy Farmer
//   131312 — Project Manager (Engineering/Construction)
//   132212 — Industrial Relations Manager
//   132213 — Training and Development Manager
//   132312 — Research Officer
//   132313 — Program Officer
//   132411 — Policy and Planning Manager
//   133411 — Manufacturer
//   134212 — Nursing Clinical Director
//   134214 — Welfare Centre Manager
//   134311 — School Principal
//   134412 — Regional Education Manager
//   139111 — Commissioned Defence Force Officer
//   139112 — Commissioned Fire Officer
//   139113 — Commissioned Police Officer
//   139211 — Senior Non-commissioned Defence Force Member
//   139915 — Development Director
//   139916 — Quality Assurance Manager
//   139917 — Regulatory Affairs Manager
//   139999 — Managers nec
//   141411 — Licensed Club Manager
//   141912 — Retirement Village Manager
//   142115 — Post Office Manager
//   142116 — Travel Agency Manager
//   149113 — Sports Centre Manager
//   149213 — Hotel or Accommodation Manager
//   149214 — Caf? or Restaurant Manager
//   149215 — Retail Manager
//   149216 — Warehouse Manager
//   149412 — Railway Station Manager
//   149413 — Transport Company Manager
//   151111 — Environmental Manager
//   151112 — Forestry Manager
//   151113 — Conservation Manager
//   151114 — Land Reclamation Manager
//   151115 — Parks and Recreational Manager
//   211214 — Singer
//   211299 — Music Professionals nec
//   211311 — Photographer
//   211413 — Sculptor
//   212112 — Media Producer (excluding Video)
//   212113 — Radio Presenter
//   212114 — Television Presenter
//   212315 — Program Director (Television or Radio)
//   212316 — Stage Manager
//   212317 — Technical Director
//   212318 — Video Producer
//   212414 — Radio Journalist
//   212415 — Technical Writer
//   212416 — Television Journalist
//   212499 — Journalists and Other Writers nec
//   213111 — Psychologist
//   213211 — Social Worker
//   213212 — Counsellor
//   222213 — Stockbroking Dealer
//   224112 — Mathematician
//   224113 — Statistician
//   224116 — Statistician
//   224214 — Records Manager
//   224512 — Valuer
//   224713 — Management Consultant
//   224714 — Supply Chain Analyst
//   224912 — Liaison Officer
//   224913 — Migration Agent (Aus) \ Immigration Consultant (NZ)
//   224914 — Patents Examiner
//   225112 — Market Research Analyst
//   225115 — Public Relations Professional
//   225116 — Technical Writer
//   225312 — Media Producer
//   225313 — Photographer
//   225314 — Video Editor
//   225315 — Graphic Artist
//   225316 — Illustrator
//   225411 — Sales Representative (Industrial Products)
//   225413 — Real Estate Valuer
//   225414 — Property Consultant
//   231112 — Air Traffic Controller
//   231215 — Marine Surveyor
//   231299 — Marine Transport Professionals nec
//   231311 — Flying Instructor
//   231312 — Tour Guide
//   231411 — Helicopter Pilot
//   232112 — Landscape Architect
//   232113 — Landscape Architect
//   232114 — Town Planner
//   232115 — Urban Designer
//   232116 — Interior Designer
//   232211 — Landscape Architect
//   232215 — Industrial Designer
//   232216 — Web Designer
//   232314 — Orchestra Conductor
//   233114 — Telecommunications Engineer
//   233115 — Mining Engineer
//   233116 — Petroleum Engineer
//   233117 — Biomedical Engineer
//   233118 — Environmental Engineer
//   233119 — Software Engineer
//   233215 — Transport Engineer
//   233312 — Electronics Engineer
//   233313 — Power Systems Engineer
//   233412 — Industrial Engineer
//   233414 — Production Engineer
//   233513 — Production or Plant Engineer
//   233611 — Mining Engineer (excluding Petroleum)
//   233614 — Wind Turbine Technician
//   233615 — Solar Engineer
//   233616 — Renewable Energy Technician
//   233617 — Energy Engineer
//   233618 — Power Systems Engineer
//   233917 — Telecommunications Engineer
//   233918 — Mining Engineer
//   234214 — Ranger
//   234221 — Environmental Scientist
//   234222 — Ecological Scientist
//   234223 — Conservation Scientist
//   234224 — Marine Scientist
//   234225 — Meteorologist
//   234314 — Park Ranger
//   234512 — Anatomist
//   234517 — Microbiologist
//   234522 — Zoologist
//   234612 — Respiratory Scientist
//   234811 — Physicist
//   234812 — Astronomer
//   234813 — Geographer
//   234814 — Hydrologist
//   234912 — Metallurgist
//   234913 — Meteorologist
//   234916 — Research Scientist (General)
//   241112 — Kaiako Kohanga Reo (Māori Language Nest Teacher)
//   241211 — Primary School Teacher
//   241212 — Primary School Teacher
//   241311 — Middle School Teacher
//   241312 — Secondary School Teacher
//   241313 — Secondary School Teacher (English)
//   241314 — Secondary School Teacher (Mathematics)
//   241315 — Secondary School Teacher (Science)
//   241316 — Secondary School Teacher (Languages)
//   241513 — Teacher of the Sight Impaired
//   241514 — Special Education Teacher (Visually Impaired)
//   241515 — Special Education Teacher (Behaviour Disordered)
//   241516 — Special Education Teacher (Gifted Students)
//   241517 — Special Education Teacher (Speech and Language Disordered)
//   241599 — Special Education Teachers nec
//   241611 — Early Childhood Teacher
//   241612 — Preschool Teacher
//   241711 — Primary School Teacher (Art)
//   241712 — Primary School Teacher (English)
//   241713 — Primary School Teacher (Mathematics)
//   241714 — Primary School Teacher (Science)
//   241715 — Special Education Teacher
//   242212 — Registered Nurse Educator
//   242311 — Registered Training Organisation Manager
//   242312 — Training and Development Professional
//   249299 — Private Tutors and Teachers nec
//   251213 — Nuclear Medicine Technologist
//   251215 — Radiotherapy Technologist
//   251216 — Radiation Safety Officer
//   251217 — Nuclear Medicine Technician
//   251218 — Ultrasound Technician
//   251412 — Orthoptist
//   251611 — Optometrist
//   251711 — Orthoptist
//   251811 — Radiographer
//   251812 — Podiatrist
//   251813 — Medical Radiation Therapist
//   251814 — Sonographer
//   251913 — Veterinary Surgeon
//   251914 — Animal Health Technician
//   252113 — Osteopath
//   252114 — Reflexologist
//   252115 — Renal Technician
//   252116 — Dialysis Technician
//   252117 — Cardiology Technician
//   252118 — Respiratory Technician
//   252119 — Operating Theatre Technician
//   252120 — Anaesthetic Technician
//   252214 — Traditional Chinese Medicine Practitioner
//   252215 — Traditional Māori Health Practitioner
//   252313 — Homoeopath
//   252613 — Dietitian
//   252614 — Nutritionist
//   252712 — Speech Pathologist
//   252713 — Speech Pathologist
//   252811 — Psychologist (General)
//   252812 — Clinical Psychologist
//   252813 — Counselling Psychologist
//   252814 — Educational Psychologist
//   252815 — Organisational Psychologist
//   252816 — Sport and Exercise Psychologist
//   253311 — Specialist Physician (General Medicine)
//   253331 — Cardiologist
//   253332 — Dermatologist
//   253333 — Endocrinologist
//   253334 — Gastroenterologist
//   253335 — Nephrologist
//   253336 — Neurologist
//   253337 — Oncologist
//   253338 — Respiratory Medicine Specialist
//   253339 — Rheumatologist
//   253399 — Specialist Physicians nec
//   253412 — Forensic Psychiatrist
//   253413 — Child Psychiatrist
//   253518 — Urologist
//   253521 — Vascular Surgeon
//   253611 — Anaesthetist
//   253711 — Dentist
//   253712 — Dental Specialist
//   253812 — Optometrist
//   253813 — Ocularist
//   253915 — Pathologist
//   253918 — Radiation Oncologist
//   254111 — Midwife
//   254213 — Divisional Nurse Manager
//   254214 — Nurse Educator
//   254215 — Nurse Researcher
//   254216 — Registered Nurse (Critical Care and Emergency)
//   254217 — Registered Nurse (Family and Community Health)
//   254218 — Registered Nurse (Medical)
//   254219 — Registered Nurse (Perioperative)
//   254313 — Enrolled Nurse (Child and Family Health)
//   254314 — Enrolled Nurse (Community Health)
//   254315 — Enrolled Nurse (Developmental Disability)
//   254316 — Enrolled Nurse (Mental Health)
//   254317 — Enrolled Nurse (Surgical)
//   254318 — Enrolled Nurse (Mixed)
//   254319 — Enrolled Nurse (Assistive Care)
//   254399 — Enrolled Nurses nec
//   254417 — Registered Nurse (Disability and Rehabilitation)
//   254421 — Registered Nurse (Medical Practice)
//   254424 — Registered Nurse (Surgical)
//   254426 — Registered Nurse (Developmental Disability)
//   254427 — Registered Nurse (Mental Health)
//   254428 — Registered Nurse (Perioperative)
//   254511 — Registered Nurse (Palliative Care)
//   254512 — Registered Nurse (Rehabilitation)
//   254513 — Registered Nurse (Maternity)
//   254514 — Registered Nurse (Neonatal)
//   254515 — Registered Nurse (Paediatric)
//   254516 — Registered Nurse (Psychiatric)
//   254517 — Registered Nurse (Intensive Care Unit)
//   261113 — Software Architect
//   261321 — Database Designer
//   261322 — Data Engineer
//   261323 — Big Data Specialist
//   261324 — Data Scientist
//   261325 — Machine Learning Engineer
//   261326 — AI Engineer
//   261327 — Cloud Architect
//   261328 — DevOps Engineer
//   261329 — Site Reliability Engineer
//   261330 — Cyber Security Engineer
//   263214 — IT Operations Manager
//   263215 — Infrastructure Manager
//   263216 — Systems Manager
//   263217 — Service Manager
//   263218 — Help Desk Manager
//   263219 — User Support Manager
//   263220 — IT Support Supervisor
//   263221 — Technical Support Manager
//   263222 — Network Manager
//   263223 — Communications Manager
//   271212 — Magistrate
//   271213 — Tribunal Member
//   271214 — Intellectual Property Lawyer
//   271299 — Judicial and Other Legal Professionals nec
//   272115 — Student Counsellor
//   272211 — Minister of Religion
//   272313 — Organisational Psychologist
//   272315 — Sport and Exercise Psychologist
//   272499 — Social Professionals nec
//   272512 — Medical Social Worker
//   272612 — Recreation Officer
//   272613 — Welfare Worker
//   272614 — Welfare Worker (Child Protection)
//   272615 — Welfare Worker (Community Care)
//   272616 — Welfare Worker (Disability Support)
//   272617 — Welfare Worker (Aged Care)
//   272711 — Probation Officer
//   272712 — Welfare Officer
//   272713 — Community Worker
//   272714 — Youth Worker
//   272715 — Family Counsellor
//   281111 — Ship's Master
//   281112 — Ship's Officer
//   281113 — Marine Engineer
//   281114 — Fishing Vessel Master
//   281115 — Fishing Vessel Officer
//   282111 — Aeroplane Pilot
//   282112 — Helicopter Pilot
//   282113 — Aircraft Maintenance Engineer
//   282114 — Flight Engineer
//   282115 — Flying Instructor
//   282116 — Air Traffic Controller
//   311115 — Irrigation Designer
//   311214 — Operating Theatre Technician
//   311216 — Pathology Collector
//   311217 — Respiratory Technician
//   311299 — Medical Technicians nec
//   311313 — Quarantine Officer
//   311314 — Primary Products Quality Assurance Officer
//   311399 — Primary Products Assurance and Inspection Officers nec
//   311414 — School Laboratory Technician
//   311499 — Science Technicians nec
//   312115 — Plumbing Inspector
//   312116 — Surveying or Spatial Science Technician
//   312413 — Telecommunications Technician
//   312414 — ICT Technician
//   312415 — Network Technician
//   312611 — Safety Inspector
//   312612 — Mining Technician (Coal)
//   312613 — Mining Technician (Oil and Gas)
//   312711 — Petroleum Technician
//   312712 — Plumber (Drainage)
//   312713 — Plumber (Gasfitter)
//   312714 — Plumber (Roof Plumber)
//   312715 — Plumber (Apprentice)
//   312912 — Metallurgical or Materials Technician
//   312913 — Mine Deputy
//   312914 — Other Draftsperson
//   313211 — Radiocommunications Technician
//   313212 — Telecommunications Field Engineer
//   313299 — ICT Support and Test Technicians nec
//   321112 — Diesel Motor Mechanic
//   321113 — Motorcycle Mechanic
//   321114 — Small Engine Mechanic
//   321215 — Vehicle Service Adviser
//   321611 — Welding Machine Operator
//   321612 — Machine Tool Operator
//   321613 — Production Machine Operator
//   321614 — Factory Worker
//   321811 — Bricklayer
//   321812 — Stonemason
//   321813 — Stone Fixer
//   321814 — Carpenter and Joiner
//   322114 — Metal Casting Trades Worker
//   322115 — Metal Polisher
//   322211 — Sheetmetal Trades Worker
//   322311 — Metal Fabricator
//   323299 — Metal Fitters and Machinists nec
//   323316 — Watch and Clock Maker and Repairer
//   324111 — Panelbeater
//   324112 — Vehicle Trimmer
//   324113 — Vehicle Upholsterer
//   324213 — Vehicle Upholsterer
//   324299 — Vehicle and Related Trades Workers nec
//   331113 — Stone Fixer
//   331114 — Bricklayer (Apprentice)
//   331213 — Joiner
//   331214 — Roof Carpenter
//   331215 — Shopfitter
//   331216 — Timber Framer
//   331217 — Carpenter (Apprentice)
//   331299 — Carpenters and Joiners nec
//   332112 — Plumber
//   332113 — Plumber (Drainage)
//   332114 — Plumber (Gasfitter)
//   332115 — Plumber (Roof Plumber)
//   332116 — Plumber (Apprentice)
//   332212 — Painter
//   332213 — Painter (Apprentice)
//   332311 — Plasterer
//   332312 — Solid Plasterer
//   332313 — Fibrous Plasterer
//   332314 — Plasterer (Apprentice)
//   333112 — Glazier (Apprentice)
//   333299 — Plastering Trades Workers nec
//   334116 — Plumber (General)
//   334199 — Plumbers and Related Trades Workers nec
//   341811 — Sports Coach
//   341812 — Fitness Instructor
//   341813 — Recreation Officer
//   341814 — Aquatic Officer
//   342111 — Airconditioning and Refrigeration Mechanic
//   342112 — Airconditioning and Refrigeration Mechanic (Apprentice)
//   342212 — Technical Cable Jointer
//   342213 — Manufacturing Machine Operator
//   342214 — Plastics Machine Operator
//   342399 — Electronics and Telecommunications Trades Workers nec
//   342413 — Telecommunications Linesworker
//   342511 — Telephone Installer
//   342512 — Cable Installer
//   342513 — NBN Installer
//   342514 — Broadband Technician
//   343111 — Telecommunications Linesworker
//   343112 — Cable Jointer
//   343113 — Telephone Technician
//   343114 — Submarine Cable Technician
//   344111 — Locksmith
//   344112 — Locksmith (Apprentice)
//   344199 — Locksmiths and Safe Specialists nec
//   351113 — Baker (Apprentice)
//   351312 — Chef (Apprentice)
//   351313 — Head Chef
//   351412 — Cook (Apprentice)
//   351413 — Kitchen Hand
//   352111 — Fishmonger
//   352112 — Delicatessen Counter Assistant
//   352113 — Greengrocer
//   352114 — Produce Merchant
//   361113 — Pet Groomer
//   361114 — Zookeeper
//   361115 — Kennel Hand
//   361116 — Track Rider
//   361211 — Shearer
//   362312 — Sports Turf Manager
//   362313 — Sports Turf Trades Worker
//   362411 — Nurseryperson
//   362512 — Tree Worker
//   362611 — Gardener (General)
//   362711 — Landscape Gardener
//   362712 — Irrigation Technician
//   363111 — Aquaculture Supervisor
//   363112 — Fishing Leading Hand
//   363113 — Forestry Operations Supervisor
//   363114 — Horticultural Supervisor or Specialist
//   363115 — Senior Broadacre Crop and Livestock Farm Worker
//   363116 — Senior Broadacre Crop Farm Worker
//   363117 — Vineyard Supervisor
//   363199 — Senior Aquaculture, Crop and Forestry Workers nec
//   363211 — Senior Beef Cattle Station Worker
//   363212 — Senior Cattle and Sheep Farm Worker
//   363213 — Senior Dairy Cattle Farm Worker
//   363214 — Senior Piggery Stockperson
//   363215 — Senior Sheep Farm Worker
//   363299 — Senior Livestock Farm Workers nec
//   363311 — Shearer
//   363312 — Wool Classer
//   391112 — Structural Steel Worker
//   391113 — Metal Worker
//   391114 — Boilermaker
//   391211 — Printer
//   391212 — Printing Machine Operator
//   391213 — Bookbinder
//   391214 — Lithographer
//   391311 — Refrigeration Mechanic
//   391312 — Air Conditioning Mechanic
//   391313 — Gas Fitter
//   391314 — Pump Operator
//   392111 — Print Finisher
//   392112 — Screen Printer
//   392312 — Small Offset Printer
//   393112 — Leather Goods Maker
//   393113 — Sail Maker
//   393114 — Shoemaker
//   394199 — Wood Trades Workers nec
//   394212 — Picture Framer
//   394213 — Wood Machinist
//   394214 — Wood Turner
//   394299 — Wood Machinists and Other Wood Trades Workers nec
//   395111 — Upholsterer
//   395112 — Upholsterer (Apprentice)
//   396111 — Sheetmetal Worker
//   396112 — Welder
//   399112 — Shipwright
//   399113 — Fishing Guide
//   399114 — Game Keeper
//   399115 — Forestry Worker
//   399312 — Library Technician
//   399514 — Make Up Artist
//   399515 — Musical Instrument Maker or Repairer
//   399516 — Sound Technician
//   399517 — Television Equipment Operator
//   399599 — Performing Arts Technicians nec
//   399611 — Signwriter
//   399914 — Optical Mechanic
//   399915 — Photographer's Assistant
//   399916 — Plastics Technician
//   399917 — Wool Classer
//   399999 — Technicians and Trades Workers nec
//   411121 — Sales Assistant (General)
//   411122 — Retail Salesperson
//   411123 — Service Station Assistant
//   411124 — Shop Assistant
//   411312 — Childcare Assistant
//   411412 — Mothercraft Nurse
//   411512 — Carer
//   411612 — Taxi Driver
//   411613 — Truck Driver
//   411614 — Heavy Vehicle Driver
//   411715 — Residential Care Officer
//   421113 — Accounts Clerk
//   421114 — Out of School Hours Care Worker
//   421115 — Accounts Receivable Specialist
//   421116 — Bookkeeper
//   422111 — Aboriginal and Torres Strait Islander Education Worker
//   422112 — Integration Aide
//   422113 — Kaiāwhina Kohanga Reo (Māori Language Nest Assistant)
//   422114 — Kaiāwhina Kura Kaupapa Māori (Māori-medium School Assistant)
//   422115 — Preschool Aide
//   422116 — Teachers' Aide
//   423111 — Aged or Disabled Carer
//   423211 — Dental Assistant
//   423312 — Nursing Support Worker
//   423313 — Personal Care Assistant
//   423314 — Therapy Aide
//   423411 — Child or Youth Residential Care Assistant
//   423412 — Hostel Parent
//   423413 — Refuge Worker
//   431111 — General Construction Worker
//   431112 — Bricklayer Assistant
//   431113 — Carpenter Assistant
//   431114 — Painter Assistant
//   431115 — Plasterer Assistant
//   431116 — Plumber Assistant
//   431211 — Cafe Worker
//   431311 — Gaming Worker
//   431511 — Waiter
//   431911 — Bar Useful or Busser
//   431912 — Doorperson or Luggage Porter
//   431999 — Hospitality Workers nec
//   441212 — Fire Fighter
//   442212 — Armoured Car Escort
//   442213 — Crowd Controller
//   442214 — Private Investigator
//   442215 — Retail Loss Prevention Officer
//   442216 — Security Consultant
//   442217 — Security Officer
//   442299 — Security Officers and Guards nec
//   451112 — Waiter
//   451113 — Bartender
//   451114 — Housekeeper
//   451115 — Chambermaid
//   451116 — Cleaner
//   451212 — Hairdressing Assistant
//   451312 — Beautician
//   451411 — Massage Therapist
//   451412 — Tour Guide
//   451511 — Prison Officer
//   451512 — Protective Officer
//   451513 — Security Guard
//   451514 — Security Consultant
//   451515 — Firefighter
//   451611 — Tourist Information Officer
//   451621 — Accommodation Officer
//   451622 — Housekeeping Manager
//   451623 — Housekeeper
//   451624 — Linen Worker
//   451712 — Commercial Cleaning Supervisor
//   451799 — Travel Attendants nec
//   451811 — Civil Celebrant
//   451812 — Hair or Beauty Salon Assistant
//   451813 — Sex Worker or Escort
//   451814 — Body Artist
//   451816 — Religious Assistant
//   451899 — Personal Service Workers nec
//   452111 — Chef
//   452112 — Cook
//   452113 — Baker
//   452114 — Pastrycook
//   452115 — Butcher
//   452211 — Bungy Jump Master
//   452212 — Fishing Guide
//   452213 — Hunting Guide
//   452214 — Mountain or Glacier Guide
//   452215 — Outdoor Adventure Instructor
//   452216 — Trekking Guide
//   452217 — Whitewater Rafting Guide
//   452299 — Outdoor Adventure Guides nec
//   452317 — Other Sports Coach or Instructor
//   452321 — Sports Development Officer
//   452322 — Sports Umpire
//   452323 — Other Sports Official
//   452413 — Jockey
//   452414 — Lifeguard
//   452499 — Sportspersons nec
//   512299 — Practice Managers nec
//   521211 — Secretary (General)
//   521212 — Legal Secretary
//   531111 — General Clerk
//   532111 — Data Entry Operator
//   532112 — Machine Shorthand Reporter
//   532113 — Word Processing Operator
//   541112 — Call or Contact Centre Operator
//   541211 — Information Officer
//   542112 — Admissions Clerk
//   542113 — Hotel or Motel Receptionist
//   542114 — Medical Receptionist
//   551111 — Accounts Clerk
//   551112 — Cost Clerk
//   551211 — Bookkeeper
//   551311 — Payroll Clerk
//   552111 — Bank Worker
//   552211 — Credit or Loans Officer (Aus) / Finance Clerk (NZ)
//   552311 — Bookmaker
//   552312 — Insurance Consultant
//   552313 — Money Market Clerk
//   552314 — Statistical Clerk
//   561111 — Betting Agency Counter Clerk
//   561112 — Bookmaker's Clerk
//   561113 — Telephone Betting Clerk
//   561199 — Betting Clerks nec
//   561211 — Courier
//   561212 — Postal Delivery Officer
//   561311 — Filing or Registry Clerk
//   561411 — Mail Clerk
//   561412 — Postal Sorting Officer
//   561511 — Survey Interviewer
//   561611 — Switchboard Operator
//   561911 — Classified Advertising Clerk
//   561912 — Meter Reader
//   561913 — Parking Inspector
//   561999 — Clerical and Office Support Workers nec
//   591112 — Production Clerk
//   591113 — Purchasing Officer
//   591115 — Stock Clerk
//   591116 — Warehouse Administrator
//   591117 — Order Clerk
//   591211 — Despatching and Receiving Clerk
//   591212 — Import-Export Clerk
//   599112 — Legal Executive
//   599214 — Law Clerk
//   599215 — Trust Officer
//   599411 — Human Resource Clerk
//   599511 — Customs Officer
//   599512 — Immigration Officer
//   599513 — Motor Vehicle Licence Examiner
//   599514 — Invasive Pest, Weed and Disease Inspector
//   599515 — Social Security Assessor
//   599516 — Taxation Inspector
//   599517 — Train Examiner
//   599518 — Transport Operations Inspector
//   599521 — Water Inspector
//   599599 — Inspectors and Regulatory Officers nec
//   599711 — Library Assistant
//   599912 — Production Assistant (Film, Television, Radio or Stage)
//   599913 — Proof Reader
//   599914 — Radio Despatcher
//   599916 — Facilities Administrator
//   599999 — Clerical and Administrative Workers nec
//   611112 — Stock and Station Agent
//   611311 — Sales Representative (Building and Plumbing Supplies)
//   611312 — Sales Representative (Business Services)
//   611313 — Sales Representative (Motor Vehicle Parts and Accessories)
//   611314 — Sales Representative (Personal and Household Goods)
//   611399 — Sales Representatives nec
//   612113 — Real Estate Agency Principal (Aus) \ Real Estate Agency Licensee (NZ)
//   612114 — Real Estate Agent
//   621111 — Sales Assistant (General)
//   621211 — ICT Sales Assistant
//   621311 — Motor Vehicle or Caravan Salesperson
//   621312 — Motor Vehicle Parts Interpreter / Automotive Parts Salesperson
//   621511 — Retail Supervisor
//   621611 — Service Station Attendant
//   621711 — Cash Van Salesperson
//   621712 — Door-to-door Salesperson
//   621713 — Street Vendor
//   621911 — Materials Recycler
//   621912 — Rental Salesperson
//   621999 — Sales Assistants and Salespersons nec
//   631111 — Checkout Operator
//   631112 — Office Cashier
//   639111 — Model
//   639112 — Sales Demonstrator
//   639211 — Retail Buyer
//   639212 — Wool Buyer
//   639311 — Telemarketer
//   639411 — Ticket Seller
//   639412 — Transport Conductor
//   639511 — Visual Merchandiser
//   639911 — Other Sales Support Worker
//   711111 — Clay Products Machine Operator
//   711112 — Concrete Products Machine Operator
//   711113 — Glass Production Machine Operator
//   711114 — Stone Processing Machine Operator
//   711199 — Clay, Concrete, Glass and Stone Processing Machine Operators nec
//   711211 — Industrial Spraypainter
//   711311 — Paper Products Machine Operator
//   711313 — Sawmilling Operator
//   711314 — Other Wood Processing Machine Operator
//   711411 — Photographic Developer and Printer
//   711511 — Plastic Cablemaking Machine Operator
//   711512 — Plastic Compounding and Reclamation Machine Operator
//   711513 — Plastics Fabricator or Welder
//   711514 — Plastics Production Machine Operator (General)
//   711515 — Reinforced Plastic and Composite Production Worker
//   711516 — Rubber Production Machine Operator
//   711599 — Plastics and Rubber Production Machine Operators nec
//   711611 — Sewing Machinist
//   711711 — Footwear Production Machine Operator
//   711712 — Hide and Skin Processing Machine Operator
//   711713 — Knitting Machine Operator
//   711714 — Textile Dyeing and Finishing Machine Operator
//   711715 — Weaving Machine Operator
//   711716 — Yarn Carding and Spinning Machine Operator
//   711799 — Textile and Footwear Production Machine Operators nec
//   711911 — Chemical Production Machine Operator
//   711912 — Motion Picture Projectionist
//   711913 — Sand Blaster
//   711914 — Sterilisation Technician
//   711999 — Machine Operators nec
//   712111 — Crane, Hoist or Lift Operator
//   712211 — Driller
//   712212 — Miner
//   712213 — Shot Firer
//   712311 — Engineering Production Worker
//   712911 — Boiler or Engine Operator
//   712912 — Bulk Materials Handling Plant Operator
//   712913 — Cement Production Plant Operator
//   712914 — Concrete Batching Plant Operator
//   712915 — Concrete Pump Operator
//   712916 — Paper and Pulp Mill Operator
//   712917 — Railway Signal Operator
//   712918 — Train Controller
//   712921 — Waste Water or Water Plant Operator
//   712922 — Weighbridge Operator
//   712999 — Stationary Plant Operators nec
//   721111 — Agricultural and Horticultural Mobile Plant Operator
//   721112 — Logging Plant Operator
//   721211 — Earthmoving Plant Operator (General)
//   721212 — Backhoe Operator
//   721213 — Bulldozer Operator
//   721214 — Excavator Operator
//   721215 — Grader Operator
//   721216 — Loader Operator
//   721311 — Forklift Driver
//   721911 — Aircraft Baggage Handler and Airline Ground Crew
//   721912 — Linemarker
//   721913 — Paving Plant Operator
//   721914 — Railway Track Plant Operator
//   721915 — Road Roller Operator
//   721916 — Streetsweeper Operator
//   721999 — Mobile Plant Operators nec
//   731111 — Chauffeur
//   731112 — Taxi Driver
//   731199 — Automobile Drivers nec
//   731211 — Bus Driver
//   731212 — Charter and Tour Bus Driver
//   731213 — Passenger Coach Driver
//   731311 — Train Driver
//   731312 — Tram Driver
//   732111 — Delivery Driver
//   733114 — Tanker Driver
//   733115 — Tow Truck Driver
//   741111 — Storeperson
//   811111 — Car Detailer
//   811211 — Commercial Cleaner
//   811311 — Domestic Cleaner
//   811411 — Commercial Housekeeper
//   811412 — Domestic Housekeeper
//   811511 — Laundry Worker (General)
//   811512 — Drycleaner
//   811513 — Ironer or Presser
//   811611 — Carpet Cleaner
//   811612 — Window Cleaner
//   811699 — Cleaners nec
//   821112 — Drainage, Sewerage and Stormwater Labourer
//   821113 — Earthmoving Labourer
//   821114 — Plumber's Assistant
//   821211 — Concreter
//   821311 — Fencer
//   821411 — Building Insulation Installer
//   821412 — Home Improvement Installer
//   821511 — Paving and Surfacing Labourer
//   821711 — Construction Rigger
//   821712 — Scaffolder
//   821713 — Steel Fixer
//   821714 — Structural Steel Erector
//   821911 — Crane Chaser
//   821912 — Driller's Assistant
//   821913 — Lagger
//   821914 — Mining Support Worker
//   821915 — Surveyor's Assistant
//   831111 — Baking Factory Worker
//   831112 — Brewery Worker
//   831113 — Confectionery Maker
//   831114 — Dairy Products Maker
//   831115 — Fruit and Vegetable Factory Worker
//   831116 — Grain Mill Worker
//   831117 — Sugar Mill Worker
//   831118 — Winery Cellar Hand
//   831199 — Food and Drink Factory Workers nec
//   831211 — Meat Boner and Slicer
//   831212 — Slaughterer
//   831311 — Meat Process Worker
//   831312 — Poultry Process Worker
//   831313 — Seafood Process Worker
//   832111 — Chocolate Packer
//   832112 — Container Filler
//   832113 — Fruit and Vegetable Packer
//   832114 — Meat Packer
//   832115 — Seafood Packer
//   832199 — Packers nec
//   832211 — Product Assembler
//   839111 — Metal Engineering Process Worker
//   839211 — Plastics Factory Worker
//   839212 — Rubber Factory Worker
//   839311 — Product Examiner
//   839312 — Product Grader
//   839313 — Product Tester
//   839411 — Paper and Pulp Mill Worker
//   839412 — Sawmill or Timber Yard Worker
//   839413 — Wood and Wood Products Factory Worker
//   839912 — Chemical Plant Worker
//   839913 — Clay Processing Factory Worker
//   839914 — Fabric and Textile Factory Worker
//   839915 — Footwear Factory Worker
//   839916 — Glass Processing Worker
//   839917 — Hide and Skin Processing Worker
//   839918 — Recycling Worker
//   839999 — Factory Process Workers nec
//   842111 — Aquaculture Worker
//   842211 — Cotton Farm Worker
//   842212 — Fruit Farm Worker
//   842213 — Fruit Picker
//   842214 — Grain, Oilseed, Pulse and Pasture Farm Worker (Aus) / Field Farm Worker (NZ)
//   842215 — Mushroom Picker
//   842216 — Nut Farm Worker
//   842217 — Sugar Cane Farm Worker
//   842218 — Vegetable Farm Worker (Aus) / Market Garden Worker (NZ)
//   842221 — Vegetable Picker
//   842222 — Vineyard Worker
//   842299 — Crop Farm Workers nec
//   842311 — Beef Cattle Farm Worker
//   842312 — Cattle and Sheep Farm Worker
//   842313 — Dairy Cattle Farm Worker
//   842314 — Livestock Husbandry Worker
//   842315 — Piggery Farm Worker
//   842316 — Poultry Farm Worker
//   842317 — Sheep Farm Worker
//   842318 — Stablehand
//   842321 — Wool Handler
//   842399 — Livestock Farm Workers nec
//   842411 — Broadacre Crop and Livestock Farm Worker
//   842499 — Mixed Production Farm Workers nec
//   843111 — Forestry Worker
//   843113 — Tree Faller
//   843211 — Garden Labourer
//   843311 — Horticultural Nursery Assistant
//   843411 — Pest Control Technician
//   843911 — Hunter-Trapper
//   843912 — Irrigation Assistant
//   843999 — Forestry and Garden Workers nec
//   851111 — Fast Food Cook
//   851211 — Pastrycook's Assistant
//   851299 — Food Trades Assistants nec
//   851311 — Kitchenhand
//   891111 — Freight Handler (Rail or Road)
//   891112 — Truck Driver's Offsider
//   891113 — Waterside Worker
//   891211 — Shelf Filler
//   899111 — Caretaker
//   899211 — Deck Hand
//   899212 — Fishing Hand
//   899311 — Handyperson
//   899411 — Motor Vehicle Parts and Accessories Fitter (General)
//   899412 — Autoglazier
//   899413 — Exhaust and Muffler Repairer
//   899414 — Radiator Repairer
//   899415 — Tyre Fitter
//   899511 — Printer's Assistant
//   899512 — Printing Table Worker
//   899611 — Recycling or Rubbish Collector
//   899711 — Vending Machine Attendant
//   899911 — Bicycle Mechanic
//   899912 — Car Park Attendant
//   899913 — Crossing Supervisor
//   899914 — Electrical or Telecommunications Trades Assistant
//   899915 — Leaflet or Newspaper Deliverer
//   899916 — Mechanic's Assistant
//   899917 — Railways Assistant
//   899918 — Sign Erector
//   899921 — Ticket Collector or Usher
//   899922 — Trolley Collector
//   899923 — Road Traffic Controller
//   899999 — Labourers nec
//
// [VETASSESS] (267)
//   121111 — Aquaculture Farmer
//   121211 — Cotton Grower
//   121213 — Fruit or Nut Grower
//   121214 — Grain, Oilseed or Pasture Grower
//   121215 — Grape Grower
//   121299 — Crop Farmers nec
//   121311 — Apiarist
//   121312 — Beef Cattle Farmer
//   121313 — Dairy Cattle Farmer
//   121314 — Deer Farmer
//   121315 — Goat Farmer
//   121316 — Horse Breeder
//   121318 — Pig Farmer
//   121319 — Poultry Farmer
//   121611 — Flower Grower
//   131112 — Sales and Marketing Manager
//   131114 — Public Relations Manager
//   132111 — Corporate Services Manager
//   132511 — Research and Development Manager
//   133111 — Construction Project Manager
//   133112 — Project Builder
//   133311 — Importer or Exporter
//   133312 — Wholesaler
//   133511 — Production Manager (Forestry)
//   133512 — Production Manager (Manufacturing)
//   133513 — Production Manager (Mining)
//   133611 — Supply and Distribution Manager
//   133612 — Procurement Manager
//   134299 — Health and Welfare Services Managers nec
//   134499 — Education Managers nec
//   139911 — Arts Administrator or Manager
//   139912 — Environmental Manager
//   139913 — Laboratory Manager
//   139914 — Project Director
//   141111 — Cafe or Restaurant Manager
//   141211 — Caravan Park and Camping Ground Manager
//   141311 — Hotel or Motel Manager
//   141911 — Bed and Breakfast Operator
//   141999 — Accommodation and Hospitality Managers nec
//   142111 — Retail Manager (General)
//   142112 — Antique Dealer
//   142113 — Betting Agency Manager
//   142114 — Hair or Beauty Salon Manager
//   149111 — Amusement Centre Manager
//   149112 — Fitness Centre Manager
//   149211 — Call or Contact Centre Manager
//   149212 — Customer Service Manager
//   149311 — Conference and Event Organiser
//   149411 — Fleet Manager
//   149911 — Boarding Kennel or Cattery Operator
//   149912 — Cinema or Theatre Manager
//   149913 — Facilities Manager
//   149914 — Financial Institution Branch Manager
//   149915 — Equipment Hire Manager
//   149999 — Hospitality, Retail and Service Managers nec
//   211111 — Actor
//   211112 — Dancer or Choreographer
//   211113 — Entertainer or Variety Artist
//   211199 — Actors, Dancers and Other Entertainers nec
//   211211 — Composer
//   211212 — Music Director
//   211213 — Musician (Instrumental)
//   211411 — Painter (Visual Arts)
//   211412 — Potter or Ceramic Artist
//   211499 — Visual Arts and Crafts Professionals nec
//   212111 — Artistic Director
//   212211 — Author
//   212212 — Book or Script Editor
//   212311 — Art Director (Film, Television or Stage)
//   212312 — Director (Film, Television, Radio or Stage)
//   212313 — Director of Photography
//   212314 — Film and Video Editor
//   212399 — Film, Television, Radio and Stage Directors nec
//   212411 — Copywriter
//   212412 — Newspaper or Periodical Editor
//   212413 — Print Journalist
//   221211 — Company Secretary
//   222111 — Commodities Trader
//   222112 — Finance Broker
//   222113 — Insurance Broker
//   222199 — Financial Brokers nec
//   222211 — Financial Market Dealer
//   222212 — Futures Trader
//   222299 — Financial Dealers nec
//   222311 — Financial Investment Adviser
//   222312 — Financial Investment Manager
//   222313 — Investment Adviser
//   223111 — Human Resource Adviser
//   223112 — Recruitment Consultant
//   223113 — Workplace Relations Adviser
//   223311 — Training and Development Professional
//   224111 — Actuary
//   224211 — Archivist
//   224212 — Gallery or Museum Curator
//   224213 — Health Information Manager
//   224311 — Economist
//   224411 — Intelligence Officer
//   224412 — Policy Analyst
//   224511 — Land Economist
//   224712 — Organisation and Methods Analyst
//   224911 — Electorate Officer
//   225111 — Advertising Specialist
//   225113 — Marketing Specialist
//   225114 — Content Creator (Marketing)
//   225213 — ICT Sales Representative
//   225311 — Public Relations Professional
//   225412 — Sales Representative (Medical and Pharmaceutical Products)
//   225499 — Technical Sales Representatives nec
//   231199 — Air Transport Professionals nec
//   232213 — Cartographer
//   232311 — Fashion Designer
//   232312 — Industrial Designer
//   232313 — Jewellery Designer
//   232411 — Graphic Designer
//   232412 — Illustrator
//   232413 — Multimedia Designer
//   232414 — Web Designer
//   232511 — Interior Designer
//   232611 — Urban and Regional Planner
//   234111 — Agricultural Consultant
//   234112 — Agricultural Scientist
//   234113 — Forester
//   234114 — Agricultural Research Scientist
//   234115 — Agronomist
//   234116 — Aquaculture or Fisheries Scientist
//   234211 — Chemist
//   234212 — Food Technologist
//   234213 — Wine Maker
//   234311 — Conservation Officer
//   234312 — Environmental Consultant
//   234313 — Environmental Research Scientist
//   234399 — Environmental Scientists nec
//   234411 — Geologist
//   234412 — Geophysicist
//   234413 — Hydrogeologist
//   234511 — Life Scientist (General)
//   234513 — Biochemist
//   234514 — Biotechnologist
//   234515 — Botanist
//   234516 — Marine Biologist
//   234518 — Zoologist
//   234521 — Entomologist
//   234599 — Life Scientists nec
//   234911 — Conservator
//   234914 — Physicist
//   234915 — Exercise Physiologist
//   234999 — Natural and Physical Science Professionals nec
//   242111 — University Lecturer
//   242112 — University Tutor
//   249111 — Education Adviser
//   249112 — Education Reviewer
//   249211 — Art Teacher (Private Tuition)
//   249212 — Dance Teacher (Private Tuition)
//   249213 — Drama Teacher (Private Tuition)
//   249214 — Music Teacher (Private Tuition)
//   249311 — Teacher of English to Speakers of Other Languages
//   251112 — Nutritionist
//   251311 — Environmental Health Officer
//   251312 — Occupational Health and Safety Adviser
//   251911 — Health Promotion Officer
//   251999 — Health Diagnostic and Promotion Professionals nec
//   252111 — Chiropractor
//   252112 — Osteopath
//   252212 — Homoeopath
//   252213 — Naturopath
//   252299 — Complementary Health Therapists nec
//   252711 — Audiologist
//   252999 — Therapist nec
//   272112 — Drug and Alcohol Counsellor
//   272113 — Family and Marriage Counsellor
//   272114 — Rehabilitation Counsellor
//   272199 — Counsellors nec
//   272411 — Historian
//   272413 — Translator
//   272414 — Archaeologist
//   272415 — Sociologist
//   272611 — Community Arts Worker
//   311111 — Agricultural Technician
//   311112 — Agricultural and Agritech Technician
//   311113 — Animal Husbandry Technician
//   311114 — Aquaculture or Fisheries Technician
//   311211 — Anaesthetic Technician
//   311212 — Cardiac Technician
//   311215 — Pharmacy Technician
//   311311 — Fisheries Officer
//   311312 — Meat Inspector
//   311411 — Chemistry Technician
//   311412 — Earth Science Technician
//   311413 — Life Science Technician
//   311415 — Hydrographer
//   312111 — Architectural Draftsperson
//   312112 — Building Associate
//   312113 — Building Inspector
//   312114 — Construction Estimator
//   312199 — Architectural, Building and Surveying Technicians nec
//   312212 — Civil Engineering Technician
//   312911 — Maintenance Planner
//   312999 — Building and Engineering Technicians nec
//   361111 — Dog Handler or Trainer
//   361199 — Animal Attendants and Trainers nec
//   361311 — Veterinary Nurse
//   393299 — Clothing Trades Workers nec
//   399311 — Gallery or Museum Technician
//   399411 — Jeweller
//   399412 — Optical Mechanic
//   399512 — Camera Operator (Film, Television or Video)
//   399911 — Diver
//   411211 — Dental Hygienist
//   411212 — Dental Prosthetist
//   411214 — Dental Therapist
//   411311 — Diversional Therapist
//   411511 — Aboriginal and Torres Strait Islander Health Worker
//   411611 — Massage Therapist
//   411714 — Parole or Probation Officer
//   421112 — Accounting Technician
//   423311 — Hospital Orderly
//   431411 — Hotel Service Manager
//   441211 — Emergency Service Worker
//   441311 — Detective
//   441312 — Police Officer
//   442111 — Prison Officer
//   442211 — Alarm, Security or Surveillance Monitor
//   451111 — Beauty Therapist
//   451211 — Driving Instructor
//   451311 — Funeral Director
//   451399 — Funeral Workers nec
//   451612 — Travel Consultant
//   451711 — Flight Attendant
//   451815 — First Aid Trainer
//   452311 — Diving Instructor (Open Water)
//   452312 — Gymnastics Coach or Instructor
//   452313 — Horse Riding Coach or Instructor
//   452314 — Snowsport Instructor
//   452315 — Swimming Coach or Instructor
//   452316 — Tennis Coach
//   452318 — Dog or Horse Racing Official
//   452411 — Footballer
//   452412 — Golfer
//   452912 — Outdoor Adventure Guide
//   511111 — Contract Administrator
//   511112 — Program or Project Administrator
//   512111 — Office Manager
//   512211 — Health Practice Manager
//   521111 — Personal Assistant
//   541111 — Call or Contact Centre Team Leader
//   542111 — Receptionist (General)
//   542211 — Typist
//   591111 — Logistics Clerk
//   591114 — Purchasing Officer
//   599111 — Conveyancer
//   599211 — Clerk of Court
//   599212 — Court Bailiff or Sheriff (Aus) \ Court Collections Officer (NZ)
//   599213 — Court Orderly (Aus) \ Court Registry Officer (NZ)
//   599311 — Debt Collector
//   599611 — Insurance Investigator
//   599612 — Insurance Loss Adjuster
//   599613 — Insurance Risk Surveyor
//   599915 — Clinical Coder
//   611111 — Auctioneer
//   611211 — Insurance Agent
//   612111 — Business Broker
//   612112 — Property Manager
//   612115 — Real Estate Representative
//   621411 — Pharmacy Sales Assistant
//   733112 — Aircraft Refueller
//   733113 — Furniture Removalist
//   839911 — Cement and Concrete Plant Worker
//
// [TRA] (93)
//   242211 — Vocational Education Teacher
//   313213 — Telecommunications Network Planner
//   313214 — Telecommunications Technical Officer or Technologist
//   321111 — Automotive Electrician
//   321212 — Diesel Motor Mechanic
//   321213 — Motorcycle Mechanic
//   321214 — Small Engine Mechanic
//   322111 — Blacksmith
//   322112 — Electroplater
//   322113 — Farrier
//   322312 — Pressure Welder
//   322313 — Welder (First Class)
//   323111 — Aircraft Maintenance Engineer (Avionics)
//   323112 — Aircraft Maintenance Engineer (Mechanical)
//   323113 — Aircraft Maintenance Engineer (Structures)
//   323211 — Fitter (General)
//   323212 — Fitter and Turner
//   323213 — Fitter-Welder
//   323214 — Metal Machinist (First Class)
//   323215 — Textile, Clothing and Footwear Mechanic
//   323311 — Engraver
//   323312 — Gunsmith
//   323313 — Locksmith
//   323314 — Precision Instrument Maker and Repairer
//   323315 — Saw Doctor
//   323411 — Engineering Patternmaker
//   323412 — Toolmaker
//   324211 — Vehicle Body Builder
//   324212 — Vehicle Trimmer
//   324311 — Vehicle Painter
//   331111 — Bricklayer
//   331112 — Stonemason
//   331211 — Carpenter and Joiner
//   332111 — Floor Finisher
//   332211 — Painter
//   332299 — Painting Trades Workers nec
//   333111 — Glazier
//   333211 — Fibrous Plasterer
//   333212 — Renderer (Solid Plaster)
//   333311 — Roof Tiler
//   333411 — Wall and Floor Tiler
//   334112 — Airconditioning and Mechanical Services Plumber
//   334113 — Drainer
//   334114 — Gasfitter
//   334115 — Roof Plumber
//   334117 — Fire Protection Plumber
//   341112 — Electrician (Special Class)
//   341113 — Lift Mechanic
//   342211 — Electrical Linesworker
//   342311 — Business Machine Mechanic
//   342312 — Communications Operator
//   342313 — Electronic Equipment Trades Worker
//   342314 — Electronic Instrument Trades Worker (General)
//   342315 — Electronic Instrument Trades Worker (Special Class)
//   342411 — Cabler (Data and Telecommunications)
//   342412 — Telecommunications Cable Jointer
//   342414 — Telecommunications Technician
//   351111 — Baker
//   351112 — Pastrycook
//   351211 — Butcher or Smallgoods Maker
//   361112 — Horse Trainer
//   362111 — Florist
//   362211 — Gardener (General)
//   362212 — Landscape Gardener
//   362311 — Greenkeeper
//   362511 — Arborist
//   391111 — Hairdresser
//   392211 — Graphic Pre-press Trades Worker
//   392212 — Print Finisher
//   392213 — Printer
//   392214 — Printing Machinist
//   392311 — Printing Machinist
//   393111 — Canvas Goods Fabricator
//   393211 — Apparel Cutter
//   393212 — Clothing Patternmaker
//   393213 — Dressmaker or Tailor
//   393311 — Upholsterer
//   394111 — Cabinetmaker
//   394112 — Cabinet Maker
//   394113 — Furniture Maker
//   394211 — Furniture Finisher
//   399111 — Boat Builder and Repairer
//   399211 — Chemical Plant Operator
//   399212 — Gas or Petroleum Operator
//   399213 — Power Generation Plant Operator
//   399214 — Power Generation Plant Operator
//   399513 — Light Technician
//   399913 — Optical Dispenser (Aus) \ Dispensing Optician (NZ)
//   399918 — Fire Protection Equipment Technician
//   411213 — Dental Technician
//   821111 — Builder's Labourer
//   821611 — Railway Track Worker
//   843112 — Logging Assistant
//
// [MedBA] (34)
//   134211 — Medical Administrator
//   253111 — General Practitioner
//   253112 — Resident Medical Officer
//   253211 — Anaesthetist
//   253312 — Cardiologist
//   253313 — Clinical Haematologist
//   253314 — Medical Oncologist
//   253315 — Endocrinologist
//   253316 — Gastroenterologist
//   253317 — Intensive Care Specialist
//   253318 — Neurologist
//   253319 — Specialist Physician (Nephrology)
//   253321 — Paediatrician
//   253322 — Renal Medicine Specialist
//   253323 — Rheumatologist
//   253324 — Thoracic Medicine Specialist
//   253325 — Pathologist
//   253326 — Radiation Oncologist
//   253327 — Renal Medicine Specialist
//   253328 — Rheumatologist
//   253411 — Psychiatrist
//   253511 — Surgeon (General)
//   253512 — Cardiothoracic Surgeon
//   253513 — Neurosurgeon
//   253514 — Orthopaedic Surgeon
//   253515 — Otorhinolaryngologist
//   253516 — Paediatric Surgeon
//   253517 — Plastic and Reconstructive Surgeon
//   253911 — Dermatologist
//   253912 — Emergency Medicine Specialist
//   253913 — Obstetrician and Gynaecologist
//   253914 — Ophthalmologist
//   253917 — Diagnostic and Interventional Radiologist
//   253999 — Medical Practitioners nec
//
// [ANMAC] (16)
//   254211 — Nurse Educator
//   254212 — Nurse Researcher
//   254311 — Nurse Manager
//   254312 — Enrolled Nurse (Aged Care)
//   254411 — Nurse Practitioner
//   254412 — Registered Nurse (Aged Care)
//   254413 — Registered Nurse (Child and Family Health)
//   254414 — Registered Nurse (Community Health)
//   254415 — Registered Nurse (Critical Care and Emergency)
//   254416 — Registered Nurse (Developmental Disability)
//   254418 — Registered Nurse (Medical)
//   254422 — Registered Nurse (Mental Health)
//   254423 — Registered Nurse (Perioperative)
//   254425 — Registered Nurse (Paediatrics)
//   254499 — Registered Nurses nec
//   411411 — Enrolled Nurse
//
// [Legal admissions authority of a state or territory] (6)
//   271111 — Barrister
//   271211 — Judge
//   271311 — Solicitor
//   271312 — Legal Counsel
//   271313 — Legal Practice Director
//   271999 — Judicial and Other Legal Professionals nec
//
// [ACS] (6)
//   225211 — ICT Account Manager
//   225212 — ICT Business Development Manager
//   263114 — Network Engineer
//   313111 — Hardware Technician
//   313112 — ICT Customer Support Officer
//   313199 — ICT Support Technicians nec
//
// [IML] (4)
//   111111 — Chief Executive or Managing Director
//   111211 — Corporate General Manager
//   131113 — Advertising Manager
//   224711 — Librarian
//
// [APS] (4)
//   272311 — Clinical Psychologist
//   272312 — Educational Psychologist
//   272314 — Psychotherapist
//   272399 — Psychologists nec
//
// [AMSA] (4)
//   231211 — Master Fisher
//   231212 — Ship's Engineer
//   231213 — Ship's Master
//   231214 — Ship's Officer
//
// [AITSL] (4)
//   241213 — Primary School Teacher
//   241411 — Secondary School Teacher
//   241511 — Special Needs Teacher
//   241512 — Teacher of the Hearing Impaired
//
// [ACECQA] (3)
//   134111 — Child Care Centre Manager
//   241111 — Early Childhood (Pre-primary School) Teacher
//   421111 — Child Care Worker
//
// [ACWA] (3)
//   134213 — Primary Health Organisation Manager
//   411711 — Community Worker
//   411716 — Youth Worker
//
// [APharmC] (3)
//   251511 — Hospital Pharmacist
//   251512 — Industrial Pharmacist
//   251513 — Retail Pharmacist
//
// [AIR] (3)
//   251211 — Medical Diagnostic Radiographer
//   251212 — Medical Radiation Therapist
//   251214 — Sonographer
//
// [Community Work Australia] (2)
//   411712 — Disabilities Services Officer
//   411713 — Family Support Worker
//
// [ALIA] (2)
//   224611 — Librarian
//   399912 — Interior Decorator
//
// [VETASSESS Council of Ambulance Authorities] (1)
//   411111 — Ambulance Officer
//
// [Council of Ambulance Authorities] (1)
//   411112 — Intensive Care Ambulance Paramedic
//
// [CMBA VETASSESS] (1)
//   252211 — Acupuncturist
//
// [VETASSESS AITSL] (1)
//   134411 — Faculty Head
//
// [SPA] (1)
//   252612 — Audiologist
//
// [TRA VETASSESS] (1)
//   399511 — Broadcast Transmitter Operator
//
// [VETASSESS Defence Force] (1)
//   441111 — Defence Force Member - Other Ranks
//
// [DAA] (1)
//   251111 — Dietitian
//
// [CAANZ CPAA IPA] (1)
//   221214 — Internal Auditor
//
// [SSSI] (1)
//   232214 — Other Spatial Scientist
//
// [AHRI] (1)
//   132311 — Human Resource Manager
//
// [VETASSESS SSSI] (1)
//   232212 — Surveyor
//
// [NAATI] (1)
//   272412 — Interpreter
//
// [Optometry Council of Australia and New Zealand] (1)
//   251411 — Optometrist
//
// [ADC] (1)
//   411215 — Oral Health Therapist
//
// [AVBC] (1)
//   234711 — Veterinarian
//
// [APC] (1)
//   252511 — Physiotherapist
//
// [APodC] (1)
//   252611 — Podiatrist
//
// [VETASSESS ACWA] (1)
//   272111 — Careers Counsellor
//
// [AIQS] (1)
//   233213 — Quantity Surveyor
//
// [AASW] (1)
//   272511 — Social Worker
//
// [(empty)] (1)
//   733111 — Truck Driver (General)
//
// [AOPA] (1)
//   251912 — Orthotist or Prosthetist

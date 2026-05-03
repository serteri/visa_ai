export type Occupation = {
  title: string;
  slug: string;
  anzsco: string;
  recentCutoff: number;
  assessingAuthority: string;
  experienceRisk: boolean;
};

export const occupations: Occupation[] = [
  { title: "Software Engineer", slug: "software-engineer", anzsco: "261313", recentCutoff: 85, assessingAuthority: "ACS", experienceRisk: true },
  { title: "Registered Nurse", slug: "registered-nurse", anzsco: "254412", recentCutoff: 65, assessingAuthority: "ANMAC", experienceRisk: false },
  { title: "Civil Engineer", slug: "civil-engineer", anzsco: "233211", recentCutoff: 80, assessingAuthority: "EA", experienceRisk: false },
];

export function getOccupationBySlug(slug: string): Occupation | undefined {
  return occupations.find((occ) => occ.slug === slug);
}

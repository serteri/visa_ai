export type Occupation = {
  title: string;
  slug: string;
  anzsco: string;
};

export const occupations: Occupation[] = [
  { title: "Software Engineer", slug: "software-engineer", anzsco: "261313" },
  { title: "Registered Nurse", slug: "registered-nurse", anzsco: "254412" },
  { title: "Civil Engineer", slug: "civil-engineer", anzsco: "233211" },
];

export function getOccupationBySlug(slug: string): Occupation | undefined {
  return occupations.find((occ) => occ.slug === slug);
}

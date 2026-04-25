export type SkilledOccupation = {
  title: string;
  list: "MLTSSL" | "STSOL" | "ROL" | "UNKNOWN";
  relevantVisas: string[];
  source: "internal_seed";
};

export const SKILLED_OCCUPATIONS: SkilledOccupation[] = [
  { title: "Accountant (General)", list: "MLTSSL", relevantVisas: ["189", "190", "491"], source: "internal_seed" },
  { title: "External Auditor", list: "MLTSSL", relevantVisas: ["189", "190", "491"], source: "internal_seed" },
  { title: "Internal Auditor", list: "MLTSSL", relevantVisas: ["189", "190", "491"], source: "internal_seed" },
  { title: "Management Accountant", list: "MLTSSL", relevantVisas: ["189", "190", "491"], source: "internal_seed" },
  { title: "Tax Accountant", list: "MLTSSL", relevantVisas: ["189", "190", "491"], source: "internal_seed" },
  { title: "Qualified Architect", list: "MLTSSL", relevantVisas: ["189", "190", "491"], source: "internal_seed" },
  { title: "Civil Engineer", list: "MLTSSL", relevantVisas: ["189", "190", "491"], source: "internal_seed" },
  { title: "Electrical Engineer", list: "MLTSSL", relevantVisas: ["189", "190", "491"], source: "internal_seed" },
  { title: "Mechanical Engineer", list: "MLTSSL", relevantVisas: ["189", "190", "491"], source: "internal_seed" },
  { title: "Registered Nurse", list: "MLTSSL", relevantVisas: ["189", "190", "491"], source: "internal_seed" },
  { title: "Midwife", list: "MLTSSL", relevantVisas: ["189", "190", "491"], source: "internal_seed" },
  { title: "General Practitioner", list: "MLTSSL", relevantVisas: ["189", "190", "491"], source: "internal_seed" },
  { title: "Physiotherapist", list: "MLTSSL", relevantVisas: ["189", "190", "491"], source: "internal_seed" },
  { title: "Social Worker", list: "MLTSSL", relevantVisas: ["189", "190", "491"], source: "internal_seed" },
  { title: "Chef", list: "MLTSSL", relevantVisas: ["189", "190", "491"], source: "internal_seed" },
  { title: "Carpenter", list: "MLTSSL", relevantVisas: ["189", "190", "491"], source: "internal_seed" },
  { title: "Electrician (General)", list: "MLTSSL", relevantVisas: ["189", "190", "491"], source: "internal_seed" },
  { title: "Plumber (General)", list: "MLTSSL", relevantVisas: ["189", "190", "491"], source: "internal_seed" },
  { title: "Welder (First Class)", list: "MLTSSL", relevantVisas: ["189", "190", "491"], source: "internal_seed" },
];

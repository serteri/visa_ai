import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const anzscoPath = path.join(root, "src", "data", "anzsco-list.json");
const occupationsPath = path.join(root, "src", "data", "occupations.json");

const existing = JSON.parse(fs.readFileSync(anzscoPath, "utf8"));
const occupationsPayload = JSON.parse(fs.readFileSync(occupationsPath, "utf8"));
const occupations = occupationsPayload.occupations || [];

const existingByCode = new Map(
  existing.map((entry) => [String(entry.code), {
    code: String(entry.code),
    title: entry.title,
    skillLevel: entry.skillLevel || "Skill Level 1",
    duties: Array.isArray(entry.duties) ? entry.duties.slice(0, 6) : []
  }])
);

function toTitleCase(raw) {
  return String(raw || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function normalizeSkillLevel(record) {
  const skill = record?.skill_level;
  if (typeof skill === "string") {
    const n = skill.match(/[123]/)?.[0];
    if (n) return `Skill Level ${n}`;
  }
  return "Skill Level 1";
}

function makeDuties(title) {
  const t = String(title || "").toLowerCase();

  const base = [
    `Plans and coordinates core ${title} activities in line with legislative, safety and quality requirements.`,
    `Assesses client, stakeholder or operational requirements and translates them into practical work outcomes.`,
    `Prepares and maintains accurate records, reports and documentation for compliance and service continuity.`,
    `Collaborates with multidisciplinary teams to improve delivery standards, efficiency and risk controls.`
  ];

  if (/(engineer|engineering|developer|programmer|analyst|ict|network|database|cyber|software)/.test(t)) {
    return [
      `Analyses technical and business requirements to design fit-for-purpose ${title} solutions.`,
      `Builds, tests, deploys and maintains systems, tools or platforms used in day-to-day operations.`,
      "Monitors performance, investigates incidents and resolves defects to maintain service reliability.",
      "Produces technical documentation and supports governance, security and change management processes."
    ];
  }

  if (/(nurse|doctor|medical|surgeon|pharmacist|therapist|radiographer|dentist|optometrist|psychologist|midwife)/.test(t)) {
    return [
      `Assesses patient needs and develops evidence-based ${title} care or treatment plans.`,
      "Provides clinical services, monitors outcomes and adjusts interventions to achieve best-practice care.",
      "Coordinates with allied health and medical teams to ensure safe, continuous patient management.",
      "Maintains clinical documentation and complies with professional standards, privacy and safety protocols."
    ];
  }

  if (/(teacher|lecturer|trainer|education)/.test(t)) {
    return [
      `Designs and delivers ${title} learning programs aligned to curriculum, standards and learner needs.`,
      "Assesses learner progress, provides targeted feedback and adjusts teaching strategies for better outcomes.",
      "Develops lesson resources, assessment tools and reporting documentation for compliance and quality.",
      "Collaborates with colleagues, families and support services to promote inclusive learning environments."
    ];
  }

  if (/(accountant|auditor|finance|financial|economist|actuary)/.test(t)) {
    return [
      `Prepares and analyses financial data relevant to ${title} functions and reporting obligations.`,
      "Evaluates risks, controls and compliance against accounting standards and regulatory frameworks.",
      "Develops forecasts, recommendations and performance insights to support strategic decisions.",
      "Maintains records and communicates findings to stakeholders, management and external authorities."
    ];
  }

  if (/(electrician|plumber|carpenter|bricklayer|painter|tiler|welder|mechanic|boilermaker|fitter|chef|cook|baker)/.test(t)) {
    return [
      `Interprets specifications and prepares materials, tools and work areas for ${title} tasks.`,
      "Performs installation, fabrication, repair or production work in accordance with technical standards.",
      "Inspects completed work, troubleshoots issues and applies corrective action to meet quality targets.",
      "Follows workplace health and safety procedures and keeps service or production records up to date."
    ];
  }

  return base;
}

const mergedByCode = new Map(existingByCode);

for (const record of occupations) {
  const code = String(record.anzsco_code || "").trim();
  if (!code) continue;

  if (mergedByCode.has(code)) continue;

  const title = toTitleCase(record.occupation_name || "Occupation");
  mergedByCode.set(code, {
    code,
    title,
    skillLevel: normalizeSkillLevel(record),
    duties: makeDuties(title)
  });
}

const merged = Array.from(mergedByCode.values()).sort((a, b) => {
  if (a.code === b.code) return a.title.localeCompare(b.title);
  return a.code.localeCompare(b.code);
});

fs.writeFileSync(anzscoPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

console.log(`Merged occupations written: ${merged.length}`);
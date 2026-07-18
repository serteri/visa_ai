const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SUBCLASS_MAP = {
  "186": { "name": "Employer Nomination Scheme visa", "stream": "Direct Entry Pathway" },
  "189": { "name": "Skilled Independent", "stream": "Points-Tested" },
  "190": { "name": "Skilled Nominated", "stream": "" },
  "407": { "name": "Training visa", "stream": "" },
  "482": { "name": "Skills in Demand", "stream": "Core Skills stream" },
  "485": { "name": "Temporary Graduate", "stream": "" },
  "489": { "name": "Skilled Regional (Provisional) visa", "stream": "Family sponsored" },
  "491": { "name": "Skilled Work Regional (provisional) visa", "stream": "Family Sponsored" },
  "494": { "name": "Skilled Employer Sponsored Regional (provisional)", "stream": "Employer sponsored stream" }
};

const GENERIC_NOT_MAPPED =
  "This occupation is present in the ANZSCO classification but is not currently mapped to skilled visa lists in this dataset.";

// 1. Load cleaned new skilled list
const newRaw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scratch/cleaned_skilled_list.json'), 'utf8'));

// 2. Convert to skilled-occupation-list.json schema
const converted = newRaw.map(item => {
  const visaTypes = [...new Set(item.visaTypes ?? [])].sort();
  return {
    anzsco_code: item.anzscoCode,
    occupation_name: item.occupation,
    lists: [...new Set(item.lists ?? [])].sort(),
    visa_subclasses: visaTypes,
    visa_pathways: visaTypes.map(v => {
      const details = SUBCLASS_MAP[v] || { name: `Subclass ${v}`, stream: "" };
      return {
        subclass: v,
        name: details.name,
        stream: details.stream
      };
    }),
    authority: (item.assessingAuthorities ?? []).join(" ")
  };
});

// Sort alphabetically by occupation_name
converted.sort((a, b) => a.occupation_name.localeCompare(b.occupation_name));

// 3. Write to src/data/skilled-occupation-list.json
const skilledListOutput = {
  generated_at: new Date().toISOString(),
  source: "public/Skilled list.md",
  count: converted.length,
  occupations: converted
};

const SKILLED_PATH = path.join(__dirname, '..', 'src/data/skilled-occupation-list.json');
fs.writeFileSync(SKILLED_PATH, JSON.stringify(skilledListOutput, null, 2));
console.log(`Saved ${converted.length} occupations to skilled-occupation-list.json.`);

// 4. Merge into occupations.json
const OCC_PATH = path.join(__dirname, '..', 'src/data/occupations.json');
const occData = JSON.parse(fs.readFileSync(OCC_PATH, 'utf8'));
const newByCode = new Map(converted.map(o => [o.anzsco_code, o]));

let updatedCount = 0;
let clearedCount = 0;
let addedCount = 0;

const currentOccMap = new Map(occData.occupations.map(o => [o.anzsco_code, o]));

// Update or clear existing occupations
for (const occ of occData.occupations) {
  const newOcc = newByCode.get(occ.anzsco_code);
  if (newOcc) {
    occ.visa_lists = newOcc.lists;
    occ.visa_subclasses = newOcc.visa_subclasses;
    occ.authority = newOcc.authority;
    if (occ.critical_warning === GENERIC_NOT_MAPPED && newOcc.lists.length > 0) {
      occ.critical_warning = "";
    }
    updatedCount++;
  } else {
    // This occupation is not in the new skilled list! Clear it
    if ((occ.visa_lists ?? []).length > 0 || (occ.visa_subclasses ?? []).length > 0) {
      occ.visa_lists = [];
      occ.visa_subclasses = [];
      occ.authority = "Unknown";
      occ.critical_warning = GENERIC_NOT_MAPPED;
      clearedCount++;
    }
  }
}

// Add new occupations that aren't in occupations.json at all
for (const newOcc of converted) {
  if (!currentOccMap.has(newOcc.anzsco_code)) {
    occData.occupations.push({
      anzsco_code: newOcc.anzsco_code,
      occupation_name: newOcc.occupation_name,
      authority: newOcc.authority || "Unknown",
      min_qualification: "Not specified in ANZSCO source",
      post_qual_experience_years: 0,
      english_requirement: "Refer to Department of Home Affairs for specific subclass requirements",
      critical_warning: "",
      visa_lists: newOcc.lists,
      visa_subclasses: newOcc.visa_subclasses
    });
    addedCount++;
  }
}

// Sort alphabetically by occupation_name
occData.occupations.sort((a, b) => a.occupation_name.localeCompare(b.occupation_name));

fs.writeFileSync(OCC_PATH, JSON.stringify(occData, null, 2));
console.log(`occupations.json updated:`);
console.log(`  Updated: ${updatedCount}`);
console.log(`  Cleared (no longer skilled): ${clearedCount}`);
console.log(`  Added (completely new): ${addedCount}`);
console.log(`  Total size: ${occData.occupations.length}`);

// 5. Sync Search Index (anzsco-list.json)
console.log('Running search index sync...');
execSync('npx tsx scripts/sync-search-index-with-skilled-list.ts', { stdio: 'inherit' });

// 6. Run derive skill levels
console.log('Running skill level derivation...');
execSync('npx tsx scripts/i18n/derive-skill-levels.ts', { stdio: 'inherit' });

console.log('Database and search index successfully updated!');

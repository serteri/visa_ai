const fs = require('fs');
const path = require('path');

const extracted = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scratch_extracted_list.json'), 'utf8'));
const current = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src/data/skilled-occupation-list.json'), 'utf8')).occupations;

const currentByCode = new Map(current.map(o => [o.anzsco_code, o]));

console.log('Extracted count:', extracted.length);
console.log('Current skilled-occupation-list count:', current.length);

let diffs = 0;
for (const ext of extracted) {
  const code = ext.anzscoCode;
  const curr = currentByCode.get(code);
  if (!curr) {
    console.log(`New code found in extracted: ${code} - ${ext.occupation}`);
    diffs++;
  } else {
    // Compare lists, visaTypes, and assessingAuthorities
    const extLists = ext.lists.sort().join(',');
    const currLists = curr.lists.sort().join(',');
    const extVisas = ext.visaTypes.sort().join(',');
    const currVisas = curr.visa_subclasses.sort().join(',');
    const extAuth = ext.assessingAuthorities.join(',');
    const currAuth = curr.authority;
    
    if (extLists !== currLists || extVisas !== currVisas || extAuth !== currAuth) {
      console.log(`Difference in ${code} - ${ext.occupation}:`);
      console.log(`  Extracted: lists=${JSON.stringify(ext.lists)}, visas=${JSON.stringify(ext.visaTypes)}, auth=${JSON.stringify(ext.assessingAuthorities)}`);
      console.log(`  Current:   lists=${JSON.stringify(curr.lists)}, visas=${JSON.stringify(curr.visa_subclasses)}, auth=${curr.authority}`);
      diffs++;
    }
  }
}
console.log('Total differences/new items:', diffs);

const fs = require('fs');
const path = require('path');

const newList = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scratch/cleaned_skilled_list.json'), 'utf8'));
const currentOccs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src/data/occupations.json'), 'utf8')).occupations;

const newByCode = new Map(newList.map(o => [o.anzscoCode, o]));

let count = 0;
let details = [];
for (const occ of currentOccs) {
  const isCurrentlySkilled = (occ.visa_lists ?? []).some(l => ["MLTSSL", "STSOL", "ROL", "CSOL"].includes(l));
  const inNewList = newByCode.has(occ.anzsco_code);
  
  if (isCurrentlySkilled && !inNewList) {
    count++;
    details.push({
      code: occ.anzsco_code,
      name: occ.occupation_name,
      lists: occ.visa_lists,
      subclasses: occ.visa_subclasses
    });
  }
}

console.log('Occupations currently marked skilled but NOT in the new list:', count);
fs.writeFileSync(path.join(__dirname, '..', 'scratch/skilled_not_in_new.json'), JSON.stringify(details, null, 2));
console.log('Saved details to scratch/skilled_not_in_new.json');

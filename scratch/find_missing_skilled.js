const fs = require('fs');
const path = require('path');

const newList = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scratch/cleaned_skilled_list.json'), 'utf8'));
const currentList = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src/data/skilled-occupation-list.json'), 'utf8')).occupations;

const newByCode = new Map(newList.map(o => [o.anzscoCode, o]));

let count = 0;
let details = [];
for (const curr of currentList) {
  if (!newByCode.has(curr.anzsco_code)) {
    count++;
    details.push({
      code: curr.anzsco_code,
      name: curr.occupation_name,
      lists: curr.lists,
      visa_subclasses: curr.visa_subclasses
    });
  }
}

console.log('Occupations in current skilled list but NOT in the new list:', count);
fs.writeFileSync(path.join(__dirname, '..', 'scratch/current_not_in_new.json'), JSON.stringify(details, null, 2));
console.log('Saved to scratch/current_not_in_new.json');

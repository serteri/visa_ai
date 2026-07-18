const fs = require('fs');
const path = require('path');

const userJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scratch_user_input.json'), 'utf8'));
const data = userJson.content;

// Let's print out how the JSON blocks look like in the content.
// The user prompt has multiple blocks of JSON. Let's find all the JSON array brackets or extract them.
// We can use a regex to find all [ ... ] arrays, or match JSON strings.
const regex = /\[[\s\S]*?\]/g;
let match;
let allItems = [];

// Since there might be multiple arrays, let's parse them one by one.
const matches = data.match(/\[\s*\{[\s\S]*?\}\s*\]/g);
if (matches) {
  for (const m of matches) {
    try {
      const list = JSON.parse(m);
      allItems.push(...list);
    } catch (e) {
      // If parsing fails, it might be due to nested arrays or formatting. We'll try a looser parse or regex split.
    }
  }
}

console.log('Total items parsed:', allItems.length);

if (allItems.length === 0) {
  // Try another parsing strategy: find all JSON objects and parse them.
  const objMatches = data.match(/\{\s*"occupation":[\s\S]*?\}/g);
  if (objMatches) {
    for (const om of objMatches) {
      try {
        const item = JSON.parse(om);
        allItems.push(item);
      } catch (e) {}
    }
  }
  console.log('Fallback items parsed:', allItems.length);
}

if (allItems.length > 0) {
  fs.writeFileSync(path.join(__dirname, '..', 'scratch_extracted_list.json'), JSON.stringify(allItems, null, 2));
  console.log('Saved to scratch_extracted_list.json');
} else {
  console.log('No items could be extracted. Head of content:');
  console.log(data.slice(0, 1000));
}

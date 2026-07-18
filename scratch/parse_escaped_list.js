const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'public/Skilled list.md');
let raw = fs.readFileSync(srcPath, 'utf8');

// Unescape markdown backslashes for [, ], and "
raw = raw.replace(/\\\[/g, '[')
         .replace(/\\\]/g, ']')
         .replace(/\\\"/g, '"')
         .replace(/\\/g, ''); // just in case there are other backslashes

// Now, find all JSON arrays in the file.
// The file has blocks of [ { ... }, { ... } ]
// We can use a regex to match arrays or we can do a simple character search.
const allItems = [];
let braceCount = 0;
let currentArrayStr = '';
let inArray = false;

for (let i = 0; i < raw.length; i++) {
  const char = raw[i];
  if (char === '[') {
    inArray = true;
    braceCount++;
    currentArrayStr += char;
  } else if (char === ']') {
    braceCount--;
    currentArrayStr += char;
    if (braceCount === 0 && inArray) {
      // End of an array, parse it!
      try {
        const parsed = JSON.parse(currentArrayStr);
        allItems.push(...parsed);
      } catch (e) {
        console.error('Failed to parse array:', e.message);
        // Let's print a small chunk to see what failed
        console.error(currentArrayStr.slice(0, 100) + '...' + currentArrayStr.slice(-100));
      }
      currentArrayStr = '';
      inArray = false;
    }
  } else {
    if (inArray) {
      currentArrayStr += char;
    }
  }
}

console.log('Parsed total items:', allItems.length);

if (allItems.length > 0) {
  // Let's check for duplicate codes
  const seenCodes = new Set();
  const uniqueItems = [];
  for (const item of allItems) {
    if (!item.anzscoCode) {
      console.warn('Item missing anzscoCode:', item);
      continue;
    }
    // De-duplicate by code
    if (!seenCodes.has(item.anzscoCode)) {
      seenCodes.add(item.anzscoCode);
      uniqueItems.push(item);
    } else {
      // Merge lists and visa types if duplicates exist
      const existing = uniqueItems.find(x => x.anzscoCode === item.anzscoCode);
      existing.lists = [...new Set([...existing.lists, ...item.lists])];
      existing.visaTypes = [...new Set([...existing.visaTypes, ...item.visaTypes])].sort();
      existing.assessingAuthorities = [...new Set([...existing.assessingAuthorities, ...item.assessingAuthorities])];
    }
  }
  console.log('Unique items:', uniqueItems.length);
  fs.writeFileSync(path.join(__dirname, '..', 'scratch/cleaned_skilled_list.json'), JSON.stringify(uniqueItems, null, 2));
  console.log('Saved to scratch/cleaned_skilled_list.json');
}

const fs = require('fs');
const path = require('path');
const data = fs.readFileSync(path.join(__dirname, '../lib/sample-data.ts'), 'utf8');
const regex = /slug:\s*"([^"]+)"/g;
const slugs = [];
let m;
while ((m = regex.exec(data))) {
  slugs.push(m[1]);
}
const files = fs.readdirSync(path.join(__dirname, '../public/products'));
const fileSet = new Set(files.map((f) => f.toLowerCase()));
const missing = [];
const matched = [];
for (const slug of slugs) {
  const candidates = [
    `${slug}.jpg`,
    `${slug}.jpeg`,
    `${slug}.webp`,
    `${slug}.png`,
    `${slug}.jfif`
  ];
  const found = candidates.find((c) => fileSet.has(c));
  if (found) {
    matched.push({ slug, file: found });
  } else {
    missing.push(slug);
  }
}
const extras = files.filter((f) => !slugs.includes(path.parse(f).name));
console.log('matches:', matched.length, 'of', slugs.length);
console.log('missing:', missing);
console.log('extras:', extras);
console.log('matched sample:', matched.slice(0,20));

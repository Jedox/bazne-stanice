const fs = require('fs');
function parseLine(line) {
  const fields = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === '\t' && !inQuote) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}
// Read the file as a buffer first to detect encoding
const buf = fs.readFileSync('data/bazne_stanice.csv');
let text = '';
if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
  text = buf.toString('utf16le');
} else {
  text = buf.toString('utf8');
}

const lines = text.split('\n').map(l => l.replace(/\r$/, ''));
console.log('Total lines:', lines.length);
let valid = 0;
for (let i = 1; i < Math.min(lines.length, 10); i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const fields = parseLine(line);
  console.log('Line', i, 'Fields length:', fields.length);
  if (fields.length < 9) continue;
  const [id, operator, freqBand, tech, zip, locationName, address, lngStr, latStr] = fields;
  console.log('latStr:', latStr, 'lngStr:', lngStr);
  const lng = parseFloat(lngStr);
  const lat = parseFloat(latStr);
  console.log('lat:', lat, 'lng:', lng);
  if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) console.log('INVALID COORDS');
  else if (lat < 41 || lat > 47 || lng < 18 || lng > 23) console.log('OUT OF SERBIA BOUNDS');
  else valid++;
}
console.log('Valid:', valid);

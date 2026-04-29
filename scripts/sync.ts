import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const CSV_PATH = path.join(DATA_DIR, 'bazne_stanice.csv');
const META_PATH = path.join(DATA_DIR, 'sync_meta.json');
const SOURCE_URL = 'https://registar.ratel.rs/en/reg221?action=table&format=csv&nosilac_prava=&primenjena_tehnologija=&filter=';

// Minimal types from our app
interface BaseStation {
  id: string;
  operator: string;
  technology: string;
  frequencyBand: string;
  latitude: number;
  longitude: number;
}

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === '\t' && !inQuote) {
      fields.push(current.trim());
      current = '';
    } else { current += ch; }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(csvText: string): BaseStation[] {
  const lines = csvText.split('\n').map(l => l.replace(/\r$/, ''));
  const records: BaseStation[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const fields = parseLine(line);
    if (fields.length < 9) continue;
    const [id, operator, freqBand, tech, zip, locationName, address, lngStr, latStr] = fields;
    const lng = parseFloat(lngStr);
    const lat = parseFloat(latStr);
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) continue;
    records.push({
      id: id || `rec-${i}`,
      operator: operator || 'Unknown',
      technology: tech || '',
      frequencyBand: freqBand || '',
      longitude: lng,
      latitude: lat,
    });
  }
  return records;
}

async function sync() {
  console.log('[sync-script] Starting...');
  const now = new Date().toISOString();
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  try {
    const res = await fetch(SOURCE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/csv,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const arrayBuffer = await res.arrayBuffer();
    const newBuf = Buffer.from(arrayBuffer);
    const newHash = createHash('sha256').update(newBuf).digest('hex').slice(0, 16);

    let prevMeta: any = {};
    if (fs.existsSync(META_PATH)) {
      prevMeta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'));
    }

    if (newHash === prevMeta.fileHash) {
      console.log('[sync-script] No changes detected.');
      prevMeta.lastCheckedAt = now;
      fs.writeFileSync(META_PATH, JSON.stringify(prevMeta, null, 2));
      return;
    }

    console.log('[sync-script] Changes detected, processing...');
    
    let oldText = '';
    if (fs.existsSync(CSV_PATH)) {
      const oldBuf = fs.readFileSync(CSV_PATH);
      oldText = (oldBuf.length >= 2 && oldBuf[0] === 0xFF && oldBuf[1] === 0xFE) 
        ? oldBuf.toString('utf16le') : oldBuf.toString('utf8');
    }
    const oldRecords = parseCSV(oldText);

    let newText = (newBuf.length >= 2 && newBuf[0] === 0xFF && newBuf[1] === 0xFE) 
      ? newBuf.toString('utf16le') : newBuf.toString('utf8');
    const newRecords = parseCSV(newText);

    const oldMap = new Map(oldRecords.map(r => [r.id, r]));
    const addedSectors = newRecords.filter(nr => !oldMap.has(nr.id));
    const siteKey = (r: BaseStation) => `${r.latitude.toFixed(5)}_${r.longitude.toFixed(5)}`;
    
    const operators = [...new Set(newRecords.map(r => r.operator))];
    const operatorChanges = operators.map(opName => {
      const opNewSectors = addedSectors.filter(s => s.operator === opName);
      const opOldSectors = oldRecords.filter(s => s.operator === opName);
      const opOldSites = new Set(opOldSectors.map(siteKey));
      
      const opNewSitesSet = new Set<string>();
      opNewSectors.forEach(s => {
        const k = siteKey(s);
        if (!opOldSites.has(k)) opNewSitesSet.add(k);
      });

      const count = (t: string, f: string) => opNewSectors.filter(s => s.technology === t && s.frequencyBand.includes(f)).length;
      
      const opUpdated4GSitesSet = new Set<string>();
      opNewSectors.forEach(s => {
        if (s.technology === '4G') {
          const k = siteKey(s);
          if (opOldSites.has(k)) opUpdated4GSitesSet.add(k);
        }
      });

      return {
        name: opName,
        newSites: opNewSitesSet.size,
        new5G700: count('5G', '700'),
        new5G3500: count('5G', '3500') + count('5G', '3.5'),
        new4G2600: count('4G', '2600'),
        new4G700: count('4G', '700'),
        updated4GSites: opUpdated4GSitesSet.size,
        totalSectors: newRecords.filter(s => s.operator === opName).length
      };
    });

    const globalStats = {
      newSites: operatorChanges.reduce((a, b) => a + b.newSites, 0),
      new5G700: operatorChanges.reduce((a, b) => a + b.new5G700, 0),
      new5G3500: operatorChanges.reduce((a, b) => a + b.new5G3500, 0),
      new4G2600: operatorChanges.reduce((a, b) => a + b.new4G2600, 0),
      new4G700: operatorChanges.reduce((a, b) => a + b.new4G700, 0),
      updated4GSites: operatorChanges.reduce((a, b) => a + b.updated4GSites, 0),
    };

    const meta = {
      lastCheckedAt: now,
      lastChangedAt: now,
      totalRecords: newRecords.length,
      inserted: addedSectors.length,
      deleted: oldRecords.length - (newRecords.length - addedSectors.length),
      fileHash: newHash,
      operatorChanges,
      globalStats
    };

    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CSV_PATH, newBuf);
    fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
    
    console.log(`[sync-script] Updated! New sectors: ${addedSectors.length}`);
  } catch (err) {
    console.error('[sync-script] Error:', err);
    process.exit(1);
  }
}

sync();

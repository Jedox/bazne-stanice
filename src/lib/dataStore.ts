/**
 * dataStore.ts
 *
 * Server-side singleton that:
 *  1. Reads the CSV on first access and caches records in memory
 *  2. Exposes filtered / paginated / sorted query helpers
 *  3. Handles re-loading when the CSV is replaced by the sync endpoint
 */

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import Papa from 'papaparse';
import type { BaseStation, SyncMeta, StationFilters, StatsResponse } from './types';

// ─── Paths ────────────────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), 'data');
const CSV_PATH = path.join(DATA_DIR, 'bazne_stanice.csv');
const META_PATH = path.join(DATA_DIR, 'sync_meta.json');

// ─── In-process cache ─────────────────────────────────────────────────────────

let cachedRecords: BaseStation[] = [];
let cachedHash: string = '';
let cacheLoaded = false;

// ─── CSV parsing ──────────────────────────────────────────────────────────────

function fileHash(filepath: string): string {
  try {
    const buf = fs.readFileSync(filepath);
    return createHash('sha256').update(buf).digest('hex').slice(0, 16);
  } catch {
    return '';
  }
}

function parseCSV(csvText: string): BaseStation[] {
  const results = Papa.parse(csvText, {
    delimiter: "\t",
    skipEmptyLines: true,
    header: false,
  });

  const lines = results.data as string[][];
  if (lines.length < 2) return [];

  const records: BaseStation[] = [];
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i];
    if (fields.length < 9) continue;

    const [id, operator, freqBand, tech, zip, locationName, address, lngStr, latStr] = fields;
    const lng = parseFloat(lngStr);
    const lat = parseFloat(latStr);

    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) continue;
    if (lat < 41 || lat > 47 || lng < 18 || lng > 23) continue;

    records.push({
      id: id || `rec-${i}`,
      operator: operator || 'Unknown',
      frequencyBand: freqBand || '',
      technology: tech || '',
      zipCode: zip || '',
      locationName: locationName || '',
      address: address || '',
      longitude: lng,
      latitude: lat,
    });
  }

  return records;
}

// ─── Load / reload ────────────────────────────────────────────────────────────

function loadData(): void {
  // Prevent loading during Vercel build to avoid memory limits
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  if (!fs.existsSync(CSV_PATH)) return;

  const hash = fileHash(CSV_PATH);
  if (cacheLoaded && hash === cachedHash) return;

  console.log('[dataStore] Streaming CSV load …');
  const start = Date.now();
  
  // Use a faster sync read for simplicity but clear the buffer
  const buf = fs.readFileSync(CSV_PATH);
  let text = '';
  if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
    text = buf.toString('utf16le');
  } else {
    text = buf.toString('utf8');
  }

  // Use Papaparse with high speed settings
  const results = Papa.parse(text, {
    delimiter: "\t",
    skipEmptyLines: true,
    fastMode: true, // Crucial for speed
  });

  text = ""; // Immediate cleanup

  const rows = results.data as string[][];
  const records: BaseStation[] = [];

  for (let i = 1; i < rows.length; i++) {
    const fields = rows[i];
    if (fields.length < 9) continue;

    const lat = parseFloat(fields[8]);
    const lng = parseFloat(fields[7]);

    if (isNaN(lat) || isNaN(lng) || lat === 0) continue;

    records.push({
      id: fields[0] || `r-${i}`,
      operator: fields[1] || 'Unknown',
      frequencyBand: fields[2] || '',
      technology: fields[3] || '',
      zipCode: fields[4] || '',
      locationName: fields[5] || '',
      address: fields[6] || '',
      longitude: lng,
      latitude: lat,
    });
  }

  cachedRecords = records;
  cachedHash = hash;
  cacheLoaded = true;
  console.log(`[dataStore] Loaded ${cachedRecords.length} records in ${Date.now() - start}ms`);
}

export function ensureLoaded(): void {
  loadData();
}

export function getAllRecords(): BaseStation[] {
  ensureLoaded();
  return cachedRecords;
}

/**
 * Compares a new buffer (CSV) with current cached records
 * and returns detailed change statistics.
 */
export function processSync(buf: Buffer) {
  let text = '';
  if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
    text = buf.toString('utf16le');
  } else {
    text = buf.toString('utf8');
  }

  const newRecords = parseCSV(text);
  ensureLoaded();
  const oldRecords = cachedRecords;

  const oldMap = new Map(oldRecords.map(r => [r.id, r]));
  const addedSectors = newRecords.filter(nr => !oldMap.has(nr.id));

  // Helper for site keys
  const siteKey = (r: BaseStation) => `${r.latitude.toFixed(5)}_${r.longitude.toFixed(5)}`;
  
  const operators = [...new Set(newRecords.map(r => r.operator))];

  const operatorChanges = operators.map(opName => {
    const opNewSectors = addedSectors.filter(s => s.operator === opName);
    const opAllSectors = newRecords.filter(s => s.operator === opName);
    const opOldSectors = oldRecords.filter(s => s.operator === opName);
    
    const opOldSites = new Set(opOldSectors.map(siteKey));
    
    // New sites: Coordinates where this operator had 0 sectors but now has some
    const opNewSitesSet = new Set<string>();
    opNewSectors.forEach(s => {
      const k = siteKey(s);
      if (!opOldSites.has(k)) opNewSitesSet.add(k);
    });

    const countTechFreq = (tech: string, freq: string) => 
      opNewSectors.filter(s => s.technology === tech && s.frequencyBand.includes(freq)).length;

    // Updated 4G sites: Existing sites for this operator that got new 4G sectors
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
      new5G700: countTechFreq('5G', '700'),
      new5G3500: countTechFreq('5G', '3500') + countTechFreq('5G', '3.5'),
      new4G2600: countTechFreq('4G', '2600'),
      new4G700: countTechFreq('4G', '700'),
      updated4GSites: opUpdated4GSitesSet.size,
      totalSectors: opAllSectors.length
    };
  });

  const globalStats = {
    newSites: operatorChanges.reduce((acc, op) => acc + op.newSites, 0),
    new5G700: operatorChanges.reduce((acc, op) => acc + op.new5G700, 0),
    new5G3500: operatorChanges.reduce((acc, op) => acc + op.new5G3500, 0),
    new4G2600: operatorChanges.reduce((acc, op) => acc + op.new4G2600, 0),
    new4G700: operatorChanges.reduce((acc, op) => acc + op.new4G700, 0),
    updated4GSites: operatorChanges.reduce((acc, op) => acc + op.updated4GSites, 0),
  };

  return {
    totalRecords: newRecords.length,
    inserted: addedSectors.length,
    deleted: oldRecords.length - (newRecords.length - addedSectors.length),
    operatorChanges,
    globalStats
  };
}

// ─── Sync metadata ────────────────────────────────────────────────────────────

export function readSyncMeta(): SyncMeta | null {
  try {
    if (!fs.existsSync(META_PATH)) return null;
    return JSON.parse(fs.readFileSync(META_PATH, 'utf-8')) as SyncMeta;
  } catch {
    return null;
  }
}

export function writeSyncMeta(meta: SyncMeta): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2), 'utf-8');
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export function queryStations(filters: StationFilters) {
  ensureLoaded();

  let results = cachedRecords;

  // Search
  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      r =>
        r.id.toLowerCase().includes(q) ||
        r.operator.toLowerCase().includes(q) ||
        r.locationName.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q)
    );
  }

  // Exact filters
  if (filters.operator) {
    results = results.filter(r => r.operator === filters.operator);
  }
  if (filters.technology) {
    results = results.filter(r => r.technology === filters.technology);
  }
  if (filters.frequencyBand) {
    results = results.filter(r => r.frequencyBand === filters.frequencyBand);
  }
  if (filters.city) {
    const c = filters.city.toLowerCase();
    results = results.filter(r => r.locationName.toLowerCase().includes(c));
  }
  if (filters.lat !== undefined) {
    results = results.filter(r => Math.abs(r.latitude - filters.lat!) < 0.00001);
  }
  if (filters.lng !== undefined) {
    results = results.filter(r => Math.abs(r.longitude - filters.lng!) < 0.00001);
  }

  // Sort
  const sortBy = filters.sortBy ?? 'id';
  const dir = filters.sortDir === 'desc' ? -1 : 1;
  results = [...results].sort((a, b) => {
    const av = String(a[sortBy] ?? '');
    const bv = String(b[sortBy] ?? '');
    return av.localeCompare(bv, undefined, { numeric: true }) * dir;
  });

  // Paginate
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 50));
  const total = results.length;
  const totalPages = Math.ceil(total / pageSize);
  const sliced = results.slice((page - 1) * pageSize, page * pageSize);

  return { data: sliced, total, page, pageSize, totalPages };
}

// ─── Stats helper ─────────────────────────────────────────────────────────────

function topN<T extends { count: number }>(arr: T[], n = 10): T[] {
  return arr.sort((a, b) => b.count - a.count).slice(0, n);
}

export function computeStats(): StatsResponse {
  ensureLoaded();
  const records = cachedRecords;
  const meta = readSyncMeta();

  // Operators
  const opMap = new Map<string, number>();
  const techMap = new Map<string, number>();
  const freqMap = new Map<string, number>();
  const cityMap = new Map<string, number>();
  const siteSet = new Set<string>();

  for (const r of records) {
    opMap.set(r.operator, (opMap.get(r.operator) ?? 0) + 1);
    techMap.set(r.technology, (techMap.get(r.technology) ?? 0) + 1);
    freqMap.set(r.frequencyBand, (freqMap.get(r.frequencyBand) ?? 0) + 1);
    // Extract city name (first segment before the dash in locationName, or whole name)
    const city = r.locationName.split('-')[0].trim() || r.locationName;
    cityMap.set(city, (cityMap.get(city) ?? 0) + 1);
    siteSet.add(`${r.latitude.toFixed(5)}_${r.longitude.toFixed(5)}`);
  }

  const toArr = (m: Map<string, number>) =>
    Array.from(m.entries()).map(([name, count]) => ({ name, count }));

  return {
    totalStations: records.length,
    totalSites: siteSet.size,
    operators: topN(toArr(opMap)),
    technologies: topN(toArr(techMap)),
    frequencyBands: topN(toArr(freqMap)),
    topCities: topN(toArr(cityMap)),
    lastSyncAt: meta?.lastChangedAt ?? null,
    lastCheckedAt: meta?.lastCheckedAt ?? null,
    newSinceLast: meta?.inserted ?? 0,
    operatorChanges: meta?.operatorChanges ?? [],
    globalStats: meta?.globalStats,
  };
}

// ─── Map points (lightweight) ─────────────────────────────────────────────────

export function getMapPoints(operator?: string, technology?: string): import('./types').MapSite[] {
  ensureLoaded();
  let records = cachedRecords;

  if (operator) records = records.filter(r => r.operator === operator);
  if (technology) records = records.filter(r => r.technology === technology);

  const siteMap = new Map<string, any>();

  for (const r of records) {
    const key = `${r.latitude.toFixed(5)}_${r.longitude.toFixed(5)}`;
    let site = siteMap.get(key);
    if (!site) {
      site = {
        id: key,
        lat: r.latitude,
        lng: r.longitude,
        operators: new Set<string>(),
        technologies: new Set<string>(),
        totalSectors: 0,
        locationName: r.locationName,
      };
      siteMap.set(key, site);
    }
    site.operators.add(r.operator);
    site.technologies.add(r.technology);
    site.totalSectors++;
  }

  return Array.from(siteMap.values()).map(site => ({
    id: site.id,
    lat: site.lat,
    lng: site.lng,
    operators: Array.from(site.operators),
    technologies: Array.from(site.technologies),
    totalSectors: site.totalSectors,
    locationName: site.locationName
  }));
}

// ─── Distinct values for filter dropdowns ─────────────────────────────────────

export function getDistinctValues() {
  ensureLoaded();
  const operators = [...new Set(cachedRecords.map(r => r.operator))].sort();
  const technologies = [...new Set(cachedRecords.map(r => r.technology))].sort();
  const frequencyBands = [...new Set(cachedRecords.map(r => r.frequencyBand))].sort(
    (a, b) => Number(a) - Number(b)
  );
  return { operators, technologies, frequencyBands };
}

/**
 * /api/sync  — POST to trigger a re-sync from the RATEL source.
 *
 * Downloads the CSV, compares it with the stored one, and replaces
 * the local file if changed. Updates sync_meta.json.
 */

import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  getAllRecords,
  writeSyncMeta,
  readSyncMeta,
  ensureLoaded,
  processSync,
} from '@/lib/dataStore';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data');
const CSV_PATH = path.join(DATA_DIR, 'bazne_stanice.csv');

const SOURCE_URL =
  'https://registar.ratel.rs/en/reg221?action=table&format=csv&nosilac_prava=&primenjena_tehnologija=&filter=';

export async function POST() {
  try {
    console.log('[sync] Fetching RATEL source …');
    const now = new Date().toISOString();

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const res = await fetch(SOURCE_URL, {
      headers: { 'Accept-Encoding': 'gzip, deflate' },
      signal: AbortSignal.timeout(180_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Source returned HTTP ${res.status}` },
        { status: 502 }
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const newBuf = Buffer.from(arrayBuffer);
    const newHash = createHash('sha256').update(newBuf).digest('hex').slice(0, 16);

    const prevMeta = readSyncMeta();
    const prevHash = prevMeta?.fileHash ?? '';

    if (newHash === prevHash) {
      writeSyncMeta({
        ...prevMeta,
        lastCheckedAt: now,
      } as any);
      return NextResponse.json({
        status: 'no-change',
        message: 'Source file unchanged',
        lastCheckedAt: now,
        lastChangedAt: prevMeta?.lastChangedAt ?? null,
      });
    }

    console.log('[sync] Data changed, processing diff …');
    const diff = processSync(newBuf);

    // Save new CSV
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CSV_PATH, newBuf);

    const meta = {
      lastCheckedAt: now,
      lastChangedAt: now,
      totalRecords: diff.totalRecords,
      inserted: diff.inserted,
      updated: 0,
      deleted: diff.deleted,
      fileHash: newHash,
      operatorChanges: diff.operatorChanges,
    };
    
    writeSyncMeta(meta);

    console.log(`[sync] Updated — inserted: ${diff.inserted}, deleted: ${diff.deleted}`);

    return NextResponse.json({ status: 'updated', ...meta });
  } catch (err) {
    console.error('[sync] Error:', err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  const meta = readSyncMeta();
  return NextResponse.json(meta ?? { message: 'No sync performed yet' });
}

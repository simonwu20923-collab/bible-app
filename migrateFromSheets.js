// migrateFromSheets.js
// One-time migration of check-in and comment data from Google Sheets → Supabase
// 
// Run: node migrateFromSheets.js
// Add --dry-run to preview without writing
// Add --comments to also migrate comments (default: check-ins only)
// Add --both to migrate both check-ins AND comments

const https = require('https');

// ── Config ────────────────────────────────────────────────────────────────────

const SHEET_ID      = '19Jb1G3vryUnD4ohSH_J_l7pYLgVWtj2JXwAJmVMAD98';
const TRACKER_GID   = '1355203921';  // Tracker tab GID from URL
const SUPABASE_URL  = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';

const DRY_RUN       = process.argv.includes('--dry-run');
const DO_COMMENTS   = process.argv.includes('--comments') || process.argv.includes('--both');
const DO_CHECKINS   = !process.argv.includes('--comments') || process.argv.includes('--both');

// ── Helpers ───────────────────────────────────────────────────────────────────

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

// Parse CSV handling quoted fields with embedded commas/newlines
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i+1];
    if (inQuote) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') inQuote = false;
      else field += ch;
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === ',') { row.push(field.trim()); field = ''; }
      else if (ch === '\r' && next === '\n') { row.push(field.trim()); rows.push(row); row = []; field = ''; i++; }
      else if (ch === '\n') { row.push(field.trim()); rows.push(row); row = []; field = ''; }
      else field += ch;
    }
  }
  if (field || row.length) { row.push(field.trim()); rows.push(row); }
  return rows.filter(r => r.some(c => c));
}

// Convert Google Sheets date "MM/DD/YYYY" or "M/D/YYYY" to "YYYY-MM-DD"
function parseDate(raw) {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim();
  return null;
}

function supabaseGet(path) {
  return new Promise((resolve, reject) => {
    https.get(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    }).on('error', reject);
  });
}

function supabaseInsert(table, rows) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(rows);
    const req = https.request(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates,return=representation',
      },
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Fetch existing Supabase data for dedup ────────────────────────────────────

async function getExistingCheckins() {
  const data = await supabaseGet('checkins?select=name,date,portion&limit=10000');
  const set = new Set();
  if (Array.isArray(data)) {
    data.forEach(r => set.add(`${r.name?.toLowerCase()}|${r.date}|${r.portion}`));
  }
  return set;
}

async function getExistingComments() {
  const data = await supabaseGet('comments?select=name,date,text&limit=10000');
  const set = new Set();
  if (Array.isArray(data)) {
    data.forEach(r => set.add(`${r.name?.toLowerCase()}|${r.date}|${r.text?.slice(0,50)}`));
  }
  return set;
}

// ── Migrate check-ins ─────────────────────────────────────────────────────────

async function migrateCheckins() {
  console.log('\n═══ MIGRATING CHECK-INS ═══');
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${TRACKER_GID}`;
  console.log(`Fetching: ${csvUrl}`);

  const csv = await fetchText(csvUrl);
  const rows = parseCSV(csv);
  if (rows.length < 2) { console.log('No data found in Tracker tab'); return; }

  const headers = rows[0].map(h => h.toLowerCase().trim());
  console.log(`Headers: ${headers.join(' | ')}`);
  console.log(`Total rows: ${rows.length - 1}`);

  // Find column indices
  const tsIdx    = headers.findIndex(h => h.includes('timestamp'));
  const nameIdx  = headers.findIndex(h => h.includes('name'));
  const dateIdx  = headers.findIndex(h => h.includes('date') || h.includes('reading'));
  const portIdx  = headers.findIndex(h => h.includes('portion') || h.includes('nt') || h.includes('ot'));

  console.log(`Column mapping: timestamp=${tsIdx} name=${nameIdx} date=${dateIdx} portion=${portIdx}`);
  if (nameIdx === -1 || dateIdx === -1) {
    console.error('Could not find required columns (name, date). Check sheet headers.');
    return;
  }

  console.log('\nFetching existing Supabase check-ins for dedup...');
  const existing = await getExistingCheckins();
  console.log(`Existing check-ins in Supabase: ${existing.size}`);

  const toInsert = [];
  const skipped = [];
  const errors = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name    = row[nameIdx]?.trim();
    const dateRaw = row[dateIdx]?.trim();
    const portRaw = row[portIdx]?.trim().toUpperCase() || '';
    const ts      = tsIdx !== -1 ? row[tsIdx]?.trim() : null;

    if (!name || !dateRaw) continue;

    const date = parseDate(dateRaw);
    if (!date) { errors.push(`Row ${i+1}: bad date "${dateRaw}"`); continue; }

    // Normalize portion: NT, OT, or BOTH (split into two rows)
    const portions = [];
    if (portRaw.includes('NT') || portRaw === 'N') portions.push('NT');
    if (portRaw.includes('OT') || portRaw === 'O') portions.push('OT');
    if (portions.length === 0) {
      // If no portion specified, assume both
      portions.push('NT', 'OT');
    }

    for (const portion of portions) {
      const key = `${name.toLowerCase()}|${date}|${portion}`;
      if (existing.has(key)) {
        skipped.push(`${name} ${date} ${portion}`);
        continue;
      }
      const record = { name, date, portion };
      if (ts) record.created_at = new Date(ts).toISOString().replace('Invalid Date', new Date().toISOString());
      toInsert.push(record);
    }
  }

  console.log(`\nTo insert: ${toInsert.length}, Skipped (already exist): ${skipped.length}, Errors: ${errors.length}`);
  if (errors.length) console.log('Errors:', errors.slice(0,5));

  if (DRY_RUN) {
    console.log('\n[DRY RUN] First 5 records that would be inserted:');
    toInsert.slice(0,5).forEach(r => console.log(' ', JSON.stringify(r)));
    return;
  }

  if (toInsert.length === 0) { console.log('Nothing to insert.'); return; }

  // Insert in batches of 100
  let inserted = 0, failed = 0;
  for (let i = 0; i < toInsert.length; i += 100) {
    const batch = toInsert.slice(i, i + 100);
    const { status, body } = await supabaseInsert('checkins', batch);
    if (status === 200 || status === 201) {
      inserted += batch.length;
      process.stdout.write(`  Inserted ${inserted}/${toInsert.length}...\r`);
    } else {
      console.error(`\nBatch ${i}-${i+100} failed (${status}): ${body.slice(0,200)}`);
      failed += batch.length;
    }
  }
  console.log(`\n✅ Check-ins done: ${inserted} inserted, ${failed} failed, ${skipped.length} skipped`);
}

// ── Migrate comments ──────────────────────────────────────────────────────────

async function migrateComments(commentsGid) {
  console.log('\n═══ MIGRATING COMMENTS ═══');
  if (!commentsGid) {
    console.log('⚠️  No GID provided for Comments tab.');
    console.log('   Find it by clicking the Comments tab in Google Sheets and checking the URL for gid=XXXXX');
    console.log('   Then run: node migrateFromSheets.js --comments --comments-gid=XXXXX');
    return;
  }

  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${commentsGid}`;
  console.log(`Fetching: ${csvUrl}`);

  const csv = await fetchText(csvUrl);
  const rows = parseCSV(csv);
  if (rows.length < 2) { console.log('No data found in Comments tab'); return; }

  const headers = rows[0].map(h => h.toLowerCase().trim());
  console.log(`Headers: ${headers.join(' | ')}`);

  const tsIdx      = headers.findIndex(h => h.includes('timestamp'));
  const nameIdx    = headers.findIndex(h => h.includes('name'));
  const dateIdx    = headers.findIndex(h => h.includes('date') || h.includes('reading'));
  const commentIdx = headers.findIndex(h => h.includes('comment') || h.includes('text'));

  if (nameIdx === -1 || dateIdx === -1 || commentIdx === -1) {
    console.error('Could not find required columns. Check sheet headers.');
    return;
  }

  console.log('\nFetching existing comments for dedup...');
  const existing = await getExistingComments();
  console.log(`Existing comments in Supabase: ${existing.size}`);

  const toInsert = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name    = row[nameIdx]?.trim();
    const dateRaw = row[dateIdx]?.trim();
    const text    = row[commentIdx]?.trim();
    const ts      = tsIdx !== -1 ? row[tsIdx]?.trim() : null;

    if (!name || !dateRaw || !text) continue;
    const date = parseDate(dateRaw);
    if (!date) continue;

    const key = `${name.toLowerCase()}|${date}|${text.slice(0,50)}`;
    if (existing.has(key)) continue;

    const record = { name, date, text, parent_id: null, reactions: {} };
    if (ts) {
      const d = new Date(ts);
      if (!isNaN(d)) record.created_at = d.toISOString();
    }
    toInsert.push(record);
  }

  console.log(`To insert: ${toInsert.length}`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] First 5 comments:');
    toInsert.slice(0,5).forEach(r => console.log(' ', JSON.stringify({...r, text: r.text.slice(0,60)})));
    return;
  }

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 50) {
    const batch = toInsert.slice(i, i + 50);
    const { status, body } = await supabaseInsert('comments', batch);
    if (status === 200 || status === 201) inserted += batch.length;
    else console.error(`Batch failed (${status}): ${body.slice(0,200)}`);
  }
  console.log(`✅ Comments done: ${inserted} inserted`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Migrating: ${[DO_CHECKINS && 'checkins', DO_COMMENTS && 'comments'].filter(Boolean).join(' + ')}\n`);

  // Parse optional --comments-gid argument
  const gidArg = process.argv.find(a => a.startsWith('--comments-gid='));
  const commentsGid = gidArg ? gidArg.split('=')[1] : null;

  if (DO_CHECKINS) await migrateCheckins();
  if (DO_COMMENTS) await migrateComments(commentsGid);

  console.log('\nDone!');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

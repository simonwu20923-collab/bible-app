// fixAudioChapters.js
// Finds and fixes rows where nt_audio or ot_audio have more chapters than the title indicates
// Run from C:\Users\simon\bible-app with: node fixAudioChapters.js
// Add --fix to actually write the corrections to Supabase

const https = require('https');
const path = require('path');

// Try loading .env in case variables are defined there
try { require('dotenv').config({ path: path.join(__dirname, '.env') }); } catch {}

// Supabase URL — hardcoded since we know the project ID
const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';

// Key: accept via --key argument, or fall back to any common env var name
let SUPABASE_KEY = null;
const keyArgIdx = process.argv.indexOf('--key');
if (keyArgIdx !== -1 && process.argv[keyArgIdx + 1]) {
  SUPABASE_KEY = process.argv[keyArgIdx + 1];
} else {
  SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.REACT_APP_SUPABASE_KEY
    || process.env.SUPABASE_KEY;
}

const DRY_RUN = !process.argv.includes('--fix');

if (!SUPABASE_KEY) {
  console.error('Could not find your Supabase anon key.');
  console.error('Pass it directly like this:');
  console.error('');
  console.error('  node fixAudioChapters.js --key YOUR_ANON_KEY');
  console.error('');
  console.error('Find it in: Supabase dashboard > Project Settings > API > anon (public) key');
  process.exit(1);
}

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
    const options = {
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    };
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Parse chapter range from a title like:
//   "New Testament - Matt. 28:1~28:20"     -> { start: 28, end: 28 }
//   "Old Testament - 2 King 6:8~8:29"      -> { start: 6, end: 8 }
//   "Old Testament - 2 King 15:23 ~ 17:41" -> { start: 15, end: 17 }
// Returns { crossBook: true } for cross-book titles like "1 King 22:51~2 King 2:18"
function parseChapterRange(title) {
  if (!title) return null;

  // Remove "New/Old Testament - " prefix
  const clean = title.replace(/^(New|Old) Testament\s*-\s*/i, '').trim();

  // Detect cross-book titles (e.g. "1 King 22:51~2 King 2:18")
  // These have a second book name after the separator - skip them
  if (/\d+\s*[~\-]\s*\d+\s+[A-Za-z]/.test(clean)) {
    return { crossBook: true };
  }

  // Extract the verse range at the end of the string, allowing spaces around separator
  // e.g. "2 King 15:23 ~ 17:41" -> range portion is "15:23 ~ 17:41"
  const m = clean.match(/(\d+:\d+)\s*[~\-]\s*(\d+:\d+)\s*$/);
  if (m) {
    const start = parseInt(m[1].split(':')[0]);
    const end   = parseInt(m[2].split(':')[0]);
    return { start, end };
  }

  // Single-chapter reading: e.g. "Mark 4:1~20" or "Num. 7:1~89" (no EndChap prefix)
  const single = clean.match(/(\d+):\d+\s*[~\-]\s*\d+\s*$/);
  if (single) {
    const chap = parseInt(single[1]);
    return { start: chap, end: chap };
  }

  // Fallback: single verse reference like "Mark 4:1"
  const solo = clean.match(/(\d+):\d+\s*$/);
  if (solo) {
    const chap = parseInt(solo[1]);
    return { start: chap, end: chap };
  }

  return null;
}

async function main() {
  console.log(DRY_RUN
    ? '🔍 DRY RUN — will report issues but NOT write to Supabase. Add --fix to apply fixes.\n'
    : '✏️  FIX MODE — will update Supabase with corrected audio arrays.\n'
  );

  // Fetch all rows that have audio data
  console.log('Fetching all rows with audio data from Supabase...');
  const { status, body: rows } = await supabaseRequest(
    'GET',
    'verses?select=date,nt_title,ot_title,nt_audio,ot_audio,nt_audio_zh,ot_audio_zh&order=date.asc',
    null
  );

  if (status !== 200 || !Array.isArray(rows)) {
    console.error('Failed to fetch rows:', status, rows);
    process.exit(1);
  }

  console.log(`Fetched ${rows.length} rows.\n`);

  const issues = [];

  for (const row of rows) {
    const fixes = {};
    let hasIssue = false;

    const allAudioPairs = [
      ['nt_title', 'nt_audio'],
      ['ot_title', 'ot_audio'],
      ['nt_title', 'nt_audio_zh'],
      ['ot_title', 'ot_audio_zh'],
    ];

    for (const [titleKey, audioKey] of allAudioPairs) {
      const title = row[titleKey];
      const audioJson = row[audioKey];
      if (!audioJson) continue;

      let urls;
      try { urls = JSON.parse(audioJson); } catch { continue; }
      if (!Array.isArray(urls)) continue;

      const range = parseChapterRange(title);
      if (!range) {
        console.warn(`  ⚠️  Could not parse chapter range from title: "${title}" (${row.date})`);
        continue;
      }

      // Skip cross-book readings — the stored audio is likely correct
      if (range.crossBook) {
        console.log(`  ⏭️  ${row.date} [${audioKey}] — cross-book title, skipping: "${title}"`);
        continue;
      }

      const expected = range.end - range.start + 1;
      const actual = urls.length;

      if (actual > expected) {
        // Too many chapters — safe to trim
        hasIssue = true;
        const trimmed = urls.slice(0, expected);
        fixes[audioKey] = JSON.stringify(trimmed);

        console.log(`  ❌ ${row.date} [${audioKey}]`);
        console.log(`     Title:    "${title}"`);
        console.log(`     Expected: ${expected} chapter(s) (${range.start}–${range.end})`);
        console.log(`     Actual:   ${actual} chapter(s) — TOO MANY`);
        console.log(`     Fix:      trim to first ${expected} URL(s)\n`);
      } else if (actual < expected) {
        // Too few chapters — cannot auto-fix (would need to re-fetch M3U)
        console.log(`  ⚠️  ${row.date} [${audioKey}]`);
        console.log(`     Title:    "${title}"`);
        console.log(`     Expected: ${expected} chapter(s) (${range.start}–${range.end})`);
        console.log(`     Actual:   ${actual} chapter(s) — TOO FEW (manual fix needed)\n`);
      }
    }

    if (Object.keys(fixes).length > 0) {
      issues.push({ date: row.date, fixes });
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Found ${issues.length} row(s) with audio chapter mismatches.`);

  if (issues.length === 0) {
    console.log('✅ All audio arrays look correct!');
    return;
  }

  if (DRY_RUN) {
    console.log('\nRun with --fix to apply corrections:');
    console.log('  node fixAudioChapters.js --key YOUR_KEY --fix');
    return;
  }

  // Apply fixes
  console.log('\nApplying fixes...');
  let fixed = 0, failed = 0;

  for (const { date, fixes } of issues) {
    const { status, body } = await supabaseRequest(
      'PATCH',
      `verses?date=eq.${date}`,
      fixes
    );
    if (status === 200 || status === 204) {
      console.log(`  ✅ Fixed ${date}`);
      fixed++;
    } else {
      console.error(`  ❌ Failed to fix ${date}: ${status}`, body);
      failed++;
    }
  }

  console.log(`\nDone. Fixed: ${fixed}, Failed: ${failed}`);
}

main().catch(console.error);

// checkVerses.js
// Checks the first and last verse of nt_text and ot_text for all 365 days
// against what the title says they should be.
// Outputs a report of any mismatches.
//
// Run: node checkVerses.js --key YOUR_KEY

const https = require('https');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const keyArgIdx = process.argv.indexOf('--key');
const SUPABASE_KEY = keyArgIdx !== -1 ? process.argv[keyArgIdx + 1] : 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';

// ── Supabase ──────────────────────────────────────────────────────────────────

function supabaseGet(path) {
  return new Promise((resolve, reject) => {
    https.get(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error(`JSON parse error: ${data.slice(0,200)}`)); }
      });
    }).on('error', reject);
  });
}

// ── Verse line parser ─────────────────────────────────────────────────────────
// Handles "1K 22 :51 text" (space before colon) and "Mt 1:1 text"

function parseVerseLines(raw) {
  if (!raw) return [];
  const verses = [];
  for (const line of raw.split('\n').map(l => l.trim()).filter(Boolean)) {
    const m = line.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)\s+(.+)$/);
    if (!m) continue;
    const chap = parseInt(m[2]), verse = parseInt(m[3]);
    if (chap > 0 && verse > 0)
      verses.push({ prefix: m[1].trim(), chap, verse, text: m[4].trim().slice(0, 60) });
  }
  return verses;
}

// ── Title parser ──────────────────────────────────────────────────────────────
// Returns { startBook, startChap, startVerse, endBook, endChap, endVerse }
// from titles like:
//   "New Testament - Matt. 1:1~1:25"
//   "Old Testament - 1 King 22:51~2 King 2:18"
//   "Old Testament - Gen. 1:1~2:25"

function normalizeAbbrev(b) {
  // Normalize common abbreviations to a canonical form for comparison
  return b.trim()
    .replace(/\.$/, '')        // remove trailing dot
    .replace(/^Mt$/, 'Matt')   // Mt → Matt
    .replace(/^Gn$/, 'Gen')
    .replace(/^Lv$/, 'Lev')
    .replace(/^Nm$/, 'Num')
    .replace(/^Dt$/, 'Deut')
    .replace(/^Jos$/, 'Josh')
    .replace(/^Jdg$/, 'Judg')
    .replace(/^Is$/, 'Isa')
    .replace(/^Je$/, 'Jer')
    .replace(/^La$/, 'Lam')
    .replace(/^Ez$/, 'Ezek')
    .replace(/^Da$/, 'Dan')
    .replace(/^Ho$/, 'Hos')
    .replace(/^Mi$/, 'Mic')
    .replace(/^Na$/, 'Nah')
    .replace(/^Zep$/, 'Zeph')
    .replace(/^Hg$/, 'Hag')
    .replace(/^Zec$/, 'Zech')
    .replace(/^Re$/, 'Rev')
    .replace(/^Ac$/, 'Acts')
    .replace(/^Ro$/, 'Rom')
    .replace(/^Ga$/, 'Gal')
    .replace(/^Ep$/, 'Eph')
    .replace(/^Php$/, 'Phil')
    .replace(/^He$/, 'Heb')
    .replace(/^1K$/, '1 Kings')
    .replace(/^2K$/, '2 Kings')
    .replace(/^1S$/, '1 Sam')
    .replace(/^2S$/, '2 Sam')
    .replace(/^1C$/, '1 Chr')
    .replace(/^2C$/, '2 Chr');
}

function parseTitle(title) {
  if (!title) return null;
  const clean = title.replace(/^(Old|New) Testament\s*-\s*/i, '').trim();

  // Cross-book: "1 King 22:51~2 King 2:18"
  const cross = clean.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)\s*[~\-]\s*(.+?)\s+(\d+)\s*:\s*(\d+)$/);
  if (cross) return {
    startBook: normalizeAbbrev(cross[1]), startChap: +cross[2], startVerse: +cross[3],
    endBook:   normalizeAbbrev(cross[4]), endChap:   +cross[5], endVerse:   +cross[6],
  };

  // Same-book: "Matt. 1:1~1:25" or "Gen. 1:1~2:25"
  const same = clean.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)\s*[~\-]\s*(\d+)\s*:\s*(\d+)$/);
  if (same) {
    const book = normalizeAbbrev(same[1]);
    return {
      startBook: book, startChap: +same[2], startVerse: +same[3],
      endBook:   book, endChap:   +same[4], endVerse:   +same[5],
    };
  }

  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching all 365 days from Supabase...');
  const rows = await supabaseGet(
    'verses?select=date,nt_title,ot_title,nt_text,ot_text&order=date.asc&limit=365'
  );
  console.log(`Fetched ${rows.length} rows.\n`);

  const errors = [];
  let checked = 0;

  for (const row of rows) {
    const { date, nt_title, ot_title, nt_text, ot_text } = row;

    for (const [titleKey, textKey, label] of [
      ['nt_title', 'nt_text', 'NT'],
      ['ot_title', 'ot_text', 'OT'],
    ]) {
      const title = row[titleKey];
      const text  = row[textKey];
      if (!title || !text) continue;

      const expected = parseTitle(title);
      if (!expected) {
        errors.push({ date, label, issue: `Could not parse title: "${title}"` });
        continue;
      }

      const verses = parseVerseLines(text);
      if (verses.length === 0) {
        errors.push({ date, label, issue: `No verses parsed from text. Title: "${title}"` });
        continue;
      }

      const first = verses[0];
      const last  = verses[verses.length - 1];

      const firstBookNorm = normalizeAbbrev(first.prefix);
      const lastBookNorm  = normalizeAbbrev(last.prefix);

      const firstOk = firstBookNorm === expected.startBook &&
                      first.chap   === expected.startChap &&
                      first.verse  === expected.startVerse;

      const lastOk  = lastBookNorm  === expected.endBook &&
                      last.chap    === expected.endChap &&
                      last.verse   === expected.endVerse;

      if (!firstOk || !lastOk) {
        const issue = [];
        if (!firstOk) {
          issue.push(
            `FIRST VERSE: got ${first.prefix} ${first.chap}:${first.verse}` +
            ` → expected ${expected.startBook} ${expected.startChap}:${expected.startVerse}`
          );
        }
        if (!lastOk) {
          issue.push(
            `LAST VERSE:  got ${last.prefix} ${last.chap}:${last.verse}` +
            ` → expected ${expected.endBook} ${expected.endChap}:${expected.endVerse}`
          );
        }
        errors.push({ date, label, title, issue: issue.join('\n          ') });
      }
      checked++;
    }
  }

  console.log(`Checked ${checked} readings.\n`);
  console.log(`${'='.repeat(65)}`);

  if (errors.length === 0) {
    console.log('✅ All first and last verses match their titles!');
    return;
  }

  console.log(`❌ Found ${errors.length} mismatch(es):\n`);
  for (const e of errors) {
    console.log(`  ${e.date} [${e.label}]`);
    if (e.title) console.log(`    Title:  "${e.title}"`);
    console.log(`    ${e.issue}`);
    console.log('');
  }

  // Summary list for easy reference
  console.log(`${'='.repeat(65)}`);
  console.log('Summary — dates needing manual review:');
  const uniqueDates = [...new Set(errors.map(e => `${e.date} [${e.label}]`))];
  uniqueDates.forEach(d => console.log(`  ${d}`));
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });

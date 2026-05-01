// fixMay26Text.js
// Fixes two data issues in May 26 "1 King 22:51~2 King 2:18":
//
// 1. Spanish verse refs: "1 King 1:1" → "2 King 1:1" (and "1 King 2:x" → "2 King 2:x")
//    The scraper stored 2 Kings verses with the wrong book label.
//
// 2. Chinese text (zh/sc): Only has 1 Kings 22 content. Need to fetch 2 Kings 1:1-2:18
//    from bible.fhl.net and append it.
//
// Run:       node fixMay26Text.js --key YOUR_KEY
// Apply fix: node fixMay26Text.js --key YOUR_KEY --fix

const https = require('https');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const TARGET_DATE  = '2026-05-26';

const keyArgIdx = process.argv.indexOf('--key');
const SUPABASE_KEY = keyArgIdx !== -1 ? process.argv[keyArgIdx + 1] : null;
const DRY_RUN = !process.argv.includes('--fix');

if (!SUPABASE_KEY) {
  console.error('Usage: node fixMay26Text.js --key YOUR_KEY [--fix]');
  process.exit(1);
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

function supabaseGet(path) {
  return new Promise((resolve, reject) => {
    https.get(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function supabasePatch(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── Fix 1: Spanish text — replace wrong book refs ─────────────────────────────

function fixSpanishText(text) {
  if (!text) return null;
  // Pattern: verse refs embedded like "1 King 1:1" or "1K 1:1" for 2 Kings verses
  // 2 Kings chapters are 1 and 2 in this reading.
  // Replace "1 King 1:" → "2 King 1:", "1 King 2:" → "2 King 2:"
  // Also handle "1K 1:", "1K 2:" abbreviations
  let fixed = text;

  // Replace "1 King 1:N" → "2 King 1:N" and "1 King 2:N" → "2 King 2:N"
  fixed = fixed.replace(/\b1 King (1:\d+)/g, '2 King $1');
  fixed = fixed.replace(/\b1 King (2:\d+)/g, '2 King $1');

  // Also handle abbreviated "1K 1:N" → "2K 1:N"
  fixed = fixed.replace(/\b1K (1:\d+)/g, '2K $1');
  fixed = fixed.replace(/\b1K (2:\d+)/g, '2K $1');

  return fixed === text ? null : fixed; // return null if no changes needed
}

// ── Fix 2: Fetch Chinese text from bible.fhl.net ──────────────────────────────

// Fetch Traditional Chinese for a range from bible.fhl.net
async function fetchZhText(book, startChap, startVerse, endChap, endVerse, simplified = false) {
  // bible.fhl.net query format: bf=fhl&q=2KI+1:1-2:18&gb=0 (Traditional)
  // bible.fhl.net/gbdoc format for Simplified
  const bookCode = book === '2Kings' ? '2KI' : book;
  const range = `${bookCode}+${startChap}:${startVerse}-${endChap}:${endVerse}`;

  let url;
  if (simplified) {
    url = `https://bible.fhl.net/gbdoc/ob.php?bf=fhl&q=${range}&gb=1`;
  } else {
    url = `https://bible.fhl.net/ob.php?bf=fhl&q=${range}&gb=0`;
  }

  console.log(`  Fetching: ${url}`);
  try {
    const html = await fetchText(url);

    // Extract verse lines from the HTML
    // bible.fhl.net wraps verses in spans/divs — parse relevant content
    const lines = [];
    const verseRegex = /<span[^>]*class="[^"]*vnum[^"]*"[^>]*>(\d+)<\/span>\s*<span[^>]*class="[^"]*vtext[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
    let m;
    let currentChap = startChap;

    // Also look for chapter markers
    const chapRegex = /<[^>]*class="[^"]*chapter[^"]*"[^>]*>.*?(\d+).*?<\/[^>]*>/gi;

    // Simpler approach: extract all text between verse number markers
    // Look for pattern like "1 " followed by verse text
    const simpleVerse = /王下(\d+):(\d+)\s+([^\n<]+)/g;
    const simpleVerseEn = /2KI\s*(\d+):(\d+)\s+([^\n<]+)/g;

    // Try to extract verse text from common bible.fhl.net HTML structure
    // The format varies, let's grab text nodes between tags
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`  HTML stripped preview: ${stripped.slice(0, 200)}`);
    return { raw: stripped, html: html.slice(0, 500) };
  } catch(e) {
    console.error(`  Fetch error: ${e.message}`);
    return null;
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN\n' : '✏️  FIX MODE\n');

  // Fetch current May 26 data
  console.log('Fetching May 26 from Supabase...');
  const [row] = await supabaseGet(
    `verses?select=ot_text_es,ot_text_zh,ot_text_sc&date=eq.${TARGET_DATE}`
  );
  if (!row) { console.error('Row not found'); process.exit(1); }

  const { ot_text_es, ot_text_zh, ot_text_sc } = row;

  // ── Fix 1: Spanish ───────────────────────────────────────────────────────────
  console.log('\n=== Fix 1: Spanish verse refs ===');
  if (!ot_text_es) {
    console.log('No Spanish text stored. Skipping.');
  } else {
    // Show lines that have 2 Kings refs
    const lines = ot_text_es.split('\n');
    const badLines = lines.filter(l => /\b1 King [12]:/.test(l) || /\b1K [12]:/.test(l));
    console.log(`Found ${badLines.length} lines with wrong book refs:`);
    badLines.slice(0, 5).forEach(l => console.log(`  "${l}"`));
    if (badLines.length > 5) console.log(`  ...and ${badLines.length - 5} more`);

    const fixedEs = fixSpanishText(ot_text_es);
    if (fixedEs) {
      console.log('✅ Spanish text can be fixed by replacing "1 King 1/2:" → "2 King 1/2:"');
    } else {
      console.log('No changes needed (either already correct or different format).');
      console.log('First 300 chars of stored text:');
      console.log(ot_text_es.slice(0, 300));
    }
  }

  // ── Fix 2: Chinese text ──────────────────────────────────────────────────────
  console.log('\n=== Fix 2: Chinese text — checking what\'s stored ===');
  if (ot_text_zh) {
    const zhLines = ot_text_zh.split('\n').filter(l => l.trim());
    console.log(`Traditional Chinese: ${zhLines.length} lines`);
    console.log('Last 3 lines:', zhLines.slice(-3));
    // Check if it already has 2 Kings content (王下 or 2K)
    const has2Kings = ot_text_zh.includes('王下') || ot_text_zh.includes('2K');
    console.log(has2Kings ? '✅ Already has 2 Kings content' : '❌ Missing 2 Kings content');
  } else {
    console.log('No Traditional Chinese text stored');
  }

  if (ot_text_sc) {
    const scLines = ot_text_sc.split('\n').filter(l => l.trim());
    console.log(`\nSimplified Chinese: ${scLines.length} lines`);
    console.log('Last 3 lines:', scLines.slice(-3));
    const has2Kings = ot_text_sc.includes('王下') || ot_text_sc.includes('2K');
    console.log(has2Kings ? '✅ Already has 2 Kings content' : '❌ Missing 2 Kings content');
  }

  // Try fetching 2 Kings 1:1-2:18 from bible.fhl.net (diagnostic)
  console.log('\n=== Fetching 2 Kings 1:1-2:18 from bible.fhl.net (Traditional) ===');
  const zhFetch = await fetchZhText('2Kings', 1, 1, 2, 18, false);

  console.log('\n=== Fetching 2 Kings 1:1-2:18 from bible.fhl.net (Simplified) ===');
  const scFetch = await fetchZhText('2Kings', 1, 1, 2, 18, true);

  if (DRY_RUN) {
    console.log('\nDry run done. Check output above to verify before running --fix.');
    console.log('NOTE: The Chinese text fetch shows diagnostic info only.');
    console.log('If the Spanish fix looks correct, run with --fix.');
    return;
  }

  // Apply Spanish fix
  const patch = {};
  if (ot_text_es) {
    const fixedEs = fixSpanishText(ot_text_es);
    if (fixedEs) patch.ot_text_es = fixedEs;
  }

  if (Object.keys(patch).length > 0) {
    const result = await supabasePatch(`verses?date=eq.${TARGET_DATE}`, patch);
    if (result.status === 200 || result.status === 204) {
      console.log('✅ Spanish text fixed');
    } else {
      console.error('❌ Spanish fix failed:', result.status, result.body);
    }
  }

  console.log('\nNote: Chinese text fix requires manual verification of the fetched content.');
  console.log('Run without --fix first to inspect what bible.fhl.net returns.');
}

main().catch(console.error);

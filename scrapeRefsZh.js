// scrapeRefsZh.js — Scrape ZH cross-references and footnotes from ezoe.work
// Populates:
//   bible_chapters.text_sc_marked  (simplified Chinese marked verse text)
//   bible_chapters.text_zh_marked  (traditional Chinese marked verse text)
//   bible_refs rows with lang='sc' (simplified content)
//   bible_refs rows with lang='zh' (traditional content, converted via OpenCC)
//
// Requires: npm install opencc-js
//
// Usage:
//   node scrapeRefsZh.js --book=Mt          # scrape just Matthew
//   node scrapeRefsZh.js --book=Mt,Mk,Lk    # multiple books
//   node scrapeRefsZh.js                    # all 66 books (slow!)
//   node scrapeRefsZh.js --dry              # dry run, no DB writes

const https   = require('https');
const opencc  = require('opencc-js');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lsvhmvkhernimxmzcyak.supabase.co',
  'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc'
);
const DRY = process.argv.includes('--dry');

// SC → TW converter
const toTW = opencc.Converter({ from: 'cn', to: 'tw' });

// ── Book number (hf_XX) → our book_abbr ──────────────────────────────────────
// Standard Protestant Bible book order: OT 1-39, NT 40-66
const BOOK_NUM_MAP = {
  // OT
  1:'Gen', 2:'Exo', 3:'Lev', 4:'Num', 5:'Deut',
  6:'Josh', 7:'Judg', 8:'Ruth', 9:'1Sam', 10:'2Sam',
  11:'1Kgs', 12:'2Kgs', 13:'1Chr', 14:'2Chr', 15:'Ezra',
  16:'Neh', 17:'Esth', 18:'Job', 19:'Ps', 20:'Prov',
  21:'Eccl', 22:'Song', 23:'Isa', 24:'Jer', 25:'Lam',
  26:'Ezek', 27:'Dan', 28:'Hos', 29:'Joel', 30:'Amos',
  31:'Obad', 32:'Jonah', 33:'Mic', 34:'Nah', 35:'Hab',
  36:'Zeph', 37:'Hag', 38:'Zech', 39:'Mal',
  // NT
  40:'Mt', 41:'Mk', 42:'Lk', 43:'Jn', 44:'Acts',
  45:'Rm', 46:'1Co', 47:'2Co', 48:'Gal', 49:'Eph',
  50:'Phil', 51:'Col', 52:'1Th', 53:'2Th', 54:'1Ti',
  55:'2Ti', 56:'Tit', 57:'Phm', 58:'Heb', 59:'Jas',
  60:'1Pe', 61:'2Pe', 62:'1Jn', 63:'2Jn', 64:'3Jn',
  65:'Jude', 66:'Rev',
};

// Reverse: our book_abbr → hf_ book number
const ABBR_TO_NUM = Object.fromEntries(Object.entries(BOOK_NUM_MAP).map(([n, a]) => [a, parseInt(n)]));

// ── HTTP helper ───────────────────────────────────────────────────────────────
function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    }, res => {
      if (res.statusCode === 301 || res.statusCode === 302)
        return get(res.headers.location).then(resolve).catch(reject);
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout: ' + url)); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function stripHtml(html) {
  return html
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#160;/g, ' ').replace(/&#x[0-9a-f]+;/gi, '')
    .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// ── Extract marked verse text ─────────────────────────────────────────────────
// Converts <sup id="uuz1">N</sup> → [N] and <sup id="uuz">L</sup> → [L]
// Returns { verseNum: 'marked text SC', ... }
function extractMarkedVerses(html) {
  const verses = {};
  // Find all <p id="AA00">...</p> blocks
  const re = /<p id="AA00">([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(html))) {
    let content = m[1];
    // Leading verse number is "N　" (full-width space after number)
    const numMatch = content.match(/^(\d+)　/);
    if (!numMatch) continue;
    const verseNum = parseInt(numMatch[1]);
    content = content.slice(numMatch[0].length);

    // Replace <sup id="uuz1">N</sup> → [N]  and  <sup id="uuz">L</sup> → [L]
    content = content
      .replace(/<sup id="uuz1">([^<]+)<\/sup>/g, (_, mk) => `[${mk}]`)
      .replace(/<sup id="uuz">([^<]+)<\/sup>/g,  (_, mk) => `[${mk}]`);

    const marked = stripHtml(content).replace(/\s+/g, ' ').trim();
    if (marked) verses[verseNum] = marked;
  }
  return verses;
}

// ── Extract footnotes and cross-references ────────────────────────────────────
// Returns [{ verse, marker, type, content }] in Simplified Chinese
function extractNotes(html) {
  const notes = [];

  // We parse the HTML in document order. Each <dd> block belongs to one verse.
  // The verse number comes from <p id="AA00"> at the start of the <dd>.
  // Notes follow: AA1/AA2 pairs (footnotes), BB1/BB2 pairs (cross-refs)

  const ddRe = /<dd>([\s\S]*?)<\/dd>/g;
  let ddm;
  while ((ddm = ddRe.exec(html))) {
    const ddContent = ddm[1];

    // Get verse number from the AA00 paragraph
    const vnMatch = ddContent.match(/<p id="AA00">(\d+)　/);
    if (!vnMatch) continue;
    const verseNum = parseInt(vnMatch[1]);

    // ── Footnotes: AA1 (header with number) + AA2 (body) pairs ──────────────
    const fnRe = /<p id="AA1">[^<]*<sup id="zhu">(\d+)<\/sup><\/p>\s*<p id="AA2">([\s\S]*?)<\/p>/g;
    let fn;
    while ((fn = fnRe.exec(ddContent))) {
      const marker  = fn[1];
      const rawText = fn[2]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
        .replace(/<[^>]+>/g, '').replace(/&#x[0-9a-f]+;/gi, '')
        .replace(/[ \t]+/g, ' ').trim();
      if (rawText) notes.push({ verse: verseNum, marker, type: 'fn', content: rawText });
    }

    // ── Cross-refs: BB1 (header with letter + ref list) + BB2 (quoted verses) ─
    const crRe = /<p id="BB1">[^<]*<sup id="chuan">([^<]+)<\/sup>　([\s\S]*?)<\/p>\s*(?:<p id="BB2">([\s\S]*?)<\/p>)?/g;
    let cr;
    while ((cr = crRe.exec(ddContent))) {
      const marker   = cr[1].trim();
      const refLabel = stripHtml(cr[2]).replace(/\s+/g, ' ').trim(); // e.g. "太一16～17"
      const quotedRaw = cr[3] || '';
      // BB2 quoted verses: "太1:16　verse text\n太1:17　verse text"
      const quotedText = quotedRaw
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
        .replace(/<[^>]+>/g, '').replace(/&#x[0-9a-f]+;/gi, '')
        .replace(/[ \t]+/g, ' ').replace(/　/g, '  ').trim();

      // Store: refLabel on first line, quoted text below (same pattern as EN combined notes)
      const content = quotedText ? refLabel + '\n\n' + quotedText : refLabel;
      if (content) notes.push({ verse: verseNum, marker, type: 'cr', content });
    }
  }
  return notes;
}

// ── Get chapter count ─────────────────────────────────────────────────────────
async function getChapterCount(bookAbbr) {
  const { data } = await supabase
    .from('bible_chapters').select('chapter')
    .eq('book_abbr', bookAbbr).order('chapter', { ascending: false }).limit(1).single();
  return data?.chapter ?? 0;
}

// ── Scrape one chapter ────────────────────────────────────────────────────────
async function scrapeChapter(bookAbbr, chapter) {
  const bookNum = ABBR_TO_NUM[bookAbbr];
  if (!bookNum) { console.error(`  ✗ No book number for ${bookAbbr}`); return; }

  const url = `https://ezoe.work/bible/jw/hf_${bookNum}_${chapter}.html`;
  let html;
  try {
    ({ body: html } = await get(url));
  } catch (e) {
    console.error(`  ✗ Fetch error ${bookAbbr} ch${chapter}:`, e.message);
    return;
  }

  const markedVersesSC = extractMarkedVerses(html);
  const notesSC        = extractNotes(html);

  const verseCount = Object.keys(markedVersesSC).length;
  const noteCount  = notesSC.length;
  console.log(`  ${bookAbbr} ch${chapter}: ${verseCount} marked verses, ${noteCount} notes`);

  if (verseCount === 0 && noteCount === 0) return;
  if (DRY) { console.log('  [DRY — not saved]'); return; }

  // Build SC marked text string
  const scMarkedText = Object.keys(markedVersesSC)
    .map(n => parseInt(n)).sort((a, b) => a - b)
    .map(n => `${n} ${markedVersesSC[n]}`).join('\n');

  // Convert SC → TW
  const zhMarkedText = toTW(scMarkedText);

  // Save marked text columns
  if (scMarkedText) {
    const { error } = await supabase.from('bible_chapters')
      .update({ text_sc_marked: scMarkedText, text_zh_marked: zhMarkedText })
      .eq('book_abbr', bookAbbr).eq('chapter', chapter);
    if (error) console.error(`  ✗ bible_chapters update:`, error.message);
  }

  // Upsert refs — SC version and TW version
  if (notesSC.length > 0) {
    // Deduplicate
    const seenSC = new Map();
    for (const n of notesSC) {
      const key = `${n.verse}_${n.marker}`;
      const ex = seenSC.get(key);
      if (!ex || n.content.length > ex.content.length) seenSC.set(key, n);
    }

    const scRows = [...seenSC.values()].map(n => ({
      book_abbr: bookAbbr, chapter, verse: n.verse,
      marker: n.marker, type: n.type, content: n.content, lang: 'sc',
    }));

    // TW versions: same structure, content converted
    const zhRows = scRows.map(r => ({ ...r, content: toTW(r.content), lang: 'zh' }));

    const allRows = [...scRows, ...zhRows];
    const { error } = await supabase.from('bible_refs')
      .upsert(allRows, { onConflict: 'book_abbr,chapter,verse,marker,lang' });
    if (error) console.error(`  ✗ bible_refs upsert:`, error.message);
    else console.log(`  ✓ Saved ${scRows.length} SC + ${zhRows.length} TW refs`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (DRY) console.log('=== DRY RUN — no DB writes ===\n');

  const bookArg = process.argv.find(a => a.startsWith('--book='));
  const books   = bookArg
    ? bookArg.replace('--book=', '').split(',').map(s => s.trim())
    : Object.values(BOOK_NUM_MAP);

  console.log(`Scraping ${books.length} book(s) (ZH)...\n`);

  for (const bookAbbr of books) {
    const chCount = await getChapterCount(bookAbbr);
    if (chCount === 0) { console.log(`${bookAbbr}: not found in DB, skipping`); continue; }
    console.log(`\n── ${bookAbbr} (${chCount} chapters) ──`);
    for (let ch = 1; ch <= chCount; ch++) {
      await scrapeChapter(bookAbbr, ch);
      await sleep(350);
    }
  }

  console.log('\nDone.');
}

main().catch(console.error);

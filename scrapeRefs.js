// scrapeRefs.js — Scrape cross-references and footnotes from bibleread.online
// Populates: bible_chapters.text_en_marked, bible_refs table
//
// Usage:
//   node scrapeRefs.js --book=Mt          # scrape just Matthew
//   node scrapeRefs.js --book=Mt,Mk,Lk    # multiple books
//   node scrapeRefs.js                    # all 66 books (slow!)
//   node scrapeRefs.js --dry              # dry run, no DB writes

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lsvhmvkhernimxmzcyak.supabase.co',
  'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc'
);
const DRY = process.argv.includes('--dry');

// ── Book slug mapping ──────────────────────────────────────────────────────
const BOOK_SLUGS = {
  // New Testament
  Mt:    'the-gospel-according-to-matthew',
  Mk:    'the-gospel-according-to-mark',
  Lk:    'the-gospel-according-to-luke',
  Jn:    'the-gospel-according-to-john',
  Acts:  'the-acts-of-the-apostles',
  Rm:    'the-epistle-of-paul-to-the-romans',
  '1Co': 'the-first-epistle-of-paul-to-the-corinthians',
  '2Co': 'the-second-epistle-of-paul-to-the-corinthians',
  Gal:   'the-epistle-of-paul-to-the-galatians',
  Eph:   'the-epistle-of-paul-to-the-ephesians',
  Phil:  'the-epistle-of-paul-to-the-philippians',
  Col:   'the-epistle-of-paul-to-the-colossians',
  '1Th': 'the-first-epistle-of-paul-to-the-thessalonians',
  '2Th': 'the-second-epistle-of-paul-to-the-thessalonians',
  '1Ti': 'the-first-epistle-of-paul-to-timothy',
  '2Ti': 'the-second-epistle-of-paul-to-timothy',
  Tit:   'the-epistle-of-paul-to-titus',
  Phm:   'the-epistle-of-paul-to-philemon',
  Heb:   'the-epistle-to-the-hebrews',
  Jas:   'the-epistle-of-james',
  '1Pe': 'the-first-epistle-of-peter',
  '2Pe': 'the-second-epistle-of-peter',
  '1Jn': 'the-first-epistle-of-john',
  '2Jn': 'the-second-epistle-of-john',
  '3Jn': 'the-third-epistle-of-john',
  Jude:  'the-epistle-of-jude',
  Rev:   'revelation',
  // Old Testament
  Gen:   'genesis',
  Exo:   'exodus',
  Lev:   'leviticus',
  Num:   'numbers',
  Deut:  'deuteronomy',
  Josh:  'joshua',
  Judg:  'judges',
  Ruth:  'ruth',
  '1Sam':'first-samuel',
  '2Sam':'second-samuel',
  '1Kgs':'first-kings',
  '2Kgs':'second-kings',
  '1Chr':'first-chronicles',
  '2Chr':'second-chronicles',
  Ezra:  'ezra',
  Neh:   'nehemiah',
  Esth:  'esther',
  Job:   'job',
  Ps:    'psalms',
  Prov:  'proverbs',
  Eccl:  'ecclesiastes',
  Song:  'song-of-songs',
  Isa:   'isaiah',
  Jer:   'jeremiah',
  Lam:   'lamentations',
  Ezek:  'ezekiel',
  Dan:   'daniel',
  Hos:   'hosea',
  Joel:  'joel',
  Amos:  'amos',
  Obad:  'obadiah',
  Jonah: 'jonah',
  Mic:   'micah',
  Nah:   'nahum',
  Hab:   'habakkuk',
  Zeph:  'zephaniah',
  Hag:   'haggai',
  Zech:  'zechariah',
  Mal:   'malachi',
};

// ── HTTP helper ────────────────────────────────────────────────────────────
function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout: ' + url)); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function stripHtml(html) {
  return html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#160;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Extract marked verse text from /bible/{slug}/{ch}/ ────────────────────
// Converts <span class='anchor'><sup>marker</sup>word</span> → [marker]word
function extractMarkedVerses(html) {
  const verses = {};
  // Split on verse div boundaries — reliable even with nested tags
  const parts = html.split(/class="verse_text jVerse" data-num="/);
  for (let i = 1; i < parts.length; i++) {
    // First token before the closing quote is the verse number
    const verseNum = parseInt(parts[i]);
    if (isNaN(verseNum)) continue;

    // Content is between the first > and the closing </div>
    const gtIdx  = parts[i].indexOf('>');
    const endIdx = parts[i].indexOf('</div>');
    if (gtIdx === -1 || endIdx === -1 || endIdx <= gtIdx) continue;

    let content = parts[i].slice(gtIdx + 1, endIdx);

    // Remove verse_url and verse_name headers
    content = content.replace(/<strong class="verse_url">[\s\S]*?<\/strong>/g, '');
    content = content.replace(/<strong class="verse_name">[^<]*<\/strong>/g, '');

    // Replace anchor spans: <span class='anchor'><sup>MARKER</sup>word</span>
    // → [MARKER]word
    content = content.replace(
      /<span class='anchor'><sup>([^<]+)<\/sup>/g,
      (_, marker) => `[${marker}]`
    );

    // Strip remaining HTML (upper_text spans, etc.)
    const marked = stripHtml(content).replace(/\s+/g, ' ').trim();
    if (marked) verses[verseNum] = marked;
  }
  return verses;
}

// ── Extract notes from /note/{slug}/{ch}/ ─────────────────────────────────
// Returns array of { verse, marker, type, content }
function extractNotes(html) {
  const notes = [];
  const noteRe = /<li class="jNote" data-anchor="([^"]+)">([\s\S]*?)<\/li>/g;
  let m;
  while ((m = noteRe.exec(html))) {
    const anchor = m[1];           // format: chapterNum_verseNum_marker
    const parts  = anchor.split('_');
    if (parts.length < 3) continue;
    const verseNum = parseInt(parts[1]);
    const marker   = parts.slice(2).join(''); // handles multi-char markers like '2b', '1a'
    if (isNaN(verseNum)) continue;

    const content = m[2];

    // Cross-reference: <div class="reference">...</div>
    const refMatch  = content.match(/<div class="reference">([\s\S]*?)<\/div>/);
    // Footnote:        <div class="text">...</div>
    const textMatch = content.match(/<div class="text">([\s\S]*?)<\/div>/);

    const hasRef  = refMatch  && refMatch[1].trim();
    const hasText = textMatch && textMatch[1].trim();

    // Helper: clean footnote HTML → plain text
    function cleanFn(raw) {
      return raw
        .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/<[^>]+>/g, '')
        .replace(/[ \t]+/g, ' ')
        .trim();
    }

    let type, text;
    if (hasRef && hasText) {
      // Note contains both a cross-reference AND footnote text — combine them.
      // RefContent in the UI will tokenise the CR line and make refs clickable,
      // then render the footnote paragraph(s) below it.
      type = 'cr';
      const crLine = stripHtml(refMatch[1]).replace(/\s+/g, ' ').trim();
      const fnBody = cleanFn(textMatch[1]);
      text = crLine + '\n\n' + fnBody;
    } else if (hasRef) {
      type = 'cr';
      text = stripHtml(refMatch[1]).replace(/\s+/g, ' ').trim();
    } else if (hasText) {
      type = 'fn';
      text = cleanFn(textMatch[1]);
    } else {
      continue; // empty note, skip
    }

    if (text) notes.push({ verse: verseNum, marker, type, content: text });
  }
  return notes;
}

// ── Get chapter count for a book ──────────────────────────────────────────
async function getChapterCount(bookAbbr) {
  const { data } = await supabase
    .from('bible_chapters')
    .select('chapter')
    .eq('book_abbr', bookAbbr)
    .order('chapter', { ascending: false })
    .limit(1)
    .single();
  return data?.chapter ?? 0;
}

// ── Scrape one chapter ────────────────────────────────────────────────────
async function scrapeChapter(bookAbbr, chapter) {
  const slug = BOOK_SLUGS[bookAbbr];
  if (!slug) { console.error(`  ✗ No slug for ${bookAbbr}`); return; }

  const bibleUrl = `https://bibleread.online/bible/${slug}/${chapter}/`;
  const noteUrl  = `https://bibleread.online/note/${slug}/${chapter}/`;

  // Fetch both pages in parallel
  let bibleHtml, noteHtml;
  try {
    [{ body: bibleHtml }, { body: noteHtml }] = await Promise.all([get(bibleUrl), get(noteUrl)]);
  } catch (e) {
    console.error(`  ✗ Fetch error ${bookAbbr} ch${chapter}:`, e.message);
    return;
  }

  const markedVerses = extractMarkedVerses(bibleHtml);
  const notes        = extractNotes(noteHtml);

  const verseCount  = Object.keys(markedVerses).length;
  const noteCount   = notes.length;
  console.log(`  ${bookAbbr} ch${chapter}: ${verseCount} marked verses, ${noteCount} notes`);

  if (verseCount === 0 && noteCount === 0) return;
  if (DRY) { console.log('  [DRY — not saved]'); return; }

  // Build marked text string (same format as text_en but with [marker] tokens)
  const markedText = Object.keys(markedVerses)
    .map(n => parseInt(n))
    .sort((a, b) => a - b)
    .map(n => `${n} ${markedVerses[n]}`)
    .join('\n');

  // Upsert text_en_marked on the chapter row
  if (markedText) {
    const { error } = await supabase
      .from('bible_chapters')
      .update({ text_en_marked: markedText })
      .eq('book_abbr', bookAbbr)
      .eq('chapter', chapter);
    if (error) console.error(`  ✗ bible_chapters update error:`, error.message);
  }

  // Upsert refs into bible_refs
  if (notes.length > 0) {
    // Deduplicate: if same verse+marker appears twice, keep the longer content
    const seen = new Map();
    for (const n of notes) {
      const key = `${n.verse}_${n.marker}`;
      const existing = seen.get(key);
      if (!existing || n.content.length > existing.content.length) seen.set(key, n);
    }
    const rows = [...seen.values()].map(n => ({
      book_abbr: bookAbbr,
      chapter,
      verse:   n.verse,
      marker:  n.marker,
      type:    n.type,
      content: n.content,
    }));
    const { error } = await supabase
      .from('bible_refs')
      .upsert(rows, { onConflict: 'book_abbr,chapter,verse,marker' });
    if (error) console.error(`  ✗ bible_refs upsert error:`, error.message);
    else console.log(`  ✓ Saved ${rows.length} refs`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  if (DRY) console.log('=== DRY RUN — no DB writes ===\n');

  // Which books to scrape
  const bookArg = process.argv.find(a => a.startsWith('--book='));
  const books   = bookArg
    ? bookArg.replace('--book=', '').split(',').map(s => s.trim())
    : Object.keys(BOOK_SLUGS);

  console.log(`Scraping ${books.length} book(s)...\n`);

  for (const bookAbbr of books) {
    const chCount = await getChapterCount(bookAbbr);
    if (chCount === 0) { console.log(`${bookAbbr}: not found in DB, skipping`); continue; }
    console.log(`\n── ${bookAbbr} (${chCount} chapters) ──`);
    for (let ch = 1; ch <= chCount; ch++) {
      await scrapeChapter(bookAbbr, ch);
      await sleep(400); // Be polite to the server
    }
  }

  console.log('\nDone.');
}

main().catch(console.error);

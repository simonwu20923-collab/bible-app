// addPsalmTitles.js
// Psalm superscriptions ("Of David", "To the choir director...") appear in the English
// reading text but were missing from the Chinese and Spanish text:
//
//   en      — present for most days but missing for Psalms 1—20.
//   es      — the Google Sites source used by fetchSpanishText.js omits superscriptions
//             entirely.
//   zh / sc — fetchChineseText.js and fetchSimplifiedChinese.js keep only verses
//             numbered >= 1, and FHL stores the superscription as verse 0. The headings
//             are already in bible_chapters.text_zh_marked / text_sc_marked, so they are
//             read straight from the DB — no re-scraping needed.
//
// en and es are scraped from the Recovery Version sites (bibleread.online /
// biblialeer.online — same platform, so one extractor serves both) into
// psalmTitles{En,Es}.json, then reused from there.
//
// Headings are spliced into verses.ot_text{,_es,_zh,_sc} ahead of each chapter's verse 1,
// as a bare line with no verse reference — the shape the English text already uses.
//
//   node addPsalmTitles.js --fetch-en    # scrape English titles → psalmTitlesEn.json
//   node addPsalmTitles.js --fetch-es    # scrape Spanish titles → psalmTitlesEs.json
//   node addPsalmTitles.js --dry-run
//   node addPsalmTitles.js

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const supabase = createClient(
  'https://lsvhmvkhernimxmzcyak.supabase.co',
  'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc'
);
const DRY_RUN = process.argv.includes('--dry-run');

// Same site platform, same markup — only the host and book slug differ.
const SOURCES = {
  en: { cache: 'psalmTitlesEn.json', url: ch => `https://bibleread.online/bible/psalms/${ch}/` },
  es: { cache: 'psalmTitlesEs.json', url: ch => `https://biblialeer.online/biblia/salmos/${ch}/` },
};
const cachePath = lang => path.join(__dirname, SOURCES[lang].cache);

// "詩 37:1 …" / "Sal. 37:1 …"  →  { chapter: 37, verse: 1 }
const REF_RE = /^\S+\s+(\d+)\s*:\s*(\d+)\s/;

// ── Spanish: scrape verse-0 superscriptions from biblialeer.online ────────────

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept-Language': 'es' },
    }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location).then(resolve, reject);
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout: ' + url)); });
  });
}

function decodeEntities(s) {
  return s
    // A heading is one line of prose, not poetry. The Spanish site breaks it across
    // <br/> ("Al director del coro." / "Salmo de David") where English keeps it on one
    // line, so breaks join with a space — using " / " here would invent a verse split.
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<sup>[\s\S]*?<\/sup>/g, '')     // drop footnote / cross-ref markers
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

// The superscription lives in the data-num="0" verse as <div class="extra center">.
// Psalms without a superscription have no data-num="0" block at all.
//
// The five book-division notes ("Book Two. Psalms 42—72 Indicating that the saints
// experience God…") are prepended inside that same div on the English site. They are
// commentary, not part of the title, and are separated from it by a SELF-CLOSING <br/>
// — the note's own line breaks are plain <br>. Psalms 1 and 107 carry the note and no
// title at all, so no <br/> means no superscription.
function extractSuperscription(html) {
  const parts = html.split(/class="verse_text jVerse" data-num="/);
  for (let i = 1; i < parts.length; i++) {
    if (parseInt(parts[i], 10) !== 0) continue;
    const m = parts[i].match(/<div class="extra[^"]*">([\s\S]*?)<\/div>/);
    if (!m) return null;

    let inner = m[1];
    // Tags are interleaved with the words ("<span…>Book</span> Two."), so probe the
    // tag-stripped text rather than the raw HTML.
    const plain = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (/^Book\s+(?:One|Two|Three|Four|Five)\./.test(plain)) {
      const br = inner.match(/<br\s*\/>/);
      if (!br) return null;
      inner = inner.slice(br.index + br[0].length);
    }
    return decodeEntities(inner) || null;
  }
  return null;
}

async function fetchTitles(lang) {
  const { url } = SOURCES[lang];
  const titles = {};
  for (let ch = 1; ch <= 150; ch++) {
    try {
      const { status, body } = await get(url(ch));
      if (status !== 200) { console.log(`  ⚠ Ps ${ch}: HTTP ${status}`); continue; }
      const title = extractSuperscription(body);
      if (title) { titles[ch] = title; console.log(`  ✓ Ps ${ch}: ${title}`); }
      else console.log(`  – Ps ${ch}: no superscription`);
    } catch (e) {
      console.error(`  ✗ Ps ${ch}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 400)); // be polite
  }
  fs.writeFileSync(cachePath(lang), JSON.stringify(titles, null, 1));
  console.log(`\nSaved ${Object.keys(titles).length} ${lang} superscriptions → ${cachePath(lang)}`);
}

// ── Chinese: FHL fills the handful of psalms ezoe.work left without a heading ──
// FHL also stores the superscription as verse 0, in its own table markup.
const FHL = {
  zh: { cache: 'psalmTitlesZh.json', url: ch => `https://bible.fhl.net/new/read.php?chineses=${encodeURIComponent('詩')}&strongflag=0&SSS=0&VERSION3=recover&TABFLAG=1&nodic=0&chap=${ch}` },
  sc: { cache: 'psalmTitlesSc.json', url: ch => `https://bible.fhl.net/gbdoc/new/read.php?chineses=${encodeURIComponent('诗')}&strongflag=0&SSS=0&VERSION3=recover&TABFLAG=1&nodic=0&chap=${ch}` },
};

async function fetchFhlTitles(lang) {
  const titles = {};
  for (let ch = 1; ch <= 150; ch++) {
    try {
      const { body } = await get(FHL[lang].url(ch));
      const m = body.match(/<td[^>]*>\s*<b>\d+:0<\/b>[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
      const text = m ? decodeEntities(m[1]) : null;
      if (text) { titles[ch] = text; console.log(`  ✓ Ps ${ch}: ${text}`); }
      else console.log(`  – Ps ${ch}: no superscription`);
    } catch (e) {
      console.error(`  ✗ Ps ${ch}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  const out = path.join(__dirname, FHL[lang].cache);
  fs.writeFileSync(out, JSON.stringify(titles, null, 1));
  console.log(`\nSaved ${Object.keys(titles).length} ${lang} superscriptions → ${out}`);
}

// ── Chinese: read verse-0 lines out of the *_marked columns ──────────────────

async function loadMarkedTitles(markedCol) {
  const { data, error } = await supabase
    .from('bible_chapters').select(`chapter,${markedCol}`).eq('book_abbr', 'Ps');
  if (error) throw error;
  const titles = {};
  for (const row of data) {
    const line = (row[markedCol] || '').split('\n').find(l => /^0\s/.test(l));
    if (!line) continue;
    // Strip the footnote / cross-ref markers scrapeRefs injected: "[a]大衛的詩。"
    const text = line.replace(/^0\s+/, '').replace(/\[[^\]]{1,4}\]/g, '').trim();
    if (text) titles[row.chapter] = text;
  }
  return titles;
}

// ── Splice ───────────────────────────────────────────────────────────────────

// Loose comparison for "is this heading already here?" — the English text already carries
// most headings, sometimes punctuated differently from the site ("*א (Aleph)" vs
// "א (Aleph)"). Only used to avoid duplicates, never to rewrite existing text.
const normalize = s => (s || '').replace(/[*\s.,:;]+/g, '').toLowerCase();

// Psalm 119 is an acrostic: 22 stanzas of 8 verses, each headed by the Hebrew letter its
// verses begin with. The letter and its English transliteration are used in every
// language — they name a Hebrew letter, so they are not translated.
const PS119_LETTERS = [
  'א (Aleph)', 'ב (Beth)', 'ג (Gimel)', 'ד (Daleth)', 'ה (He)',    'ו (Vav)',
  'ז (Zayin)', 'ח (Heth)', 'ט (Teth)',  'י (Yodh)',   'כ (Kaph)',  'ל (Lamedh)',
  'מ (Mem)',   'נ (Nun)',  'ס (Samekh)', 'ע (Ayin)',  'פ (Pe)',    'צ (Tsadhe)',
  'ק (Qoph)',  'ר (Resh)', 'ש (Shin)',  'ת (Tav)',
];
// → { '119:1': 'א (Aleph)', '119:9': 'ב (Beth)', ... '119:169': 'ת (Tav)' }
const PS119_STANZAS = Object.fromEntries(PS119_LETTERS.map((l, i) => [`119:${i * 8 + 1}`, l]));

// Headings keyed by "chapter:verse" — the verse they are shown above.
// A superscription belongs above verse 1; Psalm 119's letters head each stanza.
// Keying by verse is what keeps a reading that starts mid-psalm from being given a
// heading the reader already passed on an earlier day: the key simply never comes up.
function headingMap(titles) {
  const map = { ...PS119_STANZAS };
  for (const [chapter, title] of Object.entries(titles)) {
    if (chapter === '119') continue;          // its stanza letters serve as the heading
    map[`${chapter}:1`] = title;
  }
  return map;
}

function spliceTitles(text, titles) {
  const headings = headingMap(titles);
  const lines = (text || '').split('\n');
  const out = [];
  const seen = new Set();
  let changed = false;

  for (const line of lines) {
    const m = line.match(REF_RE);
    if (m) {
      const key = `${parseInt(m[1], 10)}:${parseInt(m[2], 10)}`;
      const heading = headings[key];
      if (heading && !seen.has(key)) {
        seen.add(key);
        const prev = out[out.length - 1];
        const prevIsHeading = prev !== undefined && prev.trim() && !REF_RE.test(prev);
        if (PS119_STANZAS[key] && prevIsHeading) {
          // Ps 119 letters are canonical and identical in every language, so an existing
          // variant ("*א (Aleph)", "א (Alef)") is replaced rather than duplicated.
          if (prev !== heading) { out[out.length - 1] = heading; changed = true; }
        } else if (normalize(prev) === normalize(heading)) {
          // Already there — leave the existing wording alone
        } else if (!prevIsHeading) {
          out.push(heading);
          changed = true;
        }
      }
    }
    out.push(line);
  }
  return changed ? out.join('\n') : null;
}

async function main() {
  if (DRY_RUN) console.log('=== DRY RUN — no writes ===\n');

  const readJson = file => {
    const p = path.join(__dirname, file);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
  };

  // The *_marked columns are the primary Chinese source; FHL only fills their gaps.
  const titles = {
    ot_text:    readJson(SOURCES.en.cache),
    ot_text_es: readJson(SOURCES.es.cache),
    ot_text_zh: { ...readJson(FHL.zh.cache), ...await loadMarkedTitles('text_zh_marked') },
    ot_text_sc: { ...readJson(FHL.sc.cache), ...await loadMarkedTitles('text_sc_marked') },
  };
  for (const [col, t] of Object.entries(titles)) {
    const n = Object.keys(t).length;
    console.log(`${col}: ${n} headings available${n ? '' : '  (run --fetch-en / --fetch-es first?)'}`);
  }
  console.log('');

  const { data, error } = await supabase
    .from('verses').select('date,ot_title,ot_text,ot_text_es,ot_text_zh,ot_text_sc')
    .like('ot_title', '%Psa.%').order('date');
  if (error) throw error;

  let fixed = 0, failed = 0;
  for (const row of data) {
    const update = {};
    for (const col of Object.keys(titles)) {
      if (!row[col]) continue;
      const next = spliceTitles(row[col], titles[col]);
      if (next && next !== row[col]) update[col] = next;
    }
    if (!Object.keys(update).length) continue;

    const added = Object.entries(update)
      .map(([c, v]) => `${c === 'ot_text' ? 'en' : c.replace('ot_text_', '')}:+${v.split('\n').length - row[c].split('\n').length}`)
      .join(' ');
    console.log(`${row.date}  ${row.ot_title}  ${added}`);

    if (DRY_RUN) { fixed++; continue; }
    const { error: uErr } = await supabase.from('verses').update(update).eq('date', row.date);
    if (uErr) { console.error(`  ✗ ${uErr.message}`); failed++; } else fixed++;
  }

  console.log(`\n${DRY_RUN ? 'Would update' : 'Updated'}: ${fixed} row(s)${failed ? `, failed: ${failed}` : ''}`);
}

function selfCheck() {
  const titles = { 37: '大衛的詩。', 38: '大衛的詩，作為記念。' };
  const t = '詩 37:1 a\n詩 37:2 b\n詩 38:1 c';
  console.assert(spliceTitles(t, titles) === '大衛的詩。\n詩 37:1 a\n詩 37:2 b\n大衛的詩，作為記念。\n詩 38:1 c', 'inserts both headings');
  // A range starting mid-psalm gets no heading for that chapter
  console.assert(spliceTitles('詩 37:5 a\n詩 38:1 c', titles) === '詩 37:5 a\n大衛的詩，作為記念。\n詩 38:1 c', 'skips mid-psalm start');
  // Re-running must not duplicate
  console.assert(spliceTitles(spliceTitles(t, titles), titles) === null, 'idempotent');
  console.assert(spliceTitles('詩 1:1 a', {}) === null, 'no titles → no change');
  // Spanish refs carry a dotted abbreviation
  console.assert(spliceTitles('Sal. 26:1 x', { 26: 'De David' }) === 'De David\nSal. 26:1 x', 'handles "Sal. 26:1"');

  // Psalm 119: a stanza letter is added above every stanza start, in any language
  console.assert(spliceTitles('詩 119:1 a\n詩 119:9 b', {})
    === 'א (Aleph)\n詩 119:1 a\nב (Beth)\n詩 119:9 b', 'adds Ps 119 stanza letters');
  // A stanza that is not a stanza start gets nothing
  console.assert(spliceTitles('詩 119:2 a', {}) === null, 'only stanza starts');
  // A day starting mid-chapter still gets its own stanza letter (2026-08-28 starts at 89)
  console.assert(spliceTitles('Ps 119 :89 a', {}) === 'ל (Lamedh)\nPs 119 :89 a', 'mid-chapter stanza');
  // Existing variants are replaced, not duplicated
  console.assert(spliceTitles('*א (Aleph)\nPs 119 :1 x', {}) === 'א (Aleph)\nPs 119 :1 x', 'drops stray asterisk');
  console.assert(spliceTitles('א (Alef)\nSal. 119:1 x', {}) === 'א (Aleph)\nSal. 119:1 x', 'replaces variant');
  // ...and re-running changes nothing
  console.assert(spliceTitles('א (Aleph)\nPs 119 :1 x', {}) === null, 'stanza replace is idempotent');
  // Ps 119 takes its heading from the stanza table, never from a scraped superscription
  console.assert(spliceTitles('Ps 119 :1 x', { 119: 'scraped junk' }) === 'א (Aleph)\nPs 119 :1 x', 'stanza wins');

  const wrap = inner => `class="verse_text jVerse" data-num="0"><strong class="verse_url">x</strong>` +
    `<div class="extra center">${inner}</div>`;

  // Markers dropped, entities decoded
  console.assert(extractSuperscription(wrap(
    `<span class='upper_text'><span class='anchor'><sup>a</sup>Of</span></span> David`
  )) === 'Of David', 'plain title');
  console.assert(extractSuperscription(wrap('&#1488; (Aleph)')) === 'א (Aleph)', 'decodes numeric entities');

  // Book-division note is commentary — only the title after the self-closing <br/> is kept
  console.assert(extractSuperscription(wrap(
    `<span class='upper_text'>Book</span> Two. <br>Psalms 42—72<br> Indicating that the saints ` +
    `experience God and His house and city through the suffering, exalted, and reigning Christ ` +
    `<br/>To the choir director. A <span class='anchor'><sup>1</sup>Maschil</span> ` +
    `<span class='anchor'><sup>a</sup>of</span> the sons of <span class='anchor'><sup>b</sup>Korah</span>`
  )) === 'To the choir director. A Maschil of the sons of Korah', 'strips book-division note');

  // Division note with no title after it (Ps 1, Ps 107) yields nothing
  console.assert(extractSuperscription(wrap(
    `Book One. <br>Psalms 1—41<br> Indicating that God's intention is to turn the seeking saints`
  )) === null, 'note-only → no title');

  // The Spanish site breaks a single heading across <br/> — joined with a space
  console.assert(extractSuperscription(wrap(
    `Al director del coro.<br/>Salmo de David`
  )) === 'Al director del coro. Salmo de David', 'joins heading line breaks');
  console.log('self-check OK');
}

const fetchLang = ["en","es"].find(l => process.argv.includes(`--fetch-${l}`));
const fetchFhl  = ["zh","sc"].find(l => process.argv.includes(`--fetch-${l}`));

if (process.argv.includes('--self-check')) selfCheck();
else if (fetchLang) fetchTitles(fetchLang).catch(e => { console.error(e); process.exit(1); });
else if (fetchFhl) fetchFhlTitles(fetchFhl).catch(e => { console.error(e); process.exit(1); });
else main().catch(err => { console.error('Fatal:', err); process.exit(1); });

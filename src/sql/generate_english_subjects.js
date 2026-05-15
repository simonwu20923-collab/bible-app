#!/usr/bin/env node
// generate_english_subjects.js
// Fetches the embedded books JSON from bibleread.online (single request),
// extracts the "Subject:" field for all 66 books, and produces UPDATE SQL
// for bible_book_intros WHERE lang='en'.
// Usage: node src/sql/generate_english_subjects.js
'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ── bibleread shortName → our book_abbr ───────────────────────────────────
// Verified against actual shortName values in the embedded JSON.
// Keys = bibleread shortName, Values = our DB book_abbr
const SHORT_TO_ABBR = {
  // OT
  'Gen': 'Gen',
  'Exo': 'Exo',
  'Lev': 'Lev',
  'Num': 'Num',
  'Deu': 'Deut',
  'Jos': 'Josh',
  'Jdg': 'Judg',
  'Rut': 'Ruth',
  '1Sa': '1Sam',
  '2Sa': '2Sam',
  '1Ki': '1Kgs',
  '2Ki': '2Kgs',
  '1Ch': '1Chr',
  '2Ch': '2Chr',
  'Ezr': 'Ezra',
  'Neh': 'Neh',
  'Est': 'Esth',
  'Job': 'Job',
  'Psa': 'Ps',
  'Prv': 'Prov',
  'Ecc': 'Eccl',
  'SoS': 'Song',
  'Isa': 'Isa',
  'Jer': 'Jer',
  'Lam': 'Lam',
  'Ezk': 'Ezek',
  'Dan': 'Dan',
  'Hos': 'Hos',
  'Joe': 'Joel',
  'Amo': 'Amos',
  'Oba': 'Obad',
  'Jon': 'Jonah',
  'Mic': 'Mic',
  'Nah': 'Nah',
  'Hab': 'Hab',
  'Zep': 'Zeph',
  'Hag': 'Hag',
  'Zec': 'Zech',
  'Mal': 'Mal',
  // NT
  'Mat': 'Mt',
  'Mrk': 'Mk',
  'Luk': 'Lk',
  'Joh': 'Jn',
  'Act': 'Acts',
  'Rom': 'Rom',
  '1Co': '1Co',
  '2Co': '2Co',
  'Gal': 'Gal',
  'Eph': 'Eph',
  'Phi': 'Phil',
  'Col': 'Col',
  '1Th': '1Thes',
  '2Th': '2Thes',
  '1Ti': '1Tim',
  '2Ti': '2Tim',
  'Tit': 'Titus',
  'Phm': 'Phm',
  'Heb': 'Heb',
  'Jam': 'Jas',
  '1Pe': '1Pet',
  '2Pe': '2Pet',
  '1Jo': '1Jn',
  '2Jo': '2Jn',
  '3Jo': '3Jn',
  'Jud': 'Jude',
  'Rev': 'Rev',
};

// ── HTTP fetch (follows redirects) ────────────────────────────────────────
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BibleSubjectScraper/1.0)' }
    }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ── Extract subject text from theme HTML ──────────────────────────────────
// Theme format: <p class="extra center large"><b>Subject of Foo:\n</b> <br> Subject text here\n</p>
function extractSubjectFromTheme(themeHtml) {
  if (!themeHtml) return '';
  // Strip everything up to and including the </b> <br> (or <br/>, <br />)
  const afterBr = themeHtml.replace(/[\s\S]*<\/b>\s*<br\s*\/?>/i, '');
  // Now strip the closing </p> and any remaining tags
  const text = afterBr
    .replace(/<\/p>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8212;/g, '—')
    .replace(/&#8211;/g, '–')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

function esc(s) { return (s || '').replace(/'/g, "''"); }

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const url = 'https://bibleread.online/bible/the-gospel-according-to-matthew/';
  process.stderr.write(`Fetching ${url} …\n`);
  const html = await fetchPage(url);

  // Extract App.Collections.books.reset([...]);
  const marker   = 'App.Collections.books.reset(';
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) throw new Error('Could not find books.reset marker in page');

  const arrStart = html.indexOf('[', startIdx);
  const arrEnd   = html.indexOf(']);', arrStart);
  const jsonStr  = html.slice(arrStart, arrEnd + 1);

  let books;
  try {
    books = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`JSON parse failed: ${e.message}`);
  }
  process.stderr.write(`Parsed ${books.length} book entries from JSON.\n`);

  // Deduplicate by shortName — keep first entry with a non-null theme,
  // fall back to first entry of that shortName.
  const byShort = new Map();
  for (const b of books) {
    const sn = b.shortName;
    if (!sn) continue;
    if (!byShort.has(sn)) {
      byShort.set(sn, b);
    } else if (!byShort.get(sn).theme && b.theme) {
      byShort.set(sn, b); // prefer entry that has a theme
    }
  }

  process.stderr.write(`Unique shortNames: ${byShort.size}\n\n`);

  // Build results mapped to our book_abbr
  const results  = [];
  const notFound = [];
  const noSubject = [];

  for (const [shortName, abbr] of Object.entries(SHORT_TO_ABBR)) {
    const entry = byShort.get(shortName);
    if (!entry) {
      notFound.push(`${abbr} (shortName: ${shortName})`);
      results.push({ abbr, subject: '' });
      continue;
    }
    const subject = extractSubjectFromTheme(entry.theme);
    if (subject) {
      process.stderr.write(`✓ ${abbr}: ${subject}\n`);
    } else {
      noSubject.push(abbr);
      process.stderr.write(`  ${abbr}: (no subject)\n`);
    }
    results.push({ abbr, subject });
  }

  if (notFound.length) {
    process.stderr.write(`\nNot found in JSON: ${notFound.join(', ')}\n`);
  }
  if (noSubject.length) {
    process.stderr.write(`No subject: ${noSubject.join(', ')}\n`);
  }

  // ── Generate SQL ──────────────────────────────────────────────────────
  const lines = [
    '-- ============================================================',
    '-- English Book Subjects (scraped from bibleread.online)',
    `-- Generated: ${new Date().toISOString().slice(0, 10)}`,
    '-- ============================================================',
    '',
  ];

  for (const { abbr, subject } of results) {
    if (subject) {
      lines.push(`UPDATE bible_book_intros SET subject = '${esc(subject)}' WHERE book_abbr = '${abbr}' AND lang = 'en';`);
    } else {
      lines.push(`-- ${abbr}: no subject found`);
    }
  }

  const outPath = path.join(__dirname, 'bible_data_english_subjects.sql');
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
  process.stderr.write(`\nWrote ${outPath}\n`);
  process.stderr.write(`Subjects populated: ${results.filter(r => r.subject).length}/${results.length}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });

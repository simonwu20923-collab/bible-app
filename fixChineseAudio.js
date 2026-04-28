/**
 * fixChineseAudio.js
 * Lists your M3U files, matches them to book names, fills in gaps
 * Run: node fixChineseAudio.js
 */

const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const M3U_DIR = path.join(__dirname, 'chinese-m3u');
const XLSX_FILE = path.join(__dirname, 'Bible_Reading_Mastersheet__3_.xlsx');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseM3U(text) {
  text = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const chapters = {};
  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].startsWith('#EXTINF:')) continue;
    const match = lines[i].match(/[Cc]hapter[\s_]+0*(\d+)/);
    if (match) {
      const chapNum = parseInt(match[1], 10);
      const nextLine = lines[i + 1];
      if (nextLine && !nextLine.startsWith('#')) {
        chapters[chapNum] = nextLine.trim();
        i++;
      }
    }
  }
  return chapters;
}

function toDateStr(rawDate) {
  if (!rawDate) return null;
  if (rawDate instanceof Date) {
    const y = rawDate.getFullYear();
    const m = String(rawDate.getMonth() + 1).padStart(2, '0');
    const d = String(rawDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

async function main() {
  // Step 1: List all M3U files
  const allFiles = fs.readdirSync(M3U_DIR).filter(f => f.toLowerCase().endsWith('.m3u'));
  console.log(`📁 Found ${allFiles.length} M3U files in chinese-m3u/:`);
  allFiles.forEach(f => console.log(`   ${f}`));

  // Step 2: Build a flexible book→file map using fuzzy matching
  const ALL_BOOKS = [
    'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
    '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles',
    'Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes',
    'Song of Songs','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel',
    'Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk',
    'Zephaniah','Haggai','Zechariah','Malachi',
    'Matthew','Mark','Luke','John','Acts','Romans',
    '1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians',
    'Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy',
    'Titus','Philemon','Hebrews','James','1 Peter','2 Peter',
    '1 John','2 John','3 John','Jude','Revelation',
  ];

  const bookToFile = {};
  const unmatched = [];

  for (const book of ALL_BOOKS) {
    // Try exact match (no extension)
    let found = allFiles.find(f => f.replace(/\.m3u$/i,'').toLowerCase() === book.toLowerCase());
    // Try without spaces
    if (!found) found = allFiles.find(f => f.replace(/\.m3u$/i,'').toLowerCase().replace(/\s/g,'') === book.toLowerCase().replace(/\s/g,''));
    // Try first significant word
    if (!found) {
      const word = book.replace(/^\d+\s+/,'').split(' ')[0].toLowerCase();
      found = allFiles.find(f => f.toLowerCase().replace(/\.m3u$/i,'').startsWith(word));
    }
    if (found) {
      bookToFile[book] = found;
    } else {
      unmatched.push(book);
    }
  }

  console.log(`\n✓ Matched ${Object.keys(bookToFile).length} books`);
  if (unmatched.length > 0) {
    console.log(`✗ Unmatched books: ${unmatched.join(', ')}`);
    console.log('\nHint: check if the file names above match these book names');
  }

  // Cache M3U chapters
  const m3uCache = {};
  function getChapters(bookName) {
    if (m3uCache[bookName] !== undefined) return m3uCache[bookName];
    const file = bookToFile[bookName];
    if (!file) { m3uCache[bookName] = {}; return {}; }
    const text = fs.readFileSync(path.join(M3U_DIR, file), 'utf8');
    m3uCache[bookName] = parseM3U(text);
    return m3uCache[bookName];
  }

  function getAudioArray(bookName, startChap, endChap) {
    if (!bookName || startChap == null) return null;
    const chapters = getChapters(bookName);
    const start = parseInt(startChap, 10);
    const end = endChap != null ? parseInt(endChap, 10) : start;
    const urls = [];
    for (let c = start; c <= end; c++) {
      if (chapters[c]) urls.push(chapters[c]);
    }
    return urls.length > 0 ? JSON.stringify(urls) : null;
  }

  // Step 3: Find dates with missing Chinese audio and fill them
  const { data: missingRows } = await supabase
    .from('verses')
    .select('date')
    .is('nt_audio_zh', null);

  console.log(`\n🔍 Found ${missingRows?.length || 0} dates missing Chinese audio`);

  const wb = xlsx.readFile(XLSX_FILE, { cellDates: true });
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, cellDates: true });

  // Build date→row map
  const dateToRow = {};
  for (let i = 1; i < rows.length; i++) {
    const d = toDateStr(rows[i][0]);
    if (d) dateToRow[d] = rows[i];
  }

  let updated = 0, errors = 0;

  for (const { date } of (missingRows || [])) {
    const row = dateToRow[date];
    if (!row) continue;

    const otBook  = row[7], otStart = row[8], otEnd = row[9];
    const ntBook  = row[10], ntStart = row[11], ntEnd = row[12];

    const ntAudio = getAudioArray(ntBook, ntStart, ntEnd);
    const otAudio = getAudioArray(otBook, otStart, otEnd);

    const { error } = await supabase.from('verses')
      .update({ nt_audio_zh: ntAudio, ot_audio_zh: otAudio })
      .eq('date', date);

    if (error) {
      console.error(`✗ ${date}: ${error.message}`);
      errors++;
    } else {
      const n = ntAudio ? JSON.parse(ntAudio).length : 0;
      const o = otAudio ? JSON.parse(otAudio).length : 0;
      console.log(`✓ ${date}  NT:${n}ch  OT:${o}ch`);
      updated++;
    }
    await sleep(50);
  }

  console.log(`\n✅ Done! Updated: ${updated}, Errors: ${errors}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

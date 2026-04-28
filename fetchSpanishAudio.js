/**
 * fetchSpanishAudio.js
 * Populates nt_audio_es / ot_audio_es using biblialeer.online
 * URL format: https://biblialeer.online/audio/bible/{slug}/{chapter}.mp3
 *
 * Run: node fetchSpanishAudio.js
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const xlsx = require('xlsx');
const path = require('path');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const XLSX_FILE = path.join(__dirname, 'Bible_Reading_Mastersheet__3_.xlsx');

// English book name → biblialeer.online URL slug
const SLUG = {
  // NT
  'Matthew':         'el-evangelio-de-mateo',
  'Mark':            'el-evangelio-de-marcos',
  'Luke':            'el-evangelio-de-lucas',
  'John':            'el-evangelio-de-juan',
  'Acts':            'los-hechos-de-los-apostoles',
  'Romans':          'romanos',
  '1 Corinthians':   '1-corintios',
  '2 Corinthians':   '2-corintios',
  'Galatians':       'galatas',
  'Ephesians':       'efesios',
  'Philippians':     'filipenses',
  'Colossians':      'colosenses',
  '1 Thessalonians': '1-tesalonicenses',
  '2 Thessalonians': '2-tesalonicenses',
  '1 Timothy':       '1-timoteo',
  '2 Timothy':       '2-timoteo',
  'Titus':           'tito',
  'Philemon':        'filemon',
  'Hebrews':         'hebreos',
  'James':           'santiago',
  '1 Peter':         '1-pedro',
  '2 Peter':         '2-pedro',
  '1 John':          '1-juan',
  '2 John':          '2-juan',
  '3 John':          '3-juan',
  'Jude':            'judas',
  'Revelation':      'el-apocalipsis',
  // OT
  'Genesis':         'genesis',
  'Exodus':          'exodo',
  'Leviticus':       'levitico',
  'Numbers':         'numeros',
  'Deuteronomy':     'deuteronomio',
  'Joshua':          'josue',
  'Judges':          'jueces',
  'Ruth':            'rut',
  '1 Samuel':        '1-samuel',
  '2 Samuel':        '2-samuel',
  '1 Kings':         '1-reyes',
  '2 Kings':         '2-reyes',
  '1 Chronicles':    '1-cronicas',
  '2 Chronicles':    '2-cronicas',
  'Ezra':            'esdras',
  'Nehemiah':        'nehemias',
  'Esther':          'ester',
  'Job':             'job',
  'Psalms':          'salmos',
  'Proverbs':        'proverbios',
  'Ecclesiastes':    'eclesiastes',
  'Song of Songs':   'cantares',
  'Isaiah':          'isaias',
  'Jeremiah':        'jeremias',
  'Lamentations':    'lamentaciones',
  'Ezekiel':         'ezequiel',
  'Daniel':          'daniel',
  'Hosea':           'oseas',
  'Joel':            'joel',
  'Amos':            'amos',
  'Obadiah':         'abdias',
  'Jonah':           'jonas',
  'Micah':           'miqueas',
  'Nahum':           'nahum',
  'Habakkuk':        'habacuc',
  'Zephaniah':       'sofonias',
  'Haggai':          'hageo',
  'Zechariah':       'zacarias',
  'Malachi':         'malaquias',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Check if a URL returns 200 (audio exists)
function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', timeout: 8000 }, (res) => {
      resolve(res.statusCode === 200 ? url : null);
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

function buildUrl(bookName, chapter) {
  const slug = SLUG[bookName];
  if (!slug) return null;
  return `https://biblialeer.online/audio/bible/${slug}/${chapter}.mp3`;
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

// Cache verified URLs
const urlCache = {};

async function getAudioArray(bookName, startChap, endChap) {
  if (!bookName || startChap == null) return null;
  const start = parseInt(startChap, 10);
  const end = endChap != null ? parseInt(endChap, 10) : start;
  const urls = [];

  for (let c = start; c <= end; c++) {
    const cacheKey = `${bookName}-${c}`;
    if (urlCache[cacheKey] !== undefined) {
      if (urlCache[cacheKey]) urls.push(urlCache[cacheKey]);
      continue;
    }
    const url = buildUrl(bookName, c);
    if (!url) { urlCache[cacheKey] = null; continue; }

    const result = await checkUrl(url);
    urlCache[cacheKey] = result;
    if (result) {
      urls.push(result);
      console.log(`    ✓ ${bookName} ch.${c}`);
    } else {
      console.warn(`    ✗ ${bookName} ch.${c} not found`);
    }
    await sleep(300);
  }
  return urls.length > 0 ? JSON.stringify(urls) : null;
}

async function main() {
  console.log('🎵 Fetching Spanish audio from biblialeer.online\n');

  // First test a couple URLs
  console.log('Testing URLs...');
  const test1 = await checkUrl('https://biblialeer.online/audio/bible/el-evangelio-de-mateo/1.mp3');
  const test2 = await checkUrl('https://biblialeer.online/audio/bible/genesis/1.mp3');
  console.log(`  Matthew ch.1: ${test1 ? '✓' : '✗'}`);
  console.log(`  Genesis ch.1: ${test2 ? '✓' : '✗'}`);

  if (!test1 && !test2) {
    console.error('\n❌ Cannot reach biblialeer.online - check your internet connection');
    return;
  }

  const wb = xlsx.readFile(XLSX_FILE, { cellDates: true });
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    header: 1, cellDates: true
  });

  let updated = 0, skipped = 0, errors = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const dateStr = toDateStr(row[0]);
    if (!dateStr) continue;

    const otBook  = row[7];
    const otStart = row[8];
    const otEnd   = row[9];
    const ntBook  = row[10];
    const ntStart = row[11];
    const ntEnd   = row[12];

    console.log(`\n${dateStr}`);
    const ntAudio = await getAudioArray(ntBook, ntStart, ntEnd);
    const otAudio = await getAudioArray(otBook, otStart, otEnd);

    if (!ntAudio && !otAudio) { skipped++; continue; }

    const { error } = await supabase.from('verses')
      .update({ nt_audio_es: ntAudio, ot_audio_es: otAudio })
      .eq('date', dateStr);

    if (error) {
      console.error(`  ✗ DB: ${error.message}`);
      errors++;
    } else {
      updated++;
    }

    await sleep(200);
  }

  console.log('\n✅ Done!');
  console.log(`   Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

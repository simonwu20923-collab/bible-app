/**
 * fetchChineseAudio.js (v2 - correct filenames with + instead of spaces)
 * Run: node fetchChineseAudio.js
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

// English book name → exact filename (without .m3u)
const BOOK_TO_FILE = {
  'Genesis': 'Genesis', 'Exodus': 'Exodus', 'Leviticus': 'Leviticus',
  'Numbers': 'Numbers', 'Deuteronomy': 'Deuteronomy', 'Joshua': 'Joshua',
  'Judges': 'Judges', 'Ruth': 'Ruth',
  '1 Samuel': '1+Samuel', '2 Samuel': '2+Samuel',
  '1 Kings': '1+Kings', '2 Kings': '2+Kings',
  '1 Chronicles': '1+Chronicles', '2 Chronicles': '2+Chronicles',
  'Ezra': 'Ezra', 'Nehemiah': 'Nehemiah', 'Esther': 'Esther',
  'Job': 'Job', 'Psalms': 'Psalms', 'Proverbs': 'Proverbs',
  'Ecclesiastes': 'Ecclesiastes', 'Song of Songs': 'Song+of+Solomon',
  'Isaiah': 'Isaiah', 'Jeremiah': 'Jeremiah', 'Lamentations': 'Lamentations',
  'Ezekiel': 'Ezekiel', 'Daniel': 'Daniel', 'Hosea': 'Hosea',
  'Joel': 'Joel', 'Amos': 'Amos', 'Obadiah': 'Obadiah',
  'Jonah': 'Jonah', 'Micah': 'Micah', 'Nahum': 'Nahum',
  'Habakkuk': 'Habakkuk', 'Zephaniah': 'Zephaniah', 'Haggai': 'Haggai',
  'Zechariah': 'Zechariah', 'Malachi': 'Malachi',
  'Matthew': 'Matthew', 'Mark': 'Mark', 'Luke': 'Luke', 'John': 'John',
  'Acts': 'Acts', 'Romans': 'Romans',
  '1 Corinthians': '1+Corinthians', '2 Corinthians': '2+Corinthians',
  'Galatians': 'Galatians', 'Ephesians': 'Ephesians',
  'Philippians': 'Philippians', 'Colossians': 'Colossians',
  '1 Thessalonians': '1+Thessalonians', '2 Thessalonians': '2+Thessalonians',
  '1 Timothy': '1+Timothy', '2 Timothy': '2+Timothy',
  'Titus': 'Titus', 'Philemon': 'Philemon', 'Hebrews': 'Hebrews',
  'James': 'James', '1 Peter': '1+Peter', '2 Peter': '2+Peter',
  '1 John': '1+John', '2 John': '2+John', '3 John': '3+John',
  'Jude': 'Jude', 'Revelation': 'Revelation',
};

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
  console.log('🎵 Fetching Chinese audio from local M3U files (v2)\n');

  // Cache parsed M3U files
  const m3uCache = {};

  function getChapters(bookName) {
    if (m3uCache[bookName]) return m3uCache[bookName];
    const fileName = BOOK_TO_FILE[bookName];
    if (!fileName) {
      console.warn(`  ⚠ No file mapping for: "${bookName}"`);
      m3uCache[bookName] = {};
      return {};
    }
    const filePath = path.join(M3U_DIR, fileName + '.m3u');
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠ File not found: ${filePath}`);
      m3uCache[bookName] = {};
      return {};
    }
    const text = fs.readFileSync(filePath, 'utf8');
    const chapters = parseM3U(text);
    console.log(`  📁 ${fileName}.m3u: ${Object.keys(chapters).length} chapters`);
    m3uCache[bookName] = chapters;
    return chapters;
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

    const ntAudio = getAudioArray(ntBook, ntStart, ntEnd);
    const otAudio = getAudioArray(otBook, otStart, otEnd);

    if (!ntAudio && !otAudio) { skipped++; continue; }

    const { error } = await supabase.from('verses')
      .update({ nt_audio_zh: ntAudio, ot_audio_zh: otAudio })
      .eq('date', dateStr);

    if (error) {
      console.error(`  ✗ ${dateStr}: ${error.message}`);
      errors++;
    } else {
      const ntCount = ntAudio ? JSON.parse(ntAudio).length : 0;
      const otCount = otAudio ? JSON.parse(otAudio).length : 0;
      console.log(`  ✓ ${dateStr}  NT:${ntCount}ch  OT:${otCount}ch`);
      updated++;
    }
    await sleep(30);
  }

  console.log('\n✅ Done!');
  console.log(`   Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

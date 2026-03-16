/**
 * updateAudioFromM3u.js  (v3 — stores JSON array of all chapter URLs)
 *
 * Stores nt_audio / ot_audio as JSON arrays, e.g.:
 *   ["http://.../chap7.mp3","http://.../chap8.mp3","http://.../chap9.mp3"]
 *
 * Col layout (0-based):
 *   0  = Date
 *   7  = OT_AudioBook (book name)
 *   8  = OT_StartChap
 *   9  = OT_EndChap
 *   10 = NT_AudioBook (book name)
 *   11 = NT_StartChap
 *   12 = NT_EndChap
 *
 * Run:
 *   npm install @supabase/supabase-js xlsx
 *   node updateAudioFromM3u.js
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
const xlsx = require('xlsx');
const path = require('path');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';
const XLSX_FILE   = path.join(__dirname, 'Bible_Reading_Mastersheet__3_.xlsx');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseM3U(text) {
  text = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const chapters = {};
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    if (!line.startsWith('#EXTINF:')) continue;
    const match = line.match(/[Cc]hapter[\s_]+0*(\d+)/);
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
  if (typeof rawDate === 'number') {
    const info = xlsx.SSF.parse_date_code(rawDate);
    return `${info.y}-${String(info.m).padStart(2, '0')}-${String(info.d).padStart(2, '0')}`;
  }
  const d = new Date(rawDate);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

async function main() {
  console.log('📖  Reading spreadsheet…');
  const wb = xlsx.readFile(XLSX_FILE, { cellDates: true });

  // AudioBooks sheet: col[1] = book name, col[2] = M3U URL
  const audioSheetName = wb.SheetNames.find((n) => /audio.*book/i.test(n)) || 'AudioBooks';
  const audioRows = xlsx.utils.sheet_to_json(wb.Sheets[audioSheetName], { header: 1 });

  const bookNameToM3U = {};
  for (let i = 1; i < audioRows.length; i++) {
    const row = audioRows[i];
    const bookName = row[1];
    const m3uUrl   = row[2];
    if (bookName && m3uUrl) {
      bookNameToM3U[String(bookName).trim()] = String(m3uUrl).trim();
    }
  }
  console.log(`  Loaded ${Object.keys(bookNameToM3U).length} books from AudioBooks sheet`);

  const m3uCache = {};

  async function getChapters(bookName) {
    if (!bookName) return {};
    const key = String(bookName).trim();
    if (m3uCache[key]) return m3uCache[key];
    const m3uUrl = bookNameToM3U[key];
    if (!m3uUrl) {
      console.warn(`  ⚠ No M3U URL for book: "${key}"`);
      m3uCache[key] = {};
      return {};
    }
    console.log(`  ↳ Fetching playlist for ${key}`);
    try {
      const text = await fetchText(m3uUrl);
      const chapters = parseM3U(text);
      console.log(`    Found ${Object.keys(chapters).length} chapters`);
      m3uCache[key] = chapters;
      return chapters;
    } catch (err) {
      console.error(`    ✗ Failed: ${err.message}`);
      m3uCache[key] = {};
      return {};
    }
  }

  /** Returns a JSON string array of URLs from startChap to endChap, or null if none found */
  async function getAudioArray(bookName, startChap, endChap) {
    if (!bookName || startChap == null) return null;
    const chapters = await getChapters(bookName);
    const start = parseInt(startChap, 10);
    const end   = endChap != null ? parseInt(endChap, 10) : start;
    const urls = [];
    for (let c = start; c <= end; c++) {
      if (chapters[c]) {
        urls.push(chapters[c]);
      } else {
        console.warn(`  ⚠ No audio for ${bookName} ch.${c}`);
      }
    }
    return urls.length > 0 ? JSON.stringify(urls) : null;
  }

  const mainRows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    header: 1,
    cellDates: true,
  });

  let updated = 0, skipped = 0, errors = 0;

  for (let i = 1; i < mainRows.length; i++) {
    const row = mainRows[i];
    const rawDate     = row[0];
    const otAudioBook = row[7];
    const otStartChap = row[8];
    const otEndChap   = row[9];
    const ntAudioBook = row[10];
    const ntStartChap = row[11];
    const ntEndChap   = row[12];

    const dateStr = toDateStr(rawDate);
    if (!dateStr) continue;

    const ntAudio = await getAudioArray(ntAudioBook, ntStartChap, ntEndChap);
    const otAudio = await getAudioArray(otAudioBook, otStartChap, otEndChap);

    const { error } = await supabase
      .from('verses')
      .update({ nt_audio: ntAudio, ot_audio: otAudio })
      .eq('date', dateStr);

    if (error) {
      console.error(`  ✗ DB error on ${dateStr}: ${error.message}`);
      errors++;
    } else {
      const ntCount = ntAudio ? JSON.parse(ntAudio).length : 0;
      const otCount = otAudio ? JSON.parse(otAudio).length : 0;
      console.log(`  ${dateStr}  NT:${ntCount} chapters  OT:${otCount} chapters`);
      if (ntAudio || otAudio) updated++; else skipped++;
    }
  }

  console.log('\n✅  Done!');
  console.log(`   Rows updated with audio : ${updated}`);
  console.log(`   Rows with no audio      : ${skipped}`);
  console.log(`   Database errors         : ${errors}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

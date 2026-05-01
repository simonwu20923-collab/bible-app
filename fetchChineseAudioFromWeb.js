/**
 * fetchChineseAudioFromWeb.js (v4)
 * KEY FIX: Must send Accept-Language: zh-CN header to get Chinese audio
 * The server returns different audio based on this header!
 *
 * Run: node fetchChineseAudioFromWeb.js
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
const xlsx = require('xlsx');
const path = require('path');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const XLSX_FILE = path.join(__dirname, 'Bible_Reading_Mastersheet__3_.xlsx');

const BOOK_PLAYLIST = {
  'Genesis':1,'Exodus':2,'Leviticus':3,'Numbers':4,'Deuteronomy':5,
  'Joshua':6,'Judges':7,'Ruth':8,'1 Samuel':9,'2 Samuel':10,
  '1 Kings':11,'2 Kings':12,'1 Chronicles':13,'2 Chronicles':14,
  'Ezra':15,'Nehemiah':16,'Esther':17,'Job':18,'Psalms':19,
  'Proverbs':20,'Ecclesiastes':21,'Song of Songs':22,'Isaiah':23,
  'Jeremiah':24,'Lamentations':25,'Ezekiel':26,'Daniel':27,
  'Hosea':28,'Joel':29,'Amos':30,'Obadiah':31,'Jonah':32,
  'Micah':33,'Nahum':34,'Habakkuk':35,'Zephaniah':36,'Haggai':37,
  'Zechariah':38,'Malachi':39,
  'Matthew':40,'Mark':41,'Luke':42,'John':43,'Acts':44,
  'Romans':45,'1 Corinthians':46,'2 Corinthians':47,'Galatians':48,
  'Ephesians':49,'Philippians':50,'Colossians':51,
  '1 Thessalonians':52,'2 Thessalonians':53,'1 Timothy':54,
  '2 Timothy':55,'Titus':56,'Philemon':57,'Hebrews':58,
  'James':59,'1 Peter':60,'2 Peter':61,'1 John':62,
  '2 John':63,'3 John':64,'Jude':65,'Revelation':66,
};

const CHINESE_GENESIS_CH1 = 'fl2ruLhBi56YGd0bdelYv7-7iXTp0a4J';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// CRITICAL: Accept-Language zh-CN header makes server return Chinese audio
function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const chunks = [];
    lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept': '*/*',
      },
      timeout: 20000
    }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location)
        return fetchText(res.headers.location).then(resolve).catch(reject);
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject)
      .on('timeout', function() { this.destroy(); reject(new Error('Timeout')); });
  });
}

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
  console.log('🎵 Fetching Chinese audio (v4 - Accept-Language: zh-CN)\n');

  // Verify first
  console.log('Verifying Genesis ch.1...');
  const testText = await fetchText('https://www.churchinpiscataway.org/bible/playlist/1');
  const testChaps = parseM3U(testText);
  const ch1 = testChaps[1] || '';
  const isZh = ch1.includes(CHINESE_GENESIS_CH1);
  console.log(`  Ch.1 URL: ${ch1}`);
  console.log(`  Chinese audio: ${isZh ? '✅ YES' : '❌ NO - still getting English'}\n`);

  if (!isZh) {
    console.error('ERROR: Still getting English audio. The server may require cookies.');
    console.log('\nAlternative: Please manually download the Chinese playlists from:');
    console.log('https://www.churchinpiscataway.org/Bible/Books?lang=zh-CN');
    console.log('Click each "Play List" link, save as {bookname}-zh.m3u in chinese-m3u folder');
    return;
  }

  const m3uCache = {};

  async function getChapters(bookName) {
    if (m3uCache[bookName]) return m3uCache[bookName];
    const idx = BOOK_PLAYLIST[bookName];
    if (!idx) { m3uCache[bookName] = {}; return {}; }

    const url = `https://www.churchinpiscataway.org/bible/playlist/${idx}`;
    console.log(`  ↳ ${bookName} (${idx})...`);
    try {
      const text = await fetchText(url);
      const chapters = parseM3U(text);
      console.log(`    ${Object.keys(chapters).length} chapters`);
      m3uCache[bookName] = chapters;
      await sleep(400);
      return chapters;
    } catch(e) {
      console.error(`    ✗ ${e.message}`);
      m3uCache[bookName] = {};
      return {};
    }
  }

  function getAudioArray(chapters, startChap, endChap) {
    const start = parseInt(startChap, 10);
    const end = endChap != null ? parseInt(endChap, 10) : start;
    const urls = [];
    for (let c = start; c <= end; c++) {
      if (chapters[c]) urls.push(chapters[c]);
    }
    return urls.length > 0 ? JSON.stringify(urls) : null;
  }

  const wb = xlsx.readFile(XLSX_FILE, { cellDates: true });
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, cellDates: true });

  let updated = 0, skipped = 0, errors = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const dateStr = toDateStr(row[0]);
    if (!dateStr) continue;

    const otBook = row[7]; const otStart = row[8]; const otEnd = row[9];
    const ntBook = row[10]; const ntStart = row[11]; const ntEnd = row[12];

    let ntAudio = null, otAudio = null;
    if (ntBook && ntStart != null) ntAudio = getAudioArray(await getChapters(ntBook), ntStart, ntEnd);
    if (otBook && otStart != null) otAudio = getAudioArray(await getChapters(otBook), otStart, otEnd);

    if (!ntAudio && !otAudio) { skipped++; continue; }

    const { error } = await supabase.from('verses')
      .update({ nt_audio_zh: ntAudio, ot_audio_zh: otAudio })
      .eq('date', dateStr);

    if (error) { console.error(`  ✗ ${dateStr}: ${error.message}`); errors++; }
    else {
      const n = ntAudio ? JSON.parse(ntAudio).length : 0;
      const o = otAudio ? JSON.parse(otAudio).length : 0;
      console.log(`  ✓ ${dateStr}  NT:${n}ch  OT:${o}ch`);
      updated++;
    }
    await sleep(50);
  }

  console.log(`\n✅ Done! Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

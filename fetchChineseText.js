/**
 * fetchChineseText.js (v2 - fixed parser)
 * 
 * Fetches Chinese Recovery Version from bible.fhl.net
 * Verse structure: <tr><td><b>1:1</b></td><td>verse text</td><td>comments</td></tr>
 *
 * Run: node fetchChineseText.js
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const xlsx = require('xlsx');
const path = require('path');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BOOKS_ZH = {
  'Genesis':'創','Exodus':'出','Leviticus':'利','Numbers':'民',
  'Deuteronomy':'申','Joshua':'書','Judges':'士','Ruth':'得',
  '1 Samuel':'撒上','2 Samuel':'撒下','1 Kings':'王上','2 Kings':'王下',
  '1 Chronicles':'代上','2 Chronicles':'代下','Ezra':'拉','Nehemiah':'尼',
  'Esther':'斯','Job':'伯','Psalms':'詩','Proverbs':'箴',
  'Ecclesiastes':'傳','Song of Songs':'歌','Isaiah':'賽','Jeremiah':'耶',
  'Lamentations':'哀','Ezekiel':'結','Daniel':'但','Hosea':'何',
  'Joel':'珥','Amos':'摩','Obadiah':'俄','Jonah':'拿','Micah':'彌',
  'Nahum':'鴻','Habakkuk':'哈','Zephaniah':'番','Haggai':'該',
  'Zechariah':'亞','Malachi':'瑪','Matthew':'太','Mark':'可',
  'Luke':'路','John':'約','Acts':'徒','Romans':'羅',
  '1 Corinthians':'林前','2 Corinthians':'林後','Galatians':'加',
  'Ephesians':'弗','Philippians':'腓','Colossians':'西',
  '1 Thessalonians':'帖前','2 Thessalonians':'帖後',
  '1 Timothy':'提前','2 Timothy':'提後','Titus':'多','Philemon':'門',
  'Hebrews':'來','James':'雅','1 Peter':'彼前','2 Peter':'彼後',
  '1 John':'約壹','2 John':'約貳','3 John':'約參','Jude':'猶',
  'Revelation':'啟',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchChapter(bookName, chap) {
  const zhChar = BOOKS_ZH[bookName];
  if (!zhChar) return Promise.resolve({});

  const encoded = encodeURIComponent(zhChar);
  const url = `https://bible.fhl.net/new/read.php?chineses=${encoded}&strongflag=0&SSS=0&VERSION3=recover&TABFLAG=1&nodic=0&chap=${chap}`;

  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'zh-TW,zh;q=0.9',
        'Referer': 'https://bible.fhl.net/',
      },
      timeout: 20000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Parse verses from table rows
        // Pattern: <b>1:1</b> in first td, verse text in second td
        const verses = {};
        const rowPattern = /<tr[^>]*>.*?<b>(\d+:\d+)<\/b>.*?<\/td>\s*<td[^>]*>(.*?)<\/td>/gis;
        let match;
        while ((match = rowPattern.exec(data)) !== null) {
          const ref = match[1]; // e.g. "1:1"
          let text = match[2];
          // Clean up: remove HTML tags
          text = text.replace(/<[^>]+>/g, '').trim();
          // Decode common entities
          text = text.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
          if (text && text.length > 0) {
            const verseNum = parseInt(ref.split(':')[1], 10);
            verses[verseNum] = text;
          }
        }
        resolve(verses);
      });
    }).on('error', () => resolve({}))
      .on('timeout', function() { this.destroy(); resolve({}); });
  });
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

// Extract start/end verse from title like "New Testament - Luke 20:20~21:4"
function parseVerseRange(title) {
  if (!title) return { startChap: null, startVerse: null, endChap: null, endVerse: null };
  const m = title.match(/(\d+):(\d+)~(\d+):(\d+)/);
  if (m) return {
    startChap: parseInt(m[1]), startVerse: parseInt(m[2]),
    endChap: parseInt(m[3]), endVerse: parseInt(m[4])
  };
  // Single chapter range like "Luke 1:26~1:56"
  const m2 = title.match(/(\d+):(\d+)/);
  if (m2) return { startChap: parseInt(m2[1]), startVerse: parseInt(m2[2]), endChap: null, endVerse: null };
  return { startChap: null, startVerse: null, endChap: null, endVerse: null };
}

async function fetchVerseRange(bookName, startChap, startVerse, endChap, endVerse) {
  const abbrev = BOOKS_ZH[bookName] || bookName;
  const lines = [];

  const chapEnd = endChap || startChap;

  for (let c = startChap; c <= chapEnd; c++) {
    console.log(`    Fetching ${bookName} ch.${c}...`);
    const verses = await fetchChapter(bookName, c);

    const vStart = (c === startChap) ? (startVerse || 1) : 1;
    const vEnd = (c === chapEnd && endVerse) ? endVerse : 999;

    const verseNums = Object.keys(verses).map(Number).sort((a, b) => a - b);
    for (const vNum of verseNums) {
      if (vNum >= vStart && vNum <= vEnd) {
        lines.push(`${abbrev} ${c}:${vNum} ${verses[vNum]}`);
      }
    }
    await sleep(700);
  }

  return lines.length > 0 ? lines.join('\n') : null;
}

async function main() {
  console.log('🇨🇳 Fetching Chinese Recovery Version (v2 - fixed parser)\n');

  const wb = xlsx.readFile(path.join(__dirname, 'Bible_Reading_Mastersheet__3_.xlsx'), { cellDates: true });
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, cellDates: true });

  // Skip already done
  const { data: existing } = await supabase
    .from('verses').select('date').not('nt_text_zh', 'is', null);
  const doneDates = new Set((existing || []).map(r => r.date));
  console.log(`Already done: ${doneDates.size} dates\n`);

  let updated = 0, failed = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rawDate = row[0];
    const dateStr = toDateStr(rawDate);
    if (!dateStr || doneDates.has(dateStr)) continue;

    const ntTitle   = row[2];
    const otTitle   = row[4];
    const otBook    = row[7];
    const ntBook    = row[10];

    console.log(`\n📅 ${dateStr}`);

    // Parse verse ranges from titles
    const ntRange = parseVerseRange(ntTitle);
    const otRange = parseVerseRange(otTitle);

    let ntText = null, otText = null;

    if (ntBook && ntRange.startChap) {
      ntText = await fetchVerseRange(
        ntBook,
        ntRange.startChap, ntRange.startVerse,
        ntRange.endChap,   ntRange.endVerse
      );
      console.log(`  NT: ${ntText ? ntText.split('\n').length + ' verses' : 'none'}`);
    }

    if (otBook && otRange.startChap) {
      otText = await fetchVerseRange(
        otBook,
        otRange.startChap, otRange.startVerse,
        otRange.endChap,   otRange.endVerse
      );
      console.log(`  OT: ${otText ? otText.split('\n').length + ' verses' : 'none'}`);
    }

    const { error } = await supabase
      .from('verses')
      .update({ nt_text_zh: ntText, ot_text_zh: otText })
      .eq('date', dateStr);

    if (error) {
      console.error(`  ✗ DB error: ${error.message}`);
      failed++;
    } else {
      updated++;
    }

    await sleep(300);
  }

  console.log('\n✅ Done!');
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed:  ${failed}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

/**
 * fetchSimplifiedChinese.js
 * Fetches Simplified Chinese Bible text from bible.fhl.net/gbdoc/
 * and saves to nt_text_sc / ot_text_sc columns.
 *
 * Add columns first: nt_text_sc (text), ot_text_sc (text)
 * Run: node fetchSimplifiedChinese.js
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const xlsx = require('xlsx');
const path = require('path');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BOOKS_ZH = {
  'Genesis':'创','Exodus':'出','Leviticus':'利','Numbers':'民',
  'Deuteronomy':'申','Joshua':'书','Judges':'士','Ruth':'得',
  '1 Samuel':'撒上','2 Samuel':'撒下','1 Kings':'王上','2 Kings':'王下',
  '1 Chronicles':'代上','2 Chronicles':'代下','Ezra':'拉','Nehemiah':'尼',
  'Esther':'斯','Job':'伯','Psalms':'诗','Proverbs':'箴',
  'Ecclesiastes':'传','Song of Songs':'歌','Isaiah':'赛','Jeremiah':'耶',
  'Lamentations':'哀','Ezekiel':'结','Daniel':'但','Hosea':'何',
  'Joel':'珥','Amos':'摩','Obadiah':'俄','Jonah':'拿','Micah':'弥',
  'Nahum':'鸿','Habakkuk':'哈','Zephaniah':'番','Haggai':'该',
  'Zechariah':'亚','Malachi':'玛','Matthew':'太','Mark':'可',
  'Luke':'路','John':'约','Acts':'徒','Romans':'罗',
  '1 Corinthians':'林前','2 Corinthians':'林后','Galatians':'加',
  'Ephesians':'弗','Philippians':'腓','Colossians':'西',
  '1 Thessalonians':'帖前','2 Thessalonians':'帖后',
  '1 Timothy':'提前','2 Timothy':'提后','Titus':'多','Philemon':'门',
  'Hebrews':'来','James':'雅','1 Peter':'彼前','2 Peter':'彼后',
  '1 John':'约一','2 John':'约二','3 John':'约三','Jude':'犹',
  'Revelation':'启',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchChapter(bookChar, chap) {
  const encoded = encodeURIComponent(bookChar);
  // KEY DIFFERENCE: /gbdoc/ for Simplified Chinese
  const url = `https://bible.fhl.net/gbdoc/new/read.php?chineses=${encoded}&strongflag=0&SSS=0&VERSION3=recover&TABFLAG=1&nodic=0&chap=${chap}`;
  return new Promise((resolve) => {
    const chunks = [];
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      timeout: 20000
    }, (res) => {
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const html = Buffer.concat(chunks).toString('utf8');
        const verses = {};
        // Fixed regex handles <a name="..."/> between </b> and </td>
        const rowPattern = /<td[^>]*>\s*<b>(\d+:\d+)<\/b>.*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
        let match;
        while ((match = rowPattern.exec(html)) !== null) {
          const ref = match[1];
          let text = match[2].replace(/<[^>]+>/g, '').trim()
            .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
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

function parseVerseRange(title) {
  if (!title) return {};
  const m = title.match(/(\d+):(\d+)~(\d+):(\d+)/);
  if (m) return { sc: +m[1], sv: +m[2], ec: +m[3], ev: +m[4] };
  const m2 = title.match(/(\d+):(\d+)/);
  if (m2) return { sc: +m2[1], sv: +m2[2], ec: +m2[1], ev: 999 };
  return {};
}

async function fetchRange(bookZh, sc, sv, ec, ev) {
  const lines = [];
  for (let c = sc; c <= (ec || sc); c++) {
    console.log(`    Fetching ${bookZh} ch.${c}...`);
    const verses = await fetchChapter(bookZh, c);
    const startV = c === sc ? (sv || 1) : 1;
    const endV = c === (ec || sc) ? (ev || 999) : 999;
    Object.keys(verses).map(Number).sort((a,b)=>a-b).forEach(v => {
      if (v >= startV && v <= endV) lines.push(`${bookZh} ${c}:${v} ${verses[v]}`);
    });
    await sleep(600);
  }
  return lines.length > 0 ? lines.join('\n') : null;
}

async function main() {
  console.log('🇨🇳 Fetching Simplified Chinese (gbdoc)\n');

  const wb = xlsx.readFile(path.join(__dirname, 'Bible_Reading_Mastersheet__3_.xlsx'), { cellDates: true });
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, cellDates: true });

  // Skip already done
  const { data: existing } = await supabase.from('verses').select('date').not('nt_text_sc', 'is', null);
  const doneDates = new Set((existing || []).map(r => r.date));
  console.log(`Already done: ${doneDates.size} dates\n`);

  let updated = 0, failed = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const dateStr = toDateStr(row[0]);
    if (!dateStr || doneDates.has(dateStr)) continue;

    const ntTitle = row[2], otTitle = row[4];
    const ntBook = row[10], otBook = row[7];
    const ntRange = parseVerseRange(ntTitle);
    const otRange = parseVerseRange(otTitle);

    console.log(`\n📅 ${dateStr}`);

    let ntText = null, otText = null;

    if (ntBook && BOOKS_ZH[ntBook] && ntRange.sc) {
      ntText = await fetchRange(BOOKS_ZH[ntBook], ntRange.sc, ntRange.sv, ntRange.ec, ntRange.ev);
      console.log(`  NT: ${ntText ? ntText.split('\n').length + ' verses' : 'none'}`);
    }
    if (otBook && BOOKS_ZH[otBook] && otRange.sc) {
      otText = await fetchRange(BOOKS_ZH[otBook], otRange.sc, otRange.sv, otRange.ec, otRange.ev);
      console.log(`  OT: ${otText ? otText.split('\n').length + ' verses' : 'none'}`);
    }

    const { error } = await supabase.from('verses')
      .update({ nt_text_sc: ntText, ot_text_sc: otText })
      .eq('date', dateStr);

    if (error) { console.error(`  ✗ ${error.message}`); failed++; }
    else updated++;

    await sleep(300);
  }

  console.log(`\n✅ Done! Updated: ${updated}, Failed: ${failed}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

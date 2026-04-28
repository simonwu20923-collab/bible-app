/**
 * fixMissingData.js (v3)
 * Fixes:
 * - Wrong FHL characters for 1/2/3 John (約一 not 約壹)
 * - Abbreviated book names not matched (Num., Ezek., Dan., 2 Chron.)
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept-Language': 'zh-TW,zh;q=0.9',
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

function parseFHLVerses(html) {
  const verses = {};
  // Fixed regex: .*? allows <a name="..."/> between </b> and </td>
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
  return verses;
}

async function fetchChineseChapter(bookChar, chap) {
  const encoded = encodeURIComponent(bookChar);
  const url = `https://bible.fhl.net/new/read.php?chineses=${encoded}&strongflag=0&SSS=0&VERSION3=recover&TABFLAG=1&nodic=0&chap=${chap}`;
  try {
    const html = await fetchText(url);
    const verses = parseFHLVerses(html);
    console.log(`    ${bookChar} ch.${chap}: ${Object.keys(verses).length} verses`);
    return verses;
  } catch(e) {
    console.log(`    ${bookChar} ch.${chap}: ERROR - ${e.message}`);
    return {};
  }
}

// FHL uses 約一/約二/約三 NOT 約壹/約貳/約參 — verified from their HTML dropdown
const BOOK_MAP = [
  // Check longer/abbreviated names first
  { match: ['2 Chron', '2Chron', 'II Chron'], name: '2 Chronicles', zh: '代下' },
  { match: ['1 Chron', '1Chron', 'I Chron'],  name: '1 Chronicles', zh: '代上' },
  { match: ['2 Cor'],  name: '2 Corinthians',  zh: '林後' },
  { match: ['1 Cor'],  name: '1 Corinthians',  zh: '林前' },
  { match: ['2 Sam'],  name: '2 Samuel',        zh: '撒下' },
  { match: ['1 Sam'],  name: '1 Samuel',        zh: '撒上' },
  { match: ['2 Kings','2 Kgs'], name: '2 Kings', zh: '王下' },
  { match: ['1 Kings','1 Kgs'], name: '1 Kings', zh: '王上' },
  { match: ['1 Thess'], name: '1 Thessalonians', zh: '帖前' },
  { match: ['2 Thess'], name: '2 Thessalonians', zh: '帖後' },
  { match: ['1 Tim'],  name: '1 Timothy',        zh: '提前' },
  { match: ['2 Tim'],  name: '2 Timothy',        zh: '提後' },
  { match: ['1 Pet'],  name: '1 Peter',          zh: '彼前' },
  { match: ['2 Pet'],  name: '2 Peter',          zh: '彼後' },
  // 1/2/3 John — FHL uses 約一, 約二, 約三
  { match: ['1 John', '1John', '1Jn', 'I John'], name: '1 John', zh: '約一' },
  { match: ['2 John', '2John', '2Jn', 'II John'], name: '2 John', zh: '約二' },
  { match: ['3 John', '3John', '3Jn', 'III John'], name: '3 John', zh: '約三' },
  { match: ['Song of Songs', 'Song'],  name: 'Song of Songs', zh: '歌' },
  { match: ['Lament', 'Lam'],          name: 'Lamentations',  zh: '哀' },
  { match: ['Eccles', 'Eccl'],         name: 'Ecclesiastes',  zh: '傳' },
  { match: ['Rev'],                    name: 'Revelation',    zh: '啟' },
  { match: ['Deut', 'Dt'],            name: 'Deuteronomy',   zh: '申' },
  { match: ['Ezek', 'Ezk'],           name: 'Ezekiel',       zh: '結' },
  { match: ['Dan'],                    name: 'Daniel',        zh: '但' },
  { match: ['Num', 'Nm'],             name: 'Numbers',       zh: '民' },
  { match: ['Matt', 'Mt'],            name: 'Matthew',       zh: '太' },
  { match: ['Gen', 'Gn'],             name: 'Genesis',       zh: '創' },
  { match: ['Exod', 'Ex'],            name: 'Exodus',        zh: '出' },
  { match: ['Lev', 'Lv'],             name: 'Leviticus',     zh: '利' },
  { match: ['Josh', 'Jos'],           name: 'Joshua',        zh: '書' },
  { match: ['Judg', 'Jdg'],          name: 'Judges',        zh: '士' },
  { match: ['Ruth', 'Rt'],            name: 'Ruth',          zh: '得' },
  { match: ['Neh'],                   name: 'Nehemiah',      zh: '尼' },
  { match: ['Ezra', 'Esd'],          name: 'Ezra',          zh: '拉' },
  { match: ['Esth', 'Est'],          name: 'Esther',        zh: '斯' },
  { match: ['Job', 'Jb'],            name: 'Job',           zh: '伯' },
  { match: ['Ps', 'Psalm'],          name: 'Psalms',        zh: '詩' },
  { match: ['Prov', 'Pr'],           name: 'Proverbs',      zh: '箴' },
  { match: ['Isa', 'Is'],            name: 'Isaiah',        zh: '賽' },
  { match: ['Jer'],                   name: 'Jeremiah',      zh: '耶' },
  { match: ['Hos'],                   name: 'Hosea',         zh: '何' },
  { match: ['Joel', 'Jl'],           name: 'Joel',          zh: '珥' },
  { match: ['Amos', 'Am'],           name: 'Amos',          zh: '摩' },
  { match: ['Obad', 'Abd'],          name: 'Obadiah',       zh: '俄' },
  { match: ['Jonah', 'Jon'],         name: 'Jonah',         zh: '拿' },
  { match: ['Mic', 'Mi'],            name: 'Micah',         zh: '彌' },
  { match: ['Nah'],                  name: 'Nahum',         zh: '鴻' },
  { match: ['Hab'],                  name: 'Habakkuk',      zh: '哈' },
  { match: ['Zeph', 'Sof'],         name: 'Zephaniah',     zh: '番' },
  { match: ['Hag'],                  name: 'Haggai',        zh: '該' },
  { match: ['Zech', 'Zac'],         name: 'Zechariah',     zh: '亞' },
  { match: ['Mal'],                  name: 'Malachi',       zh: '瑪' },
  { match: ['Mark', 'Mc', 'Mk'],    name: 'Mark',          zh: '可' },
  { match: ['Luke', 'Lk', 'Lc'],    name: 'Luke',          zh: '路' },
  { match: ['John', 'Jn', 'Joh'],   name: 'John',          zh: '約' },
  { match: ['Acts', 'Hch'],         name: 'Acts',          zh: '徒' },
  { match: ['Rom'],                  name: 'Romans',        zh: '羅' },
  { match: ['Gal'],                  name: 'Galatians',     zh: '加' },
  { match: ['Eph'],                  name: 'Ephesians',     zh: '弗' },
  { match: ['Phil'],                 name: 'Philippians',   zh: '腓' },
  { match: ['Col'],                  name: 'Colossians',    zh: '西' },
  { match: ['Tit'],                  name: 'Titus',         zh: '多' },
  { match: ['Phlm', 'Phm'],        name: 'Philemon',      zh: '門' },
  { match: ['Heb'],                  name: 'Hebrews',       zh: '來' },
  { match: ['Jas', 'Stg', 'Jm'],   name: 'James',         zh: '雅' },
  { match: ['Jude', 'Jud'],         name: 'Jude',          zh: '猶' },
];

function getBook(title) {
  if (!title) return null;
  for (const entry of BOOK_MAP) {
    for (const m of entry.match) {
      if (title.includes(m)) return entry;
    }
  }
  return null;
}

function parseRange(title) {
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
    const verses = await fetchChineseChapter(bookZh, c);
    const startV = c === sc ? (sv || 1) : 1;
    const endV = c === (ec || sc) ? (ev || 999) : 999;
    Object.keys(verses).map(Number).sort((a,b)=>a-b).forEach(v => {
      if (v >= startV && v <= endV) lines.push(`${bookZh} ${c}:${v} ${verses[v]}`);
    });
    await sleep(700);
  }
  return lines.length > 0 ? lines.join('\n') : null;
}

async function main() {
  console.log('🔧 Fixing missing Chinese text (v3)\n');

  const missingDates = [
    '2026-03-12', '2026-07-04',
    '2026-12-03', '2026-12-04', '2026-12-05',
    '2026-12-06', '2026-12-07', '2026-12-08', '2026-12-09',
  ];

  const { data: rows } = await supabase.from('verses')
    .select('date, nt_title, ot_title, nt_text_zh, ot_text_zh')
    .in('date', missingDates);

  for (const row of (rows || [])) {
    console.log(`\n== ${row.date} ==`);
    const ntBook = getBook(row.nt_title);
    const otBook = getBook(row.ot_title);
    const ntRange = parseRange(row.nt_title);
    const otRange = parseRange(row.ot_title);

    console.log(`  NT: ${ntBook?.name || 'NOT FOUND'} (${ntBook?.zh}) ${ntRange.sc}:${ntRange.sv}~${ntRange.ec}:${ntRange.ev}`);
    console.log(`  OT: ${otBook?.name || 'NOT FOUND'} (${otBook?.zh}) ${otRange.sc}:${otRange.sv}~${otRange.ec}:${otRange.ev}`);

    const updateData = {};

    if (!row.nt_text_zh && ntBook && ntRange.sc) {
      const text = await fetchRange(ntBook.zh, ntRange.sc, ntRange.sv, ntRange.ec, ntRange.ev);
      if (text) { updateData.nt_text_zh = text; console.log(`  NT: ${text.split('\n').length} verses ✓`); }
      else console.log('  NT: 0 verses — check if book/chapter exists on FHL');
    } else if (row.nt_text_zh) {
      console.log('  NT: already has text, skipping');
    }

    if (!row.ot_text_zh && otBook && otRange.sc) {
      const text = await fetchRange(otBook.zh, otRange.sc, otRange.sv, otRange.ec, otRange.ev);
      if (text) { updateData.ot_text_zh = text; console.log(`  OT: ${text.split('\n').length} verses ✓`); }
      else console.log('  OT: 0 verses — check if book/chapter exists on FHL');
    } else if (row.ot_text_zh) {
      console.log('  OT: already has text, skipping');
    }

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase.from('verses')
        .update(updateData).eq('date', row.date);
      console.log(error ? `  ✗ DB: ${error.message}` : '  ✓ Saved!');
    }

    await sleep(500);
  }

  console.log('\n✅ Done!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
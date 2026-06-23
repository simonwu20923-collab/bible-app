/**
 * fixAudioFromTitle.js
 *
 * Root-cause fix for the "audio always starts at chapter 1" bug.
 * The reading TITLE (e.g. "Old Testament - 1 King 4:20~6:38") is the source of
 * truth for which chapters to play. This rebuilds nt_audio/ot_audio (English) and
 * nt_audio_zh/ot_audio_zh (Chinese) from the church playlists, indexed by the
 * ACTUAL chapter number parsed from the title — not chapters 1..N.
 *
 * Reads creds from .env (REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_KEY).
 * Dry run by default; pass --fix to write. Backs up changed rows to
 * audio-backup-<timestamp>.json before writing.
 *
 *   node fixAudioFromTitle.js          # dry run, report only
 *   node fixAudioFromTitle.js --fix    # apply + backup
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const getEnv = k => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim();
const supabase = createClient(getEnv('REACT_APP_SUPABASE_URL'), getEnv('REACT_APP_SUPABASE_KEY'));

const FIX = process.argv.includes('--fix');

// English/Chinese share one endpoint; the zh-CN header switches the language.
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

// Title abbreviations -> full book name (covers every prefix seen in the DB).
const ABBREV = {
  'Gen.':'Genesis','Exo.':'Exodus','Lev.':'Leviticus','Num.':'Numbers',
  'Deut.':'Deuteronomy','Duet.':'Deuteronomy','Josh.':'Joshua','Judg.':'Judges','Ruth':'Ruth',
  '1 Sam.':'1 Samuel','2 Sam.':'2 Samuel','1 King':'1 Kings','2 King':'2 Kings',
  '1 Chron.':'1 Chronicles','2 Chron.':'2 Chronicles','Ezra':'Ezra','Neh.':'Nehemiah',
  'Esth.':'Esther','Job':'Job','Psa.':'Psalms','Prov.':'Proverbs','Eccl.':'Ecclesiastes',
  'S.S.':'Song of Songs','Isa.':'Isaiah','Jer.':'Jeremiah','Lam.':'Lamentations',
  'Ezek.':'Ezekiel','Dan.':'Daniel','Hosea':'Hosea','Joel':'Joel','Amos':'Amos',
  'Obad.':'Obadiah','Jonah':'Jonah','Micah':'Micah','Nahum':'Nahum','Hab.':'Habakkuk',
  'Zeph.':'Zephaniah','Hag.':'Haggai','Zech.':'Zechariah','Mal.':'Malachi',
  'Matt.':'Matthew','Mark':'Mark','Luke':'Luke','John':'John','Acts':'Acts',
  'Rom.':'Romans','1 Cor.':'1 Corinthians','2 Cor.':'2 Corinthians','Gal.':'Galatians',
  'Eph.':'Ephesians','Phil.':'Philippians','Col.':'Colossians','1 Thes.':'1 Thessalonians',
  '2 Thes.':'2 Thessalonians','1 Tim.':'1 Timothy','2 Tim.':'2 Timothy','Titus':'Titus',
  'Philem.':'Philemon','Heb.':'Hebrews','James':'James','1 Pet.':'1 Peter','2 Pet.':'2 Peter',
  '1 John':'1 John','2 John':'2 John','3 John':'3 John','Jude':'Jude','Rev.':'Revelation',
};

function fetchText(url, zh) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const headers = { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' };
    if (zh) headers['Accept-Language'] = 'zh-CN,zh;q=0.9,en;q=0.8';
    const chunks = [];
    lib.get(url, { headers, timeout: 20000 }, res => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location)
        return fetchText(res.headers.location, zh).then(resolve).catch(reject);
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject).on('timeout', function () { this.destroy(); reject(new Error('timeout')); });
  });
}

function parseM3U(text) {
  text = text.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const chapters = {};
  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].startsWith('#EXTINF:')) continue;
    const m = lines[i].match(/[Cc]hapter[\s_]+0*(\d+)/);
    if (m && lines[i + 1] && !lines[i + 1].startsWith('#')) {
      chapters[parseInt(m[1], 10)] = lines[i + 1].trim();
      i++;
    }
  }
  return chapters;
}

const cache = {}; // `${id}-${lang}` -> chapters map
async function getChapters(bookFull, lang) {
  const id = BOOK_PLAYLIST[bookFull];
  if (!id) throw new Error('No playlist for book: ' + bookFull);
  const key = `${id}-${lang}`;
  if (!cache[key]) {
    const text = await fetchText(`https://www.churchinpiscataway.org/bible/playlist/${id}`, lang === 'zh');
    cache[key] = parseM3U(text);
  }
  return cache[key];
}

function normBook(s) {
  s = s.trim();
  return ABBREV[s] || ABBREV[s.replace(/\.$/, '')] || s;
}

// Returns [{ book, start, end|null }] segments; end=null means "to last chapter of book".
function parseTitle(title) {
  if (!title) return null;
  const clean = title.replace(/^(New|Old) Testament\s*-\s*/i, '').trim();
  // Cross-book: "<b1> c:v ~ <b2> c:v"  (second book may start with a digit, e.g. "2 King")
  let m = clean.match(/^(.+?)\s+(\d+):\d+\s*[~\-]\s*(\d*\s*[A-Za-z][^~]*?)\s+(\d+):\d+\s*$/);
  if (m && /[A-Za-z]/.test(m[3])) {
    return [
      { book: normBook(m[1]), start: parseInt(m[2]), end: null },   // b1: start..end of book
      { book: normBook(m[3]), start: 1, end: parseInt(m[4]) },      // b2: 1..end
    ];
  }
  // Single book: "<book> c:v[~c:v | ~v]"
  m = clean.match(/^(.+?)\s+(\d+):\d+/);
  if (!m) return null;
  const book = normBook(m[1]);
  const rest = clean.slice(m[1].length);
  const start = parseInt(rest.match(/(\d+):\d+/)[1]);
  const endM = rest.match(/[~\-]\s*(\d+):\d+\s*$/); // end only counts if it has its own chapter:verse
  const end = endM ? parseInt(endM[1]) : start;
  return [{ book, start, end }];
}

async function buildArray(title, lang) {
  const segs = parseTitle(title);
  if (!segs) return { urls: null, warn: 'unparseable title' };
  const urls = [];
  const warns = [];
  for (const seg of segs) {
    const chapters = await getChapters(seg.book, lang);
    const maxChap = Math.max(...Object.keys(chapters).map(Number));
    const end = seg.end == null ? maxChap : seg.end;
    for (let c = seg.start; c <= end; c++) {
      if (chapters[c]) urls.push(chapters[c]);
      else warns.push(`${seg.book} ch.${c} missing`);
    }
  }
  return { urls: urls.length ? urls : null, warn: warns.join('; ') };
}

const norm = j => { try { return JSON.stringify(JSON.parse(j)); } catch { return null; } };

async function main() {
  console.log(FIX ? '✏️  FIX MODE — will write to Supabase + back up.\n' : '🔍 DRY RUN — no writes. Add --fix to apply.\n');
  const { data: rows, error } = await supabase.from('verses')
    .select('date,nt_title,ot_title,nt_audio,ot_audio,nt_audio_zh,ot_audio_zh').order('date');
  if (error) { console.error('DB error:', error.message); process.exit(1); }
  console.log(`Fetched ${rows.length} rows.\n`);

  const pairs = [
    ['nt_title', 'nt_audio', 'en'], ['ot_title', 'ot_audio', 'en'],
    ['nt_title', 'nt_audio_zh', 'zh'], ['ot_title', 'ot_audio_zh', 'zh'],
  ];

  const changes = []; // {date, fixes:{col:json}, backup:{col:oldVal}}
  let warnCount = 0;

  for (const row of rows) {
    const fixes = {}, backup = {};
    for (const [titleKey, audioKey, lang] of pairs) {
      const stored = row[audioKey];
      if (stored == null) continue;            // never CREATE audio where none existed
      const { urls, warn } = await buildArray(row[titleKey], lang);
      if (warn) { console.warn(`  ⚠️  ${row.date} [${audioKey}] "${row[titleKey]}": ${warn}`); warnCount++; }
      if (!urls) continue;
      const want = JSON.stringify(urls);
      if (norm(stored) !== want) { fixes[audioKey] = want; backup[audioKey] = stored; }
    }
    if (Object.keys(fixes).length) changes.push({ date: row.date, fixes, backup, nt: row.nt_title, ot: row.ot_title });
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Rows needing fixes: ${changes.length}   (warnings: ${warnCount})\n`);
  for (const c of changes) {
    for (const [col, val] of Object.entries(c.fixes)) {
      const oldArr = JSON.parse(c.backup[col] || '[]'), newArr = JSON.parse(val);
      const title = col.startsWith('nt') ? c.nt : c.ot;
      console.log(`${c.date} [${col}] "${title}"`);
      console.log(`   old[${oldArr.length}] ${oldArr.map(u => u.slice(-8)).join(',')}`);
      console.log(`   new[${newArr.length}] ${newArr.map(u => u.slice(-8)).join(',')}`);
    }
  }

  if (!FIX) { console.log('\nDry run complete. Re-run with --fix to apply.'); return; }
  if (!changes.length) { console.log('Nothing to fix.'); return; }

  const backupFile = path.join(__dirname, `audio-backup-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(changes.map(c => ({ date: c.date, backup: c.backup })), null, 2));
  console.log(`\nBacked up ${changes.length} rows to ${path.basename(backupFile)}`);

  let ok = 0, fail = 0;
  for (const c of changes) {
    const { error } = await supabase.from('verses').update(c.fixes).eq('date', c.date);
    if (error) { console.error(`  ❌ ${c.date}: ${error.message}`); fail++; } else ok++;
  }
  console.log(`\nDone. Updated: ${ok}, Failed: ${fail}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });

// generateAudio_EN_may26_OT.js  (v2 — fixed verse parser)
// Run: node generateAudio_EN_may26_OT.js

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OPENAI_KEY   = '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';
const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';
const TARGET_DATE  = '2026-05-26';
const OUTPUT_FILE  = path.join(__dirname, 'may26_OT_en.mp3');

const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
  'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function numToWords(n) {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n/10)] + (n%10 ? ' '+ONES[n%10] : '');
}

const PREFIX_SPEECH = {
  '1K':'First Kings','2K':'Second Kings',
  '1 King':'First Kings','2 King':'Second Kings',
  '1 Kings':'First Kings','2 Kings':'Second Kings',
  '1 Sam':'First Samuel','2 Sam':'Second Samuel',
  '1 Chr':'First Chronicles','2 Chr':'Second Chronicles',
  '1 Cor':'First Corinthians','2 Cor':'Second Corinthians',
  '1 Pet':'First Peter','2 Pet':'Second Peter',
  '1 John':'First John','2 John':'Second John','3 John':'Third John',
  '1 Tim':'First Timothy','2 Tim':'Second Timothy',
  'Gen':'Genesis','Ex':'Exodus','Lev':'Leviticus','Num':'Numbers',
  'Deut':'Deuteronomy','Josh':'Joshua','Judg':'Judges',
  'Ps':'Psalms','Prov':'Proverbs','Eccl':'Ecclesiastes',
  'Isa':'Isaiah','Jer':'Jeremiah','Lam':'Lamentations',
  'Ezek':'Ezekiel','Dan':'Daniel','Hos':'Hosea',
  'Zech':'Zechariah','Mal':'Malachi',
  'Matt':'Matthew','Mk':'Mark','Lk':'Luke','Jn':'John',
  'Acts':'Acts','Rom':'Romans','Gal':'Galatians','Eph':'Ephesians',
  'Phil':'Philippians','Col':'Colossians','Heb':'Hebrews',
  'Jas':'James','Rev':'Revelation',
};
function prefixToSpeech(p) {
  if (PREFIX_SPEECH[p]) return PREFIX_SPEECH[p];
  const clean = p.replace(/\.$/, '');
  return PREFIX_SPEECH[clean] || p;
}
function verseSpeech(prefix, chap, verse) {
  return `${prefixToSpeech(prefix)}, Chapter ${numToWords(chap)}, Verse ${numToWords(verse)}`;
}

// Robust parser: find "CHAP:VERSE" anchor, everything before = prefix, after = text
function parseVerseLines(raw) {
  if (!raw) return [];
  const verses = [];
  for (const line of raw.split('\n').map(l => l.trim()).filter(Boolean)) {
    // Format in DB: "1K 22 :51 text" — note possible space before colon
    const m = line.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)\s+(.+)$/);
    if (!m) continue;
    const chap = parseInt(m[2]), verse = parseInt(m[3]);
    if (chap > 0 && verse > 0 && m[4].length > 2)
      verses.push({ prefix: m[1].trim(), chap, verse, text: m[4].trim() });
  }
  return verses;
}

function groupByChapter(verses) {
  const chapters = [];
  let cur = null;
  for (const v of verses) {
    const key = `${v.prefix}-${v.chap}`;
    if (!cur || `${cur.prefix}-${cur.chap}` !== key) {
      cur = { prefix: v.prefix, chap: v.chap, startVerse: v.verse, verses: [] };
      chapters.push(cur);
    }
    cur.verses.push(v);
  }
  return chapters;
}

function buildIntroText(title) {
  const clean = title.replace(/^(Old|New) Testament\s*-\s*/i, '').trim();
  const cross = clean.match(/^(.+?)\s+(\d+):(\d+)\s*[~\-]\s*(.+?)\s+(\d+):(\d+)$/);
  if (cross) {
    return `${verseSpeech(cross[1].trim(), +cross[2], +cross[3])} to ${verseSpeech(cross[4].trim(), +cross[5], +cross[6])}`;
  }
  const same = clean.match(/^(.+?)\s+(\d+):(\d+)\s*[~\-]\s*(\d+):(\d+)$/);
  if (same) {
    return `${verseSpeech(same[1].trim(), +same[2], +same[3])} to Chapter ${numToWords(+same[4])}, Verse ${numToWords(+same[5])}`;
  }
  return clean;
}

function buildSegments(chapters, title) {
  const segs = [{ label: 'intro', text: buildIntroText(title) }];
  for (const ch of chapters) {
    segs.push({ label: `${ch.prefix}_ch${ch.chap}_hdr`, text: verseSpeech(ch.prefix, ch.chap, ch.startVerse) });
    segs.push({ label: `${ch.prefix}_ch${ch.chap}_body`, text: ch.verses.map(v => v.text).join(' ') });
  }
  return segs;
}

function openaiTTS(text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model:'tts-1-hd', voice:'alloy', input:text, response_format:'mp3' });
    const req = https.request('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Authorization':`Bearer ${OPENAI_KEY}`, 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(body) },
    }, res => {
      if (res.statusCode !== 200) {
        let e=''; res.on('data',c=>e+=c); res.on('end',()=>reject(new Error(`OpenAI ${res.statusCode}: ${e.slice(0,200)}`)));
        return;
      }
      const chunks=[]; res.on('data',c=>chunks.push(c)); res.on('end',()=>resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

function supabaseGet(p) {
  return new Promise((resolve, reject) => {
    https.get(`${SUPABASE_URL}/rest/v1/${p}`, {
      headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`},
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(JSON.parse(d))); }).on('error',reject);
  });
}

async function main() {
  console.log(`Generating English OT audio for ${TARGET_DATE}...\n`);
  const [row] = await supabaseGet(`verses?select=ot_title,ot_text&date=eq.${TARGET_DATE}`);
  if (!row?.ot_text) { console.error('No text found'); process.exit(1); }

  console.log(`Title: "${row.ot_title}"`);

  // Diagnostic: show first 3 raw lines
  const rawLines = row.ot_text.split('\n').filter(l=>l.trim());
  console.log('\nFirst 3 raw lines from DB:');
  rawLines.slice(0,3).forEach(l => console.log(`  "${l}"`));

  const verses   = parseVerseLines(row.ot_text);
  const chapters = groupByChapter(verses);
  console.log(`\nParsed ${verses.length} verses, ${chapters.length} chapter(s):`);
  chapters.forEach(ch => console.log(`  ${ch.prefix} ch${ch.chap}: ${ch.verses.length} verses`));

  if (verses.length === 0) {
    console.error('\n❌ Parsing failed. Format not recognised. See raw lines above.');
    process.exit(1);
  }

  const segs = buildSegments(chapters, row.ot_title);
  console.log(`\n${segs.length} TTS segments:`);
  segs.forEach(s => console.log(`  [${s.label}] "${s.text.slice(0,70)}..."`));

  console.log('\nCalling OpenAI TTS...');
  const bufs = [];
  for (const seg of segs) {
    process.stdout.write(`  ${seg.label}... `);
    const buf = await openaiTTS(seg.text);
    bufs.push(buf);
    console.log(`${(buf.length/1024).toFixed(1)} KB`);
  }

  const final = Buffer.concat(bufs);
  fs.writeFileSync(OUTPUT_FILE, final);
  console.log(`\n✅ ${OUTPUT_FILE} (${(final.length/1024).toFixed(1)} KB total)`);
}

main().catch(e => { console.error(e.message); process.exit(1); });

// generateAudio_EN_3days.js
// Generates English TTS audio (NT + OT) for the first 3 days
// Output: day001_NT_en.mp3, day001_OT_en.mp3, day002_NT_en.mp3, etc.
// Inserts 500ms pause between: intro → header, header → body, body → next header
//
// Run: node generateAudio_EN_3days.js

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OPENAI_KEY   = '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';
const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';
const OUTPUT_DIR   = __dirname; // saves mp3s in the same folder as the script

// ── Number to words ───────────────────────────────────────────────────────────

const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
  'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function numToWords(n) {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n/10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
}

// ── Book prefix → spoken English ──────────────────────────────────────────────

const PREFIX_SPEECH = {
  '1K':'First Kings',    '2K':'Second Kings',
  '1 King':'First Kings','2 King':'Second Kings',
  '1 Kings':'First Kings','2 Kings':'Second Kings',
  '1 Sam':'First Samuel','2 Sam':'Second Samuel',
  '1 Chr':'First Chronicles','2 Chr':'Second Chronicles',
  '1 Cor':'First Corinthians','2 Cor':'Second Corinthians',
  '1 Pet':'First Peter','2 Pet':'Second Peter',
  '1 John':'First John','2 John':'Second John','3 John':'Third John',
  '1 Tim':'First Timothy','2 Tim':'Second Timothy',
  '1 Thess':'First Thessalonians','2 Thess':'Second Thessalonians',
  'Gen':'Genesis','Ex':'Exodus','Lev':'Leviticus','Num':'Numbers',
  'Deut':'Deuteronomy','Josh':'Joshua','Judg':'Judges',
  'Ruth':'Ruth','Ezra':'Ezra','Neh':'Nehemiah','Esth':'Esther',
  'Job':'Job','Ps':'Psalms','Prov':'Proverbs','Eccl':'Ecclesiastes',
  'Song':'Song of Solomon','Isa':'Isaiah','Jer':'Jeremiah','Lam':'Lamentations',
  'Ezek':'Ezekiel','Dan':'Daniel','Hos':'Hosea','Joel':'Joel',
  'Amos':'Amos','Obad':'Obadiah','Jon':'Jonah','Mic':'Micah',
  'Nah':'Nahum','Hab':'Habakkuk','Zeph':'Zephaniah','Hag':'Haggai',
  'Zech':'Zechariah','Mal':'Malachi',
  'Matt':'Matthew','Mk':'Mark','Lk':'Luke','Jn':'John',
  'Acts':'Acts','Rom':'Romans','Gal':'Galatians','Eph':'Ephesians',
  'Phil':'Philippians','Col':'Colossians','Heb':'Hebrews',
  'Jas':'James','Rev':'Revelation','Titus':'Titus','Philem':'Philemon',
};
function prefixToSpeech(p) {
  if (PREFIX_SPEECH[p]) return PREFIX_SPEECH[p];
  return PREFIX_SPEECH[p.replace(/\.$/, '')] || p;
}
function verseSpeech(prefix, chap, verse) {
  return `${prefixToSpeech(prefix)}, Chapter ${numToWords(chap)}, Verse ${numToWords(verse)}`;
}

// ── Parse verse lines from DB ─────────────────────────────────────────────────
// DB format: "1K 22 :51 Some text here"   (note: space before colon)

function parseVerseLines(raw) {
  if (!raw) return [];
  const verses = [];
  for (const line of raw.split('\n').map(l => l.trim()).filter(Boolean)) {
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

// ── Build intro text ──────────────────────────────────────────────────────────

function buildIntroText(title) {
  const clean = title.replace(/^(Old|New) Testament\s*-\s*/i, '').trim();
  // Cross-book: "1 King 22:51~2 King 2:18"
  const cross = clean.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)\s*[~\-]\s*(.+?)\s+(\d+)\s*:\s*(\d+)$/);
  if (cross)
    return `${verseSpeech(cross[1].trim(), +cross[2], +cross[3])} to ${verseSpeech(cross[4].trim(), +cross[5], +cross[6])}`;
  // Same-book: "Matt. 28:1~28:20"
  const same = clean.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)\s*[~\-]\s*(\d+)\s*:\s*(\d+)$/);
  if (same)
    return `${verseSpeech(same[1].trim(), +same[2], +same[3])} to Chapter ${numToWords(+same[4])}, Verse ${numToWords(+same[5])}`;
  return clean;
}

// ── Build TTS segment list ────────────────────────────────────────────────────
// Returns array of { label, text } — PAUSE entries will be replaced with pauseBuffer

function buildSegments(chapters, title) {
  const segs = [];
  segs.push({ label: 'intro', text: buildIntroText(title) });

  for (const ch of chapters) {
    segs.push({ label: 'PAUSE' });
    segs.push({ label: `${ch.prefix}_ch${ch.chap}_hdr`, text: verseSpeech(ch.prefix, ch.chap, ch.startVerse) });

    // Split body into ≤3900 char chunks to stay under OpenAI's 4096 limit
    const fullBody   = ch.verses.map(v => v.text).join(' ');
    const bodyChunks = chunkText(fullBody);
    bodyChunks.forEach((chunk, i) => {
      segs.push({ label: 'PAUSE' });
      segs.push({
        label: `${ch.prefix}_ch${ch.chap}_body${bodyChunks.length > 1 ? `_p${i+1}` : ''}`,
        text: chunk,
      });
    });
  }
  return segs;
}

const MAX_TTS_CHARS = 3900; // safely under OpenAI's 4096 limit

// Split long text into chunks at sentence boundaries (≤ MAX_TTS_CHARS each)
function chunkText(text) {
  if (text.length <= MAX_TTS_CHARS) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > MAX_TTS_CHARS) {
    // Find a good split point — prefer period/sentence end before the limit
    let splitAt = MAX_TTS_CHARS;
    const periodIdx = remaining.lastIndexOf('. ', MAX_TTS_CHARS);
    const commaIdx  = remaining.lastIndexOf(', ', MAX_TTS_CHARS);
    const spaceIdx  = remaining.lastIndexOf(' ',  MAX_TTS_CHARS);

    if (periodIdx > MAX_TTS_CHARS * 0.6) splitAt = periodIdx + 2;
    else if (commaIdx > MAX_TTS_CHARS * 0.6) splitAt = commaIdx + 2;
    else if (spaceIdx > 0) splitAt = spaceIdx + 1;

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

function openaiTTS(text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model:'tts-1-hd', voice:'alloy', input:text, response_format:'mp3' });
    const req = https.request('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      if (res.statusCode !== 200) {
        let e = ''; res.on('data', c => e += c);
        res.on('end', () => reject(new Error(`OpenAI ${res.statusCode}: ${e.slice(0,200)}`)));
        return;
      }
      const chunks = []; res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

// ── Supabase ──────────────────────────────────────────────────────────────────

function supabaseGet(p) {
  return new Promise((resolve, reject) => {
    https.get(`${SUPABASE_URL}/rest/v1/${p}`, {
      headers: { 'apikey':SUPABASE_KEY, 'Authorization':`Bearer ${SUPABASE_KEY}` },
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

// ── Generate one MP3 (NT or OT) ───────────────────────────────────────────────

async function generateAudio(title, text, label, pauseBuffer) {
  if (!text) { console.log(`  ⚠️  No text for ${label}, skipping`); return null; }

  const verses   = parseVerseLines(text);
  const chapters = groupByChapter(verses);

  if (verses.length === 0) {
    console.log(`  ⚠️  Could not parse verses for ${label}`);
    return null;
  }

  console.log(`  ${label}: ${verses.length} verses, ${chapters.length} chapter(s)`);
  const segs = buildSegments(chapters, title);

  const buffers = [];
  for (const seg of segs) {
    if (seg.label === 'PAUSE') {
      buffers.push(pauseBuffer);
      continue;
    }
    process.stdout.write(`    [${seg.label}]... `);
    const buf = await openaiTTS(seg.text);
    buffers.push(buf);
    console.log(`${(buf.length/1024).toFixed(1)}KB`);
  }

  return Buffer.concat(buffers);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Generating English TTS audio for first 3 days (NT + OT)\n');

  // Generate 500ms pause once — use OpenAI TTS with a comma for a natural breath pause
  // This guarantees identical format (sample rate, encoding) as the rest of the audio
  console.log('Generating 500ms pause buffer...');
  const pauseBuffer = await openaiTTS(',');
  console.log(`  Pause: ${(pauseBuffer.length/1024).toFixed(1)}KB\n`);

  // Fetch first 3 rows ordered by date
  const rows = await supabaseGet(
    'verses?select=date,nt_title,ot_title,nt_text,ot_text&order=date.asc&limit=3'
  );
  console.log(`Fetched ${rows.length} days: ${rows.map(r => r.date).join(', ')}\n`);

  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i];
    const dayNum = String(i + 1).padStart(3, '0');
    console.log(`\n=== Day ${dayNum} (${row.date}) ===`);

    // NT
    console.log(`  NT: "${row.nt_title}"`);
    const ntBuf = await generateAudio(row.nt_title, row.nt_text, 'NT', pauseBuffer);
    if (ntBuf) {
      const ntFile = path.join(OUTPUT_DIR, `day${dayNum}_NT_en.mp3`);
      fs.writeFileSync(ntFile, ntBuf);
      console.log(`  ✅ Saved: day${dayNum}_NT_en.mp3 (${(ntBuf.length/1024).toFixed(1)}KB)`);
    }

    // OT
    console.log(`  OT: "${row.ot_title}"`);
    const otBuf = await generateAudio(row.ot_title, row.ot_text, 'OT', pauseBuffer);
    if (otBuf) {
      const otFile = path.join(OUTPUT_DIR, `day${dayNum}_OT_en.mp3`);
      fs.writeFileSync(otFile, otBuf);
      console.log(`  ✅ Saved: day${dayNum}_OT_en.mp3 (${(otBuf.length/1024).toFixed(1)}KB)`);
    }
  }

  console.log('\n✅ Done! Check the 6 MP3 files in your bible-app folder.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });

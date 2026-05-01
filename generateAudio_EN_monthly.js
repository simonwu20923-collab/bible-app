// generateAudio_EN_monthly.js
// Generates English TTS audio (NT + OT) for a given month.
// Skips files already generated, so safe to re-run if interrupted.
//
// Usage:
//   node generateAudio_EN_monthly.js --month 1          (January)
//   node generateAudio_EN_monthly.js --month 3          (March)
//   node generateAudio_EN_monthly.js --month 1 --dryrun (show what would be generated, no API calls)
//
// Output files: audio/2026-01-01_NT_en.mp3, audio/2026-01-01_OT_en.mp3, etc.

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const OPENAI_KEY   = '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';
const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';
const OUTPUT_DIR   = path.join(__dirname, 'audio');  // saves to bible-app/audio/
const MAX_TTS_CHARS = 3900;

// ── Parse args ────────────────────────────────────────────────────────────────

const monthArg = process.argv.indexOf('--month');
const MONTH    = monthArg !== -1 ? parseInt(process.argv[monthArg + 1]) : null;
const DRY_RUN  = process.argv.includes('--dryrun');

if (!MONTH || MONTH < 1 || MONTH > 12) {
  console.error('Usage: node generateAudio_EN_monthly.js --month 1  (1=January ... 12=December)');
  console.error('       add --dryrun to preview without making API calls');
  process.exit(1);
}

const MONTH_NAMES = ['','January','February','March','April','May','June',
  'July','August','September','October','November','December'];

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
  // Short forms used in the DB
  'Mt':'Matthew','Mk':'Mark','Lk':'Luke','Jn':'John',
  'Gn':'Genesis','Ex':'Exodus','Lv':'Leviticus','Nm':'Numbers','Dt':'Deuteronomy',
  'Jos':'Joshua','Jdg':'Judges','Ru':'Ruth','Ezr':'Ezra','Ne':'Nehemiah','Es':'Esther',
  'Ps':'Psalms','Pr':'Proverbs','Ec':'Ecclesiastes','Sg':'Song of Solomon',
  'Is':'Isaiah','Je':'Jeremiah','La':'Lamentations',
  'Ez':'Ezekiel','Da':'Daniel','Ho':'Hosea','Jl':'Joel',
  'Am':'Amos','Ob':'Obadiah','Jon':'Jonah','Mi':'Micah',
  'Na':'Nahum','Hab':'Habakkuk','Zep':'Zephaniah','Hg':'Haggai',
  'Zec':'Zechariah','Mal':'Malachi',
  'Ac':'Acts','Ro':'Romans','Ga':'Galatians','Ep':'Ephesians',
  'Php':'Philippians','Co':'Colossians','He':'Hebrews',
  'Jas':'James','Re':'Revelation',
  // Numbered short forms
  '1K':'First Kings','2K':'Second Kings',
  '1S':'First Samuel','2S':'Second Samuel',
  '1C':'First Chronicles','2C':'Second Chronicles',
  '1Co':'First Corinthians','2Co':'Second Corinthians',
  '1Pe':'First Peter','2Pe':'Second Peter',
  '1Jn':'First John','2Jn':'Second John','3Jn':'Third John',
  '1Ti':'First Timothy','2Ti':'Second Timothy',
  '1Th':'First Thessalonians','2Th':'Second Thessalonians',
  // Longer forms (fallbacks)
  '1 King':'First Kings','2 King':'Second Kings',
  '1 Kings':'First Kings','2 Kings':'Second Kings',
  '1 Sam':'First Samuel','2 Sam':'Second Samuel',
  '1 Chr':'First Chronicles','2 Chr':'Second Chronicles',
  '1 Cor':'First Corinthians','2 Cor':'Second Corinthians',
  '1 Pet':'First Peter','2 Pet':'Second Peter',
  '1 John':'First John','2 John':'Second John','3 John':'Third John',
  '1 Tim':'First Timothy','2 Tim':'Second Timothy',
  '1 Thess':'First Thessalonians','2 Thess':'Second Thessalonians',
  'Gen':'Genesis','Lev':'Leviticus','Num':'Numbers',
  'Deut':'Deuteronomy','Josh':'Joshua','Judg':'Judges',
  'Ruth':'Ruth','Ezra':'Ezra','Neh':'Nehemiah','Esth':'Esther',
  'Job':'Job','Prov':'Proverbs','Eccl':'Ecclesiastes',
  'Song':'Song of Solomon','Isa':'Isaiah','Jer':'Jeremiah','Lam':'Lamentations',
  'Ezek':'Ezekiel','Dan':'Daniel','Hos':'Hosea','Joel':'Joel',
  'Amos':'Amos','Obad':'Obadiah','Mic':'Micah',
  'Nah':'Nahum','Zeph':'Zephaniah','Hag':'Haggai','Zech':'Zechariah',
  'Matt':'Matthew','Acts':'Acts','Rom':'Romans','Gal':'Galatians','Eph':'Ephesians',
  'Phil':'Philippians','Col':'Colossians','Heb':'Hebrews',
  'Rev':'Revelation','Titus':'Titus','Philem':'Philemon',
};

function prefixToSpeech(p) {
  if (PREFIX_SPEECH[p]) return PREFIX_SPEECH[p];
  return PREFIX_SPEECH[p.replace(/\.$/, '')] || p;
}
function verseSpeech(prefix, chap, verse) {
  return `${prefixToSpeech(prefix)}, Chapter ${numToWords(chap)}, Verse ${numToWords(verse)}`;
}

// ── Text chunking (OpenAI 4096 char limit) ────────────────────────────────────

function chunkText(text) {
  if (text.length <= MAX_TTS_CHARS) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > MAX_TTS_CHARS) {
    let splitAt = MAX_TTS_CHARS;
    const p = remaining.lastIndexOf('. ', MAX_TTS_CHARS);
    const c = remaining.lastIndexOf(', ', MAX_TTS_CHARS);
    const s = remaining.lastIndexOf(' ', MAX_TTS_CHARS);
    if (p > MAX_TTS_CHARS * 0.6) splitAt = p + 2;
    else if (c > MAX_TTS_CHARS * 0.6) splitAt = c + 2;
    else if (s > 0) splitAt = s + 1;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

// ── Verse parsing ─────────────────────────────────────────────────────────────

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
  const chapters = []; let cur = null;
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

// ── Intro text builder ────────────────────────────────────────────────────────

function buildIntroText(title) {
  const clean = title.replace(/^(Old|New) Testament\s*-\s*/i, '').trim();
  const cross = clean.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)\s*[~\-]\s*(.+?)\s+(\d+)\s*:\s*(\d+)$/);
  if (cross)
    return `${verseSpeech(cross[1].trim(), +cross[2], +cross[3])} to ${verseSpeech(cross[4].trim(), +cross[5], +cross[6])}`;
  const same = clean.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)\s*[~\-]\s*(\d+)\s*:\s*(\d+)$/);
  if (same)
    return `${verseSpeech(same[1].trim(), +same[2], +same[3])} to Chapter ${numToWords(+same[4])}, Verse ${numToWords(+same[5])}`;
  return clean;
}

// ── TTS segment builder ───────────────────────────────────────────────────────

function buildSegments(chapters, title) {
  const segs = [];
  segs.push({ label: 'intro', text: buildIntroText(title) });
  for (const ch of chapters) {
    segs.push({ label: 'PAUSE' });
    segs.push({ label: `${ch.prefix}_ch${ch.chap}_hdr`, text: verseSpeech(ch.prefix, ch.chap, ch.startVerse) });
    const bodyChunks = chunkText(ch.verses.map(v => v.text).join(' '));
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

// ── OpenAI TTS ────────────────────────────────────────────────────────────────

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
        res.on('end', () => reject(new Error(`OpenAI ${res.statusCode}: ${e.slice(0,300)}`)));
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
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(JSON.parse(d))); }).on('error',reject);
  });
}

// ── Generate one MP3 ──────────────────────────────────────────────────────────

async function generateOne(title, text, outFile, pauseBuffer) {
  const verses   = parseVerseLines(text);
  const chapters = groupByChapter(verses);
  if (verses.length === 0) {
    console.log(`    ⚠️  No verses parsed — skipping`);
    return false;
  }

  const segs = buildSegments(chapters, title);
  const totalChars = segs.filter(s=>s.label!=='PAUSE').reduce((a,s)=>a+s.text.length,0);
  console.log(`    ${verses.length} verses, ${chapters.length} ch, ${segs.filter(s=>s.label!=='PAUSE').length} TTS calls, ~${totalChars} chars`);

  if (DRY_RUN) { console.log(`    [DRY RUN] would write: ${path.basename(outFile)}`); return true; }

  const bufs = [];
  for (const seg of segs) {
    if (seg.label === 'PAUSE') { bufs.push(pauseBuffer); continue; }
    const buf = await openaiTTS(seg.text);
    bufs.push(buf);
    process.stdout.write('.');
  }
  process.stdout.write('\n');
  fs.writeFileSync(outFile, Buffer.concat(bufs));
  return true;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const monthStr   = String(MONTH).padStart(2, '0');
  const year       = '2026';
  const dateFrom   = `${year}-${monthStr}-01`;
  // Last day of month: use next month's first day minus 1
  const nextMonth  = MONTH === 12 ? `${+year+1}-01-01` : `${year}-${String(MONTH+1).padStart(2,'0')}-01`;

  console.log(`\n🎙  Generating English audio for ${MONTH_NAMES[MONTH]} ${year}${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

  // Fetch all days in this month
  const rows = await supabaseGet(
    `verses?select=date,nt_title,ot_title,nt_text,ot_text&date=gte.${dateFrom}&date=lt.${nextMonth}&order=date.asc`
  );
  console.log(`Found ${rows.length} days in ${MONTH_NAMES[MONTH]}.\n`);

  if (rows.length === 0) { console.log('No rows found for this month.'); return; }

  // Estimate cost
  let totalChars = 0;
  for (const row of rows) {
    totalChars += (row.nt_text || '').length + (row.ot_text || '').length;
  }
  const estimatedCost = (totalChars / 1_000_000 * 30).toFixed(2); // tts-1-hd = $30/1M chars
  console.log(`Estimated cost: ~$${estimatedCost} (${(totalChars/1000).toFixed(0)}K chars at $30/1M)\n`);

  // Generate pause buffer once
  let pauseBuffer = Buffer.alloc(0);
  if (!DRY_RUN) {
    process.stdout.write('Generating pause buffer... ');
    pauseBuffer = await openaiTTS(',');
    console.log(`${(pauseBuffer.length/1024).toFixed(1)}KB\n`);
  }

  let generated = 0, skipped = 0, failed = 0;

  for (const row of rows) {
    const { date, nt_title, ot_title, nt_text, ot_text } = row;
    console.log(`\n── ${date} ──`);

    for (const [title, text, suffix] of [
      [nt_title, nt_text, 'NT'],
      [ot_title, ot_text, 'OT'],
    ]) {
      const outFile = path.join(OUTPUT_DIR, `${date}_${suffix}_en.mp3`);

      // Skip if already exists
      if (fs.existsSync(outFile)) {
        const sizeKB = (fs.statSync(outFile).size / 1024).toFixed(0);
        console.log(`  ${suffix}: ⏭️  Already exists (${sizeKB}KB) — skipping`);
        skipped++;
        continue;
      }

      console.log(`  ${suffix}: "${title}"`);
      try {
        const ok = await generateOne(title, text, outFile, pauseBuffer);
        if (ok && !DRY_RUN) {
          const sizeKB = (fs.statSync(outFile).size / 1024).toFixed(0);
          console.log(`    ✅ ${path.basename(outFile)} (${sizeKB}KB)`);
          generated++;
        }
      } catch(e) {
        console.log(`    ❌ Failed: ${e.message}`);
        failed++;
      }
    }
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`${MONTH_NAMES[MONTH]} done: ${generated} generated, ${skipped} skipped, ${failed} failed`);
  if (!DRY_RUN && generated > 0)
    console.log(`Files saved to: ${OUTPUT_DIR}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

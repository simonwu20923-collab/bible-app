/**
 * fixSpanishAbbrev.js
 *
 * Reads all Spanish verses already in Supabase and adds the book
 * abbreviation prefix to each verse line that's missing it.
 *
 * e.g. "1:1 Libro de la genealogía..."
 *   → "Mat. 1:1 Libro de la genealogía..."
 *
 * It figures out the book name from the nt_title / ot_title columns.
 *
 * Run AFTER fetchSpanishText.js finishes:
 *   node fixSpanishAbbrev.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract short book abbreviation from English title like:
 * "New Testament - Luke 1:26~1:56"  → "Lc."
 * "Old Testament - Gen. 1:1~2:25"   → "Gn."
 * "Old Testament - 1 Sam. 16:1~17:58" → "1 Sam."
 *
 * We use a map of English book names → Spanish abbreviations
 */
const BOOK_ABBREV = {
  // NT
  'Matthew': 'Mt.', 'Matt': 'Mt.',
  'Mark': 'Mc.',
  'Luke': 'Lc.',
  'John': 'Jn.',
  'Acts': 'Hch.',
  'Romans': 'Ro.',
  'Romans': 'Ro.',
  '1 Corinthians': '1 Co.', '1 Cor': '1 Co.',
  '2 Corinthians': '2 Co.', '2 Cor': '2 Co.',
  'Galatians': 'Gá.',
  'Ephesians': 'Ef.',
  'Philippians': 'Fil.',
  'Colossians': 'Col.',
  '1 Thessalonians': '1 Ts.', '1 Thess': '1 Ts.',
  '2 Thessalonians': '2 Ts.', '2 Thess': '2 Ts.',
  '1 Timothy': '1 Ti.', '1 Tim': '1 Ti.',
  '2 Timothy': '2 Ti.', '2 Tim': '2 Ti.',
  'Titus': 'Tit.',
  'Philemon': 'Flm.',
  'Hebrews': 'He.',
  'James': 'Stg.',
  '1 Peter': '1 P.', '1 Pet': '1 P.',
  '2 Peter': '2 P.', '2 Pet': '2 P.',
  '1 John': '1 Jn.',
  '2 John': '2 Jn.',
  '3 John': '3 Jn.',
  'Jude': 'Jud.',
  'Revelation': 'Ap.',
  // OT
  'Genesis': 'Gn.', 'Gen': 'Gn.',
  'Exodus': 'Éx.', 'Exod': 'Éx.',
  'Leviticus': 'Lv.', 'Lev': 'Lv.',
  'Numbers': 'Nm.', 'Num': 'Nm.',
  'Deuteronomy': 'Dt.', 'Deut': 'Dt.',
  'Joshua': 'Jos.',
  'Judges': 'Jue.',
  'Ruth': 'Rt.',
  '1 Samuel': '1 S.', '1 Sam': '1 S.',
  '2 Samuel': '2 S.', '2 Sam': '2 S.',
  '1 Kings': '1 R.',
  '2 Kings': '2 R.',
  '1 Chronicles': '1 Cr.', '1 Chron': '1 Cr.',
  '2 Chronicles': '2 Cr.', '2 Chron': '2 Cr.',
  'Ezra': 'Esd.',
  'Nehemiah': 'Neh.',
  'Esther': 'Est.',
  'Job': 'Job.',
  'Psalms': 'Sal.', 'Psalm': 'Sal.', 'Ps': 'Sal.',
  'Proverbs': 'Pr.', 'Prov': 'Pr.',
  'Ecclesiastes': 'Ec.',
  'Song of Songs': 'Cnt.', 'Song': 'Cnt.',
  'Isaiah': 'Is.',
  'Jeremiah': 'Jer.',
  'Lamentations': 'Lm.',
  'Ezekiel': 'Ez.',
  'Daniel': 'Dn.',
  'Hosea': 'Os.',
  'Joel': 'Jl.',
  'Amos': 'Am.',
  'Obadiah': 'Abd.',
  'Jonah': 'Jon.',
  'Micah': 'Mi.',
  'Nahum': 'Nah.',
  'Habakkuk': 'Hab.',
  'Zephaniah': 'Sof.',
  'Haggai': 'Hag.',
  'Zechariah': 'Zac.',
  'Malachi': 'Mal.',
};

function getAbbrev(title) {
  if (!title) return '';
  // Title format: "New Testament - Luke 20:20~21:4"
  // or "Old Testament - 1 Sam. 16:1~17:58"
  const part = title.replace(/New Testament\s*-\s*/i, '')
                    .replace(/Old Testament\s*-\s*/i, '')
                    .trim();

  // Try longest match first
  const sorted = Object.keys(BOOK_ABBREV).sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    if (part.toLowerCase().startsWith(key.toLowerCase())) {
      return BOOK_ABBREV[key];
    }
  }

  // Fallback: grab first word(s) before the chapter number
  const m = part.match(/^([\w\s\.]+?)\s+\d+:/);
  if (m) return m[1].trim();
  return '';
}

function addAbbrevToText(text, abbrev) {
  if (!text || !abbrev) return text;
  return text.split('\n').map(line => {
    // Only fix lines that start with a bare chapter:verse (no prefix yet)
    if (/^\d+:\d+\s/.test(line)) {
      return `${abbrev} ${line}`;
    }
    return line; // already has prefix, leave alone
  }).join('\n');
}

async function main() {
  console.log('🔤 Adding book abbreviations to Spanish verses...\n');

  // Fetch all rows that have Spanish text
  const { data: rows, error } = await supabase
    .from('verses')
    .select('date, nt_title, ot_title, nt_text_es, ot_text_es')
    .not('nt_text_es', 'is', null);

  if (error) {
    console.error('Failed to fetch rows:', error.message);
    return;
  }

  console.log(`Found ${rows.length} rows with Spanish text\n`);

  let fixed = 0, skipped = 0, errors = 0;

  for (const row of rows) {
    const ntAbbrev = getAbbrev(row.nt_title);
    const otAbbrev = getAbbrev(row.ot_title);

    const newNT = addAbbrevToText(row.nt_text_es, ntAbbrev);
    const newOT = addAbbrevToText(row.ot_text_es, otAbbrev);

    // Check if anything changed
    if (newNT === row.nt_text_es && newOT === row.ot_text_es) {
      skipped++;
      continue;
    }

    const { error: updateErr } = await supabase
      .from('verses')
      .update({ nt_text_es: newNT, ot_text_es: newOT })
      .eq('date', row.date);

    if (updateErr) {
      console.error(`  ✗ ${row.date}: ${updateErr.message}`);
      errors++;
    } else {
      console.log(`  ✓ ${row.date}  NT:${ntAbbrev}  OT:${otAbbrev}`);
      fixed++;
    }

    await sleep(100);
  }

  console.log('\n✅ Done!');
  console.log(`   Fixed   : ${fixed}`);
  console.log(`   Skipped : ${skipped}`);
  console.log(`   Errors  : ${errors}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

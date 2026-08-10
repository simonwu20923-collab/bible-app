// fixNtLeak.js
// Some `verses` rows have part of the OT portion appended to the END of nt_text, so the
// NT card on the Reading page shows a tail of stray Old Testament content. Two shapes:
//
//   - Psalm superscriptions ("Of David", "A Song of Ascents", "ב (Beth)", ...)
//   - the entire OT reading copied in (e.g. 2026-09-24 carries all of S.S. 1—4
//     after Gal. 6:18)
//
// Both are stripped by the same rule: remove a trailing block of nt_text lines when
// every one of them appears VERBATIM in that row's ot_text. Since an OT verse line
// carries an OT book reference, no genuine NT line can match, so the guard makes it
// impossible to delete real NT text — a row with an unrecognised tail is left alone.
//
//   node fixNtLeak.js --dry-run
//   node fixNtLeak.js
//   node fixNtLeak.js --self-check

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lsvhmvkhernimxmzcyak.supabase.co',
  'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc'
);
const DRY_RUN = process.argv.includes('--dry-run');

// "Rm 8 :14 text" / "Sal. 31:1 text" / "詩 31:1 text"  → a verse line.
// "Pm 1 text" / "Jd 25 text" → single-chapter books have no colon.
const VERSE_RE  = /^\S+\s+\d+\s*:\s*\d+\s/;
const SINGLE_RE = /^(?:Pm|Phm|2J|3J|Jd|Ob)\s+\d+\s/;
const isVerse = l => VERSE_RE.test(l.trim()) || SINGLE_RE.test(l.trim());

// Returns the cleaned nt_text, or null if there is nothing safe to strip.
function stripTrailingOtLines(ntText, otText) {
  const lines = (ntText || '').split('\n');
  const otLines = new Set((otText || '').split('\n').map(l => l.trim()).filter(Boolean));

  let cut = lines.length;
  let removed = 0;
  while (cut > 0) {
    const line = lines[cut - 1].trim();
    if (!line) { cut--; continue; }        // trailing blank — drop it too
    if (!otLines.has(line)) break;         // not OT content — this is real NT text, stop
    removed++;
    cut--;
  }
  if (!removed) return null;
  return lines.slice(0, cut).join('\n');
}

async function main() {
  if (DRY_RUN) console.log('=== DRY RUN — no writes ===\n');

  const { data, error } = await supabase
    .from('verses')
    .select('date,nt_title,nt_text,ot_text')
    .order('date');
  if (error) throw error;

  let fixed = 0, skipped = 0;
  for (const row of data) {
    const cleaned = stripTrailingOtLines(row.nt_text, row.ot_text);
    if (cleaned === null) continue;

    const removed = row.nt_text.split('\n').length - cleaned.split('\n').length;
    console.log(`${row.date}  ${row.nt_title}  — removing ${removed} stray OT line(s)`);

    if (DRY_RUN) { fixed++; continue; }
    const { error: uErr } = await supabase.from('verses')
      .update({ nt_text: cleaned }).eq('date', row.date);
    if (uErr) { console.error(`  ✗ ${uErr.message}`); skipped++; }
    else fixed++;
  }

  console.log(`\n${DRY_RUN ? 'Would fix' : 'Fixed'}: ${fixed} row(s)${skipped ? `, failed: ${skipped}` : ''}`);
}

function selfCheck() {
  const ot = 'Of David\nPs 32 :1 Blessed is he\nA Song of Ascents';
  // Superscriptions copied from the OT portion
  console.assert(stripTrailingOtLines('Rm 8 :13 real verse\nOf David\nA Song of Ascents', ot)
    === 'Rm 8 :13 real verse', 'strips OT headings');
  // A whole OT verse block copied in (the 2026-09-24 shape)
  console.assert(stripTrailingOtLines('Ga 6 :18 grace\nPs 32 :1 Blessed is he', ot)
    === 'Ga 6 :18 grace', 'strips copied OT verses');
  // A tail that is NOT in ot_text must be left alone — it could be real NT content
  console.assert(stripTrailingOtLines('Rm 8 :13 x\nSomething else', ot) === null, 'leaves unknown tails');
  // Clean rows are untouched
  console.assert(stripTrailingOtLines('Rm 8 :13 x\nRm 8 :14 y', ot) === null, 'no-op on clean rows');
  // An NT verse is never removed just because the OT has a verse with the same number
  console.assert(stripTrailingOtLines('Jd 24 x\nJd 25 y', 'Ps 25 :1 z') === null, 'keeps NT verses');
  console.log('self-check OK');
}

if (process.argv.includes('--self-check')) selfCheck();
else main().catch(err => { console.error('Fatal:', err); process.exit(1); });

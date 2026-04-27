/**
 * fixChineseSymbols.js
 * Removes weird replacement characters (＊, ?, ?, etc.) from Chinese text in Supabase
 * Run: node fixChineseSymbols.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function cleanText(text) {
  if (!text) return text;
  return text
    .replace(/\uFFFD/g, '')      // Unicode replacement character ?
    .replace(/[\u0080-\u009F]/g, '') // Control characters
    .replace(/\?\?/g, '')         // Double question marks
    .replace(/[^\u0000-\u007F\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\u2000-\u206f\n:，。！？；：「」『』、…—·（）【】\d\s]/g, '')
    .replace(/\s{2,}/g, ' ')     // Multiple spaces to single
    .trim();
}

async function main() {
  console.log('🔧 Cleaning Chinese text symbols...\n');

  const { data: rows, error } = await supabase
    .from('verses')
    .select('date, nt_text_zh, ot_text_zh')
    .not('nt_text_zh', 'is', null);

  if (error) { console.error('Fetch error:', error.message); return; }
  console.log(`Found ${rows.length} rows to check\n`);

  let fixed = 0, skipped = 0;

  for (const row of rows) {
    const newNT = cleanText(row.nt_text_zh);
    const newOT = cleanText(row.ot_text_zh);

    if (newNT === row.nt_text_zh && newOT === row.ot_text_zh) {
      skipped++;
      continue;
    }

    const { error: updateErr } = await supabase
      .from('verses')
      .update({ nt_text_zh: newNT, ot_text_zh: newOT })
      .eq('date', row.date);

    if (updateErr) {
      console.error(`✗ ${row.date}: ${updateErr.message}`);
    } else {
      console.log(`✓ ${row.date} cleaned`);
      fixed++;
    }
    await sleep(100);
  }

  console.log(`\n✅ Done! Fixed: ${fixed}, Already clean: ${skipped}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

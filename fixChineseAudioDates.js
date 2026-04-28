/**
 * fixChineseAudioDates.js
 * Fixes missing Chinese audio for specific dates using local M3U files
 * Missing:
 *   NT: 2/19 (Mark 4), 2/23 (Mark 6), 2/25 (Mark 7)
 *   OT: 2/25 (Numbers 7), 3/12 (Deuteronomy 34), 7/4 (2 Chronicles 36)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const M3U_DIR = path.join(__dirname, 'chinese-m3u');

function parseM3U(text) {
  text = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const chapters = {};
  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].startsWith('#EXTINF:')) continue;
    const match = lines[i].match(/[Cc]hapter[\s_]+0*(\d+)/);
    if (match) {
      const chapNum = parseInt(match[1], 10);
      const nextLine = lines[i + 1];
      if (nextLine && !nextLine.startsWith('#')) {
        chapters[chapNum] = nextLine.trim();
        i++;
      }
    }
  }
  return chapters;
}

function readM3U(filename) {
  const filePath = path.join(M3U_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return {};
  }
  return parseM3U(fs.readFileSync(filePath, 'utf8'));
}

function getUrls(chapters, startChap, endChap) {
  const urls = [];
  for (let c = startChap; c <= endChap; c++) {
    if (chapters[c]) urls.push(chapters[c]);
    else console.warn(`  ⚠ Chapter ${c} not found`);
  }
  return urls.length > 0 ? JSON.stringify(urls) : null;
}

async function updateDate(date, updates) {
  const { error } = await supabase.from('verses').update(updates).eq('date', date);
  if (error) console.error(`  ✗ ${date}: ${error.message}`);
  else console.log(`  ✓ ${date} updated`);
}

async function main() {
  console.log('🔧 Fixing missing Chinese audio dates\n');

  // Load playlists
  const markChaps = readM3U('Mark.m3u');
  const numbersChaps = readM3U('Numbers.m3u');
  const deutChaps = readM3U('Deuteronomy.m3u');
  const chronChaps = readM3U('2+Chronicles.m3u');

  console.log(`Mark: ${Object.keys(markChaps).length} chapters`);
  console.log(`Numbers: ${Object.keys(numbersChaps).length} chapters`);
  console.log(`Deuteronomy: ${Object.keys(deutChaps).length} chapters`);
  console.log(`2 Chronicles: ${Object.keys(chronChaps).length} chapters\n`);

  // NT: 2/19 - Mark 4:21~4:34 (chapter 4)
  console.log('Feb 19 - NT: Mark ch.4');
  const mark4 = getUrls(markChaps, 4, 4);
  if (mark4) await updateDate('2026-02-19', { nt_audio_zh: mark4 });

  // NT: 2/23 - Mark 6:1~6:29 (chapter 6)
  console.log('Feb 23 - NT: Mark ch.6');
  const mark6 = getUrls(markChaps, 6, 6);
  if (mark6) await updateDate('2026-02-23', { nt_audio_zh: mark6 });

  // NT+OT: 2/25 - NT: Mark ch.7, OT: Numbers ch.7
  console.log('Feb 25 - NT: Mark ch.7, OT: Numbers ch.7');
  const mark7 = getUrls(markChaps, 7, 7);
  const num7 = getUrls(numbersChaps, 7, 7);
  if (mark7 || num7) {
    const updates = {};
    if (mark7) updates.nt_audio_zh = mark7;
    if (num7) updates.ot_audio_zh = num7;
    await updateDate('2026-02-25', updates);
  }

  // OT: 3/12 - Deuteronomy 34 (last chapter, spreadsheet had 35)
  console.log('Mar 12 - OT: Deuteronomy ch.34');
  const deut34 = getUrls(deutChaps, 34, 34);
  if (deut34) await updateDate('2026-03-12', { ot_audio_zh: deut34 });

  // OT: 7/4 - 2 Chronicles ch.36
  console.log('Jul 4 - OT: 2 Chronicles ch.36');
  const chron36 = getUrls(chronChaps, 36, 36);
  if (chron36) await updateDate('2026-07-04', { ot_audio_zh: chron36 });

  console.log('\n✅ Done!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

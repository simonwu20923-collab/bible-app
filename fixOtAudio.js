/**
 * fixOtAudio.js - fixes 3 dates with spreadsheet data errors
 * Feb 25: Numbers ch.7 (OT_End was wrong)
 * Mar 12: Deuteronomy ch.34 (last chapter, was listed as 35)
 * Jul 4: Need to check what the actual reading should be
 */

const { createClient } = require('@supabase/supabase-js');
const http = require('http');
const https = require('https');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location)
        return fetchText(res.headers.location).then(resolve).catch(reject);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

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

async function getChapters(playlistIndex) {
  const url = `https://www.churchinpiscataway.org/bible/playlist/${playlistIndex}`;
  console.log(`  Fetching playlist ${playlistIndex}...`);
  const text = await fetchText(url);
  const chapters = parseM3U(text);
  console.log(`  Found ${Object.keys(chapters).length} chapters`);
  return chapters;
}

async function main() {
  console.log('🔧 Fixing OT audio for 3 dates with spreadsheet errors\n');

  // Numbers = playlist 4, chapter 7
  console.log('Feb 25 - Numbers ch.7:');
  const numbersChaps = await getChapters(4);
  const num7 = numbersChaps[7];
  console.log(`  ch.7 → ${num7 || 'NOT FOUND'}`);
  if (num7) {
    const { error } = await supabase.from('verses')
      .update({ ot_audio: JSON.stringify([num7]) })
      .eq('date', '2026-02-25');
    console.log(error ? `  ✗ ${error.message}` : '  ✓ Updated');
  }

  // Deuteronomy = playlist 5, chapter 34 (last chapter, was listed as 35)
  console.log('\nMar 12 - Deuteronomy ch.34:');
  const deutChaps = await getChapters(5);
  const deut34 = deutChaps[34];
  console.log(`  ch.34 → ${deut34 || 'NOT FOUND'}`);
  if (deut34) {
    const { error } = await supabase.from('verses')
      .update({ ot_audio: JSON.stringify([deut34]) })
      .eq('date', '2026-03-12');
    console.log(error ? `  ✗ ${error.message}` : '  ✓ Updated');
  }

  // Jul 4 - Ezra only has 10 chapters, ch.36 is wrong
  // Let's check what the actual OT text says for that date
  const { data: jul4 } = await supabase.from('verses')
    .select('ot_title, ot_text_es').eq('date', '2026-07-04').single();
  console.log('\nJul 4 OT title:', jul4?.ot_title);
  console.log('Jul 4 OT ES start:', jul4?.ot_text_es?.substring(0, 100));

  console.log('\n✅ Done!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

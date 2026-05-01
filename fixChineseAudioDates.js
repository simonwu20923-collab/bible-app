/**
 * fixChineseAudioDates.js
 * Fixes 4 dates with spreadsheet errors using Accept-Language: zh-CN
 * NT 2/19: Mark ch.4, NT 2/23: Mark ch.6
 * OT 3/12: Deuteronomy ch.34 (spreadsheet says 35, doesn't exist)
 * OT 7/4: 2 Chronicles ch.36 (spreadsheet says Ezra ch.36, doesn't exist)
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const chunks = [];
    lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
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

async function getPlaylist(idx) {
  const text = await fetchText(`https://www.churchinpiscataway.org/bible/playlist/${idx}`);
  return parseM3U(text);
}

async function update(date, field, urls) {
  const { error } = await supabase.from('verses')
    .update({ [field]: JSON.stringify(urls) }).eq('date', date);
  console.log(error ? `  ✗ ${date}: ${error.message}` : `  ✓ ${date} ${field} updated`);
}

async function main() {
  console.log('🔧 Fixing 4 missing Chinese audio dates\n');

  // Mark = playlist 41
  console.log('Fetching Mark (41)...');
  const mark = await getPlaylist(41);
  console.log(`  ${Object.keys(mark).length} chapters\n`);

  // NT 2/19: Mark ch.4
  if (mark[4]) await update('2026-02-19', 'nt_audio_zh', [mark[4]]);
  else console.log('  ⚠ Mark ch.4 not found');
  await sleep(200);

  // NT 2/23: Mark ch.6
  if (mark[6]) await update('2026-02-23', 'nt_audio_zh', [mark[6]]);
  else console.log('  ⚠ Mark ch.6 not found');
  await sleep(500);

  // Deuteronomy = playlist 5, use ch.34 (last chapter)
  console.log('\nFetching Deuteronomy (5)...');
  const deut = await getPlaylist(5);
  console.log(`  ${Object.keys(deut).length} chapters\n`);

  if (deut[34]) await update('2026-03-12', 'ot_audio_zh', [deut[34]]);
  else console.log('  ⚠ Deuteronomy ch.34 not found');
  await sleep(500);

  // 2 Chronicles = playlist 14, ch.36
  console.log('\nFetching 2 Chronicles (14)...');
  const chron = await getPlaylist(14);
  console.log(`  ${Object.keys(chron).length} chapters\n`);

  if (chron[36]) await update('2026-07-04', 'ot_audio_zh', [chron[36]]);
  else console.log('  ⚠ 2 Chronicles ch.36 not found');

  console.log('\n✅ Done!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

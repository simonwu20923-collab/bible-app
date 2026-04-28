/**
 * fixMissingAudio.js
 * Fixes specific dates with missing NT or OT audio
 * Run: node fixMissingAudio.js
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

async function main() {
  console.log('🔧 Fixing missing audio for specific dates...\n');

  // Fetch Mark playlist (index 41)
  console.log('Fetching Mark M3U playlist...');
  const markText = await fetchText('https://www.churchinpiscataway.org/bible/playlist/41');
  const markChapters = parseM3U(markText);
  console.log(`Mark chapters found: ${Object.keys(markChapters).length}`);
  console.log('Available chapters:', Object.keys(markChapters).sort((a,b)=>a-b).join(', '));

  // Dates to fix with their correct chapter numbers
  const fixes = [
    { date: '2026-02-19', ntChap: 4,  otChap: null },  // Mark 4:1~20
    { date: '2026-02-23', ntChap: 6,  otChap: null },  // Mark 6:1~29
    { date: '2026-02-25', ntChap: 7,  otChap: null },  // Mark 7:1~30
  ];

  for (const fix of fixes) {
    const ntAudio = fix.ntChap ? markChapters[fix.ntChap] : undefined;
    console.log(`\n${fix.date}: Mark ch.${fix.ntChap} → ${ntAudio || 'NOT FOUND'}`);

    if (ntAudio) {
      const { error } = await supabase.from('verses')
        .update({ nt_audio: JSON.stringify([ntAudio]) })
        .eq('date', fix.date);
      if (error) console.error(`  ✗ ${error.message}`);
      else console.log(`  ✓ Updated`);
    }
  }

  console.log('\n✅ Done!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

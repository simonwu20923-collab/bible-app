// fixMay26_final.js
// Fixes May 26 "1 King 22:51~2 King 2:18" with known URLs.
//
// EN: [1Kings_Ch22 (kept), 2Kings_Ch1 (provided), 2Kings_Ch2 (from May27)]
// ZH: [1Kings_Ch22 (kept), 2Kings_Ch1 (fetched from playlist 12), 2Kings_Ch2 (from May27)]
//
// Run:       node fixMay26_final.js --key YOUR_KEY
// Apply fix: node fixMay26_final.js --key YOUR_KEY --fix

const https = require('https');
const http = require('http');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const TARGET_DATE  = '2026-05-26';
const NEXT_DATE    = '2026-05-27';

// ── Known values ─────────────────────────────────────────────────────────────
const TWOKINIGS_CH1_EN = 'http://www.churchinpiscataway.org/File/Get/_7HINVNGqAYKYEMVvVWP2SDWar2h7gl-';
const TWOKINIGS_PLAYLIST = 12; // confirmed: playlist 12 = 2 Kings (25 chapters)

const keyArgIdx = process.argv.indexOf('--key');
const SUPABASE_KEY = keyArgIdx !== -1 ? process.argv[keyArgIdx + 1] : null;
const DRY_RUN = !process.argv.includes('--fix');

if (!SUPABASE_KEY) {
  console.error('Usage: node fixMay26_final.js --key YOUR_KEY [--fix]');
  process.exit(1);
}

function fetchText(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', ...headers },
      timeout: 10000,
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, '')));
    }).on('error', reject);
  });
}

function parseM3u(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const entries = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXTINF:')) {
      const url = lines[i + 1];
      if (url && !url.startsWith('#')) { entries.push(url.trim()); i++; }
    }
  }
  return entries;
}

function supabaseGet(path) {
  return new Promise((resolve, reject) => {
    https.get(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function supabasePatch(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN\n' : '✏️  FIX MODE\n');

  // ── 1. Fetch May 26 and May 27 from Supabase
  console.log('Fetching rows from Supabase...');
  const [[row26], [row27]] = await Promise.all([
    supabaseGet(`verses?select=ot_audio,ot_audio_zh&date=eq.${TARGET_DATE}`),
    supabaseGet(`verses?select=ot_audio,ot_audio_zh&date=eq.${NEXT_DATE}`),
  ]);

  const may26En = JSON.parse(row26.ot_audio || '[]');
  const may26Zh = JSON.parse(row26.ot_audio_zh || '[]');
  const may27En = JSON.parse(row27.ot_audio || '[]');
  const may27Zh = JSON.parse(row27.ot_audio_zh || '[]');

  const oneKings22En = may26En[0];
  const oneKings22Zh = may26Zh[0];
  const twoKingsCh2En = may27En[0];
  const twoKingsCh2Zh = may27Zh[0];

  console.log('1 Kings Ch.22 EN :', oneKings22En);
  console.log('1 Kings Ch.22 ZH :', oneKings22Zh);
  console.log('2 Kings Ch.2  EN :', twoKingsCh2En);
  console.log('2 Kings Ch.2  ZH :', twoKingsCh2Zh);

  // ── 2. EN Ch.1 — already known
  const twoKingsCh1En = TWOKINIGS_CH1_EN;
  console.log('\n2 Kings Ch.1  EN :', twoKingsCh1En, '✅ (provided)');

  // ── 3. ZH Ch.1 — fetch from playlist 12 with zh-CN header
  console.log(`\nFetching 2 Kings ZH from playlist ${TWOKINIGS_PLAYLIST}...`);
  const zhM3u = await fetchText(
    `https://www.churchinpiscataway.org/bible/playlist/${TWOKINIGS_PLAYLIST}`,
    { 'Accept-Language': 'zh-CN' }
  );
  const zhUrls = parseM3u(zhM3u);
  console.log(`Found ${zhUrls.length} ZH chapters`);

  const twoKingsCh1Zh = zhUrls[0] || null;
  if (twoKingsCh1Zh) {
    console.log('2 Kings Ch.1  ZH :', twoKingsCh1Zh, '✅');
  } else {
    console.warn('⚠️  Could not get ZH Ch.1 — ZH audio will be left unchanged');
  }

  // ── 4. Verify prefix patterns match (sanity check)
  const enPrefix2K = '_7HINVNGqAYKYEMVvVWP2';
  if (!twoKingsCh1En.includes(enPrefix2K)) {
    console.warn('\n⚠️  Warning: 2 Kings Ch.1 EN URL has unexpected prefix. Double-check before applying!');
  } else {
    console.log('\n✅ Prefix check passed — Ch.1 URL matches 2 Kings EN prefix');
  }

  // ── 5. Build corrected arrays
  const newEnAudio = [oneKings22En, twoKingsCh1En, twoKingsCh2En];
  const newZhAudio = (oneKings22Zh && twoKingsCh1Zh && twoKingsCh2Zh)
    ? [oneKings22Zh, twoKingsCh1Zh, twoKingsCh2Zh]
    : null;

  console.log('\n--- Proposed fix for May 26 OT audio ---');
  console.log('EN:', JSON.stringify(newEnAudio, null, 2));
  if (newZhAudio) console.log('ZH:', JSON.stringify(newZhAudio, null, 2));
  else console.log('ZH: unchanged');

  if (DRY_RUN) {
    console.log('\nDry run done. Add --fix to apply.');
    return;
  }

  // ── 6. Apply fix
  const patch = { ot_audio: JSON.stringify(newEnAudio) };
  if (newZhAudio) patch.ot_audio_zh = JSON.stringify(newZhAudio);

  const result = await supabasePatch(`verses?date=eq.${TARGET_DATE}`, patch);
  if (result.status === 200 || result.status === 204) {
    console.log(`\n✅ Updated ${TARGET_DATE} successfully!`);
    console.log('Audio buttons: 1 King Ch. 22 | 2 King Ch. 1 | 2 King Ch. 2');
  } else {
    console.error('\n❌ Update failed:', result.status, result.body);
  }
}

main().catch(console.error);

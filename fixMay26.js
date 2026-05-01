// fixMay26.js
// Fixes May 26: "1 King 22:51~2 King 2:18"
// Current (wrong): [1Kings_Ch22, bad_url]
// Correct:         [1Kings_Ch22, 2Kings_Ch1, 2Kings_Ch2]
//
// Run:       node fixMay26.js --key YOUR_KEY
// Apply fix: node fixMay26.js --key YOUR_KEY --fix

const https = require('https');
const http = require('http');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const TARGET_DATE = '2026-05-26';

const keyArgIdx = process.argv.indexOf('--key');
const SUPABASE_KEY = keyArgIdx !== -1 ? process.argv[keyArgIdx + 1] : null;
const DRY_RUN = !process.argv.includes('--fix');

if (!SUPABASE_KEY) {
  console.error('Usage: node fixMay26.js --key YOUR_KEY [--fix]');
  process.exit(1);
}

function fetchText(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', ...extraHeaders } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchText(res.headers.location, extraHeaders).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, '')));
    }).on('error', reject);
  });
}

function supabaseGet(path) {
  return new Promise((resolve, reject) => {
    https.get(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
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
      }
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

function parseM3u(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const entries = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXTINF:')) {
      const titleMatch = lines[i].match(/#EXTINF:[^,]*,\s*(.+)/);
      const url = lines[i + 1];
      if (url && !url.startsWith('#')) {
        entries.push({ title: titleMatch ? titleMatch[1].trim() : '', url: url.trim() });
        i++;
      }
    }
  }
  return entries;
}

async function find2KingsPlaylist(startN = 10, endN = 30, extraHeaders = {}) {
  console.log(`Scanning playlists ${startN}-${endN} for 2 Kings...`);
  for (let n = startN; n <= endN; n++) {
    const url = `https://www.churchinpiscataway.org/bible/playlist/${n}`;
    try {
      const text = await fetchText(url, extraHeaders);
      const entries = parseM3u(text);
      if (entries.length === 0) continue;
      const first = entries[0].title.toLowerCase();
      if (first.includes('2 king') || first.includes('2king')) {
        console.log(`  Found 2 Kings at playlist ${n}: "${entries[0].title}" (${entries.length} chapters)`);
        return { n, entries };
      }
      if (first.includes('king')) {
        console.log(`  Playlist ${n}: "${entries[0].title}" (${entries.length} ch) - not 2 Kings`);
      }
    } catch (e) {
      // skip
    }
  }
  return null;
}

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN\n' : '✏️  FIX MODE\n');

  console.log(`Fetching ${TARGET_DATE} from Supabase...`);
  const [row] = await supabaseGet(
    `verses?select=date,ot_title,ot_audio,ot_audio_zh&date=eq.${TARGET_DATE}`
  );
  if (!row) { console.error('Row not found'); process.exit(1); }

  const currentEn = JSON.parse(row.ot_audio || '[]');
  const currentZh = JSON.parse(row.ot_audio_zh || '[]');

  console.log(`Title: "${row.ot_title}"`);
  console.log(`Current EN (${currentEn.length}):`, currentEn);
  console.log(`Current ZH (${currentZh.length}):`, currentZh);
  console.log();

  const keep1KingsEn = currentEn[0];
  const keep1KingsZh = currentZh[0];
  if (!keep1KingsEn) { console.error('No EN audio found'); process.exit(1); }

  // Find 2 Kings EN playlist
  const resultEn = await find2KingsPlaylist(10, 30, {});
  if (!resultEn || resultEn.entries.length < 2) {
    console.error('Could not find 2 Kings EN with at least 2 chapters');
    process.exit(1);
  }

  const twoKingsCh1En = resultEn.entries[0].url;
  const twoKingsCh2En = resultEn.entries[1].url;
  console.log(`\n2 Kings Ch.1 EN: ${twoKingsCh1En}`);
  console.log(`2 Kings Ch.2 EN: ${twoKingsCh2En}`);

  // Find 2 Kings ZH playlist (same number, zh-CN header)
  console.log();
  const resultZh = await find2KingsPlaylist(resultEn.n, resultEn.n, { 'Accept-Language': 'zh-CN' });
  let twoKingsCh1Zh = null, twoKingsCh2Zh = null;
  if (resultZh && resultZh.entries.length >= 2) {
    twoKingsCh1Zh = resultZh.entries[0].url;
    twoKingsCh2Zh = resultZh.entries[1].url;
    console.log(`2 Kings Ch.1 ZH: ${twoKingsCh1Zh}`);
    console.log(`2 Kings Ch.2 ZH: ${twoKingsCh2Zh}`);
  } else {
    console.log('Could not fetch ZH playlist — will leave ZH audio unchanged');
  }

  const newEnAudio = [keep1KingsEn, twoKingsCh1En, twoKingsCh2En];
  const newZhAudio = (keep1KingsZh && twoKingsCh1Zh && twoKingsCh2Zh)
    ? [keep1KingsZh, twoKingsCh1Zh, twoKingsCh2Zh]
    : null;

  console.log('\n--- Proposed fix ---');
  console.log('New EN:', newEnAudio);
  if (newZhAudio) console.log('New ZH:', newZhAudio);

  if (DRY_RUN) {
    console.log('\nDry run done. Add --fix to apply.');
    return;
  }

  const patch = { ot_audio: JSON.stringify(newEnAudio) };
  if (newZhAudio) patch.ot_audio_zh = JSON.stringify(newZhAudio);

  const result = await supabasePatch(`verses?date=eq.${TARGET_DATE}`, patch);
  if (result.status === 200 || result.status === 204) {
    console.log(`\n✅ Updated ${TARGET_DATE} — buttons: 1 King Ch. 22 | 2 King Ch. 1 | 2 King Ch. 2`);
  } else {
    console.error('\n❌ Failed:', result.status, result.body);
  }
}

main().catch(console.error);

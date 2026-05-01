// fixMay26_v3.js
// Uses May 27 data (already known) to get 2Kings Ch2, 
// and scans playlists to find 2Kings Ch1.
// 
// Run:       node fixMay26_v3.js --key YOUR_KEY
// Apply fix: node fixMay26_v3.js --key YOUR_KEY --fix

const https = require('https');
const http = require('http');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const TARGET_DATE = '2026-05-26';
const NEXT_DATE   = '2026-05-27';

const keyArgIdx = process.argv.indexOf('--key');
const SUPABASE_KEY = keyArgIdx !== -1 ? process.argv[keyArgIdx + 1] : null;
const DRY_RUN = !process.argv.includes('--fix');

if (!SUPABASE_KEY) {
  console.error('Usage: node fixMay26_v3.js --key YOUR_KEY [--fix]');
  process.exit(1);
}

// ── helpers ──────────────────────────────────────────────────────────────────

function fetchRaw(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', ...headers },
      timeout: 10000,
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        text: Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, ''),
      }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function parseM3u(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const entries = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXTINF:')) {
      const m = lines[i].match(/#EXTINF:[^,]*,\s*(.+)/);
      const url = lines[i + 1];
      if (url && !url.startsWith('#')) {
        entries.push({ title: m ? m[1].trim() : '', url: url.trim() });
        i++;
      }
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

// ── playlist scanner (wide, prints raw response for diagnosis) ────────────────

async function findCh1(extraHeaders = {}, langLabel = 'EN') {
  console.log(`\nScanning playlists 1-150 for 2 Kings (${langLabel})...`);
  console.log('(Printing raw preview of every playlist found)\n');

  for (let n = 1; n <= 150; n++) {
    // Try https first, fall back to http
    for (const scheme of ['https', 'http']) {
      const url = `${scheme}://www.churchinpiscataway.org/bible/playlist/${n}`;
      try {
        const { status, text } = await fetchRaw(url, extraHeaders);
        if (status !== 200) continue;
        if (!text || text.trim().length === 0) continue;

        // Print every playlist we get something from
        const preview = text.slice(0, 120).replace(/\n/g, ' | ');
        const entries = parseM3u(text);

        if (entries.length > 0) {
          console.log(`  [${n}] ${entries.length} chapters — first title: "${entries[0].title}"`);
          // Look for 2 Kings
          const t = entries[0].title.toLowerCase();
          if (
            t.includes('2 king') || t.includes('2king') ||
            t.includes('ii king') || t.includes('second king') ||
            t.includes('kings2') || t.includes('2nd king')
          ) {
            console.log(`  ✅ Found 2 Kings at playlist ${n} (${langLabel})!`);
            return { n, entries, scheme };
          }
        } else if (text.includes('#EXTM3U') || text.includes('EXTINF')) {
          console.log(`  [${n}] M3U found but no entries parsed. Preview: ${preview}`);
        }
        break; // don't try http if https worked
      } catch (e) {
        // skip
      }
    }
  }
  return null;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN\n' : '✏️  FIX MODE\n');

  // ── 1. Fetch May 26 (current, broken) and May 27 (has 2Kings Ch2) from Supabase
  console.log('Fetching May 26 and May 27 from Supabase...');
  const [[row26], [row27]] = await Promise.all([
    supabaseGet(`verses?select=date,ot_title,ot_audio,ot_audio_zh&date=eq.${TARGET_DATE}`),
    supabaseGet(`verses?select=date,ot_title,ot_audio,ot_audio_zh&date=eq.${NEXT_DATE}`),
  ]);

  if (!row26 || !row27) { console.error('Could not fetch rows'); process.exit(1); }

  const may26En = JSON.parse(row26.ot_audio || '[]');
  const may26Zh = JSON.parse(row26.ot_audio_zh || '[]');
  const may27En = JSON.parse(row27.ot_audio || '[]');
  const may27Zh = JSON.parse(row27.ot_audio_zh || '[]');

  console.log(`\nMay 26 title: "${row26.ot_title}"`);
  console.log(`May 26 EN (${may26En.length}):`, may26En);
  console.log(`May 26 ZH (${may26Zh.length}):`, may26Zh);
  console.log(`\nMay 27 title: "${row27.ot_title}"`);
  console.log(`May 27 EN (${may27En.length}):`, may27En);
  console.log(`May 27 ZH (${may27Zh.length}):`, may27Zh);

  // We know: May 26 EN[0] = 1Kings Ch22 ✅
  //          May 26 EN[1] = bad URL (1Kings "Ch23") ❌
  //          May 27 EN[0] = 2Kings Ch2 ✅ (reading starts at 2:19)
  //          May 27 ZH[0] = 2Kings Ch2 ZH ✅

  const oneKings22En = may26En[0];
  const oneKings22Zh = may26Zh[0];
  const twoKingsCh2En = may27En[0];
  const twoKingsCh2Zh = may27Zh[0];

  // ── 2. Find 2 Kings Ch 1 by scanning playlists
  const resultEn = await findCh1({}, 'EN');
  const resultZh = await findCh1({ 'Accept-Language': 'zh-CN' }, 'ZH');

  let twoKingsCh1En = null;
  let twoKingsCh1Zh = null;

  if (resultEn && resultEn.entries.length >= 1) {
    twoKingsCh1En = resultEn.entries[0].url;
    console.log(`\n2 Kings Ch.1 EN: ${twoKingsCh1En}`);
  } else {
    console.log('\n❌ Could not find 2 Kings Ch.1 EN from playlist scan.');
    console.log('   The scan above should show what playlists ARE returning.');
    console.log('   Paste this output and we can identify the correct playlist number.');
    process.exit(0);
  }

  if (resultZh && resultZh.entries.length >= 1) {
    twoKingsCh1Zh = resultZh.entries[0].url;
    console.log(`2 Kings Ch.1 ZH: ${twoKingsCh1Zh}`);
  }

  // ── 3. Build corrected arrays
  const newEnAudio = [oneKings22En, twoKingsCh1En, twoKingsCh2En];
  const newZhAudio = (oneKings22Zh && twoKingsCh1Zh && twoKingsCh2Zh)
    ? [oneKings22Zh, twoKingsCh1Zh, twoKingsCh2Zh]
    : null;

  console.log('\n--- Proposed fix ---');
  console.log('New EN:', newEnAudio);
  if (newZhAudio) console.log('New ZH:', newZhAudio);
  else console.log('ZH: could not fix automatically');

  if (DRY_RUN) {
    console.log('\nDry run done. Add --fix to apply.');
    return;
  }

  // ── 4. Apply
  const patch = { ot_audio: JSON.stringify(newEnAudio) };
  if (newZhAudio) patch.ot_audio_zh = JSON.stringify(newZhAudio);

  const result = await supabasePatch(`verses?date=eq.${TARGET_DATE}`, patch);
  if (result.status === 200 || result.status === 204) {
    console.log(`\n✅ Updated ${TARGET_DATE}`);
    console.log('Buttons: 1 King Ch. 22 | 2 King Ch. 1 | 2 King Ch. 2');
  } else {
    console.error('\n❌ Failed:', result.status, result.body);
  }
}

main().catch(console.error);

// diagnoseCheckins.js
// Checks what's actually in Supabase vs what we expect
// Run: node diagnoseCheckins.js

const https = require('https');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';

function supabaseGet(path) {
  return new Promise((resolve, reject) => {
    https.get(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching all checkins from Supabase...\n');

  // Paginate to get ALL records
  let data = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const batch = await supabaseGet(`checkins?select=name,date,portion&order=date.asc&limit=${PAGE_SIZE}&offset=${from}`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    data = data.concat(batch);
    console.log(`  Fetched page ${page+1}: ${batch.length} rows (total so far: ${data.length})`);
    if (batch.length < PAGE_SIZE) break;
    page++;
  }
  console.log(`\nTotal checkin records: ${data.length}`);

  // Show unique portion values
  const portionValues = new Set(data.map(r => r.portion));
  console.log(`\nUnique portion values in DB: ${[...portionValues].join(', ')}`);

  // Show sample records for Simon Wu
  const simonRows = data.filter(r => r.name?.toLowerCase().includes('simon'));
  console.log(`\nSimon Wu records: ${simonRows.length}`);
  console.log('First 5:', simonRows.slice(0, 5));
  console.log('Last 5:', simonRows.slice(-5));

  // Count by portion for Simon
  const simonNT = simonRows.filter(r => r.portion === 'NT').length;
  const simonOT = simonRows.filter(r => r.portion === 'OT').length;
  const simonOther = simonRows.filter(r => r.portion !== 'NT' && r.portion !== 'OT').length;
  console.log(`\nSimon: NT=${simonNT}, OT=${simonOT}, Other=${simonOther}`);

  // Calculate full days (both NT and OT) for Simon
  const simonByDate = {};
  simonRows.forEach(r => {
    if (!simonByDate[r.date]) simonByDate[r.date] = { nt: false, ot: false };
    if (r.portion === 'NT') simonByDate[r.date].nt = true;
    if (r.portion === 'OT') simonByDate[r.date].ot = true;
  });
  const fullDays = Object.values(simonByDate).filter(d => d.nt && d.ot).length;
  const ntOnly   = Object.values(simonByDate).filter(d => d.nt && !d.ot).length;
  const otOnly   = Object.values(simonByDate).filter(d => !d.nt && d.ot).length;
  console.log(`\nSimon by date: ${Object.keys(simonByDate).length} unique dates`);
  console.log(`  Full days (both NT+OT): ${fullDays}`);
  console.log(`  NT only: ${ntOnly}`);
  console.log(`  OT only: ${otOnly}`);

  // Check if any records have null/empty portion
  const nullPortion = data.filter(r => !r.portion);
  console.log(`\nRecords with null/empty portion: ${nullPortion.length}`);
  if (nullPortion.length > 0) console.log('Samples:', nullPortion.slice(0, 3));

  // Show top 10 by total checkins
  const byName = {};
  data.forEach(r => {
    const k = r.name?.toLowerCase().trim() || 'unknown';
    const displayName = r.name?.trim();
    if (!byName[k]) byName[k] = { name: displayName, total: 0, nt: 0, ot: 0, other: 0, dates: new Set() };
    byName[k].total++;
    byName[k].dates.add(r.date);
    if (r.portion === 'NT') byName[k].nt++;
    else if (r.portion === 'OT') byName[k].ot++;
    else byName[k].other++;
  });

  const sorted = Object.values(byName)
    .map(p => ({ ...p, uniqueDates: p.dates.size }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  console.log('\nTop 15 by total checkin records:');
  console.log('Name'.padEnd(25) + 'Total'.padEnd(8) + 'NT'.padEnd(6) + 'OT'.padEnd(6) + 'Other'.padEnd(8) + 'Unique Dates');
  console.log('─'.repeat(70));
  sorted.forEach(p => {
    console.log(
      p.name.padEnd(25) +
      String(p.total).padEnd(8) +
      String(p.nt).padEnd(6) +
      String(p.ot).padEnd(6) +
      String(p.other).padEnd(8) +
      p.uniqueDates
    );
  });

  console.log('\nDone!');
}

main().catch(e => { console.error(e.message); process.exit(1); });
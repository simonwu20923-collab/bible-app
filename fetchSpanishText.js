/**
 * fetchSpanishText.js
 *
 * Scrapes Spanish Bible text from Google Sites and saves to Supabase.
 * Run from C:\Users\simon\bible-app:
 *   npm install @supabase/supabase-js node-fetch cheerio
 *   node fetchSpanishText.js
 *
 * First run adds nt_text_es and ot_text_es columns if they don't exist.
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// The schedule maps week+day → date
// Week 1 Day 1 = Jan 1, 2026 (Sunday)
// We'll generate dates dynamically
function getDateForWeekDay(week, day) {
  // Jan 1, 2026 = week 1, day 1
  const start = new Date('2026-01-01T12:00:00');
  const dayOffset = (week - 1) * 7 + (day - 1);
  const d = new Date(start);
  d.setDate(d.getDate() + dayOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es,en;q=0.9',
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function parseSpanishPage(html) {
  // Google Sites renders content in data-* attributes or as plain text
  // Extract all text content and find NT/OT sections

  // Remove script and style tags
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Convert <br> and </p> to newlines
  html = html.replace(/<br\s*\/?>/gi, '\n');
  html = html.replace(/<\/p>/gi, '\n');
  html = html.replace(/<\/div>/gi, '\n');

  // Strip all remaining tags
  html = html.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  html = html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&Ntilde;/g, 'Ñ')
    .replace(/&uuml;/g, 'ü');

  const lines = html.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // Find NT and OT sections
  // Look for verse patterns like "1:1 text" or "1:2 text"
  let ntLines = [];
  let otLines = [];
  let currentSection = null;

  for (const line of lines) {
    // Detect section headers
    if (/Nuevo Testamento/i.test(line)) {
      currentSection = 'NT';
      continue;
    }
    if (/Antiguo Testamento/i.test(line)) {
      currentSection = 'OT';
      continue;
    }

    // Detect verse lines - pattern: "1:1 text" or "1:1" at start
    const isVerse = /^\d+:\d+\s+\S/.test(line);

    if (isVerse && currentSection === 'NT') ntLines.push(line);
    else if (isVerse && currentSection === 'OT') otLines.push(line);
  }

  return {
    ntText: ntLines.join('\n') || null,
    otText: otLines.join('\n') || null
  };
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🇪🇸 Fetching Spanish Bible text from Google Sites...\n');

  let updated = 0, failed = 0, empty = 0;

  // 52 weeks × 7 days = 364 days + 1 extra day (Dec 31)
  for (let week = 1; week <= 52; week++) {
    for (let day = 1; day <= 7; day++) {
      const totalDay = (week - 1) * 7 + day;
      if (totalDay > 365) break;

      const dateStr = getDateForWeekDay(week, day);
      const url = `https://sites.google.com/view/biblereadingschedule/semana-${week}/week-${week}-day-${day}-s`;

      try {
        const { status, body } = await fetchPage(url);

        if (status !== 200) {
          console.log(`  ⚠ ${dateStr} (W${week}D${day}): HTTP ${status}`);
          failed++;
          await sleep(1000);
          continue;
        }

        const { ntText, otText } = parseSpanishPage(body);

        if (!ntText && !otText) {
          console.log(`  – ${dateStr}: no verse text found`);
          empty++;
        } else {
          const ntCount = ntText ? ntText.split('\n').length : 0;
          const otCount = otText ? otText.split('\n').length : 0;
          console.log(`  ✓ ${dateStr}  NT:${ntCount}v  OT:${otCount}v`);
        }

        // Save to Supabase
        const { error } = await supabase
          .from('verses')
          .update({ nt_text_es: ntText, ot_text_es: otText })
          .eq('date', dateStr);

        if (error) {
          console.error(`    ✗ DB error: ${error.message}`);
          failed++;
        } else {
          updated++;
        }

        // Be polite - wait between requests
        await sleep(800);

      } catch (err) {
        console.error(`  ✗ ${dateStr}: ${err.message}`);
        failed++;
        await sleep(2000);
      }
    }

    // Extra pause between weeks
    await sleep(500);
  }

  console.log('\n✅ Done!');
  console.log(`   Updated : ${updated}`);
  console.log(`   Empty   : ${empty}`);
  console.log(`   Failed  : ${failed}`);
  console.log('\nNext step: add nt_text_es and ot_text_es columns to Supabase if not already there.');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

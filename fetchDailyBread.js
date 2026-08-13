// fetchDailyBread.js — build the `daily_bread` table for every day in schedule.js.
//
//   node fetchDailyBread.js --dry        # parse + report coverage, write nothing
//   node fetchDailyBread.js              # full run, upserts to Supabase
//   node fetchDailyBread.js --no-ls      # skip the twgbr pass (much faster)
//
// Rows are keyed by MM-DD, not a full date, because schedule.js is keyed that
// way and repeats every year.
//
// Two sources, joined on the NEW TESTAMENT reference rather than on a date —
// the same portion falls on a different date in each year, so the reference is
// the only stable key:
//
//   1. The Google Doc "Daily Reading through the Bible in A Year (2024-2026)".
//      Its 2026 entries are mostly blank, so fields merge newest-year-first:
//      2026, else 2025, else 2024, each field resolved independently.
//   2. line.twgbr.org — the Chinese life-study page for the message number the
//      doc names. Fetched once per distinct (book, message).
//
// daybread.org is a gap filler only. The doc itself notes its reading schedule
// differs from this one, and sampling 2021-2026 showed only 15-30% of days line
// up — it is where the doc's compiler got the material, not a source we can
// join to wholesale. On the days it does match it backfills what the doc left
// blank, and it is the only Chinese prose available for this schedule.

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lsvhmvkhernimxmzcyak.supabase.co',
  'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc'
);

const DRY = process.argv.includes('--dry');
const NO_LS = process.argv.includes('--no-ls');
const DOC_ID = '1OHqm0fW8pMxX5mYrgivCj4qPFJzDWC2dwQMpEoi68ks';

// schedule.js is an ES module and this script is CommonJS — read it as text
// rather than dragging a bundler into a once-a-year job.
const schedule = Object.fromEntries(
  [...require('fs').readFileSync(`${__dirname}/src/data/schedule.js`, 'utf8')
    .matchAll(/"(\d\d-\d\d)":\s*\{\s*nt:\s*"([^"]+)",\s*ot:\s*"([^"]+)"/g)]
    .map(m => [m[1], { nt: m[2], ot: m[3] }])
);

// ── Reference normalising ──────────────────────────────────────────────────
// "Matt. 13:1-13:30", "Matthew 13:1 ~ 13:30" and "Mark 4:1-20" must all collapse
// to one key. Book numbers double as the twgbr life-study page ids.
const BOOKS = {
  Genesis:1, Exodus:2, Leviticus:3, Numbers:4, Deuteronomy:5, Joshua:6, Judges:7,
  Ruth:8, '1 Samuel':9, '2 Samuel':10, '1 Kings':11, '2 Kings':12, '1 Chronicles':13,
  '2 Chronicles':14, Ezra:15, Nehemiah:16, Esther:17, Job:18, Psalms:19, Proverbs:20,
  Ecclesiastes:21, 'Song of Songs':22, Isaiah:23, Jeremiah:24, Lamentations:25,
  Ezekiel:26, Daniel:27, Hosea:28, Joel:29, Amos:30, Obadiah:31, Jonah:32, Micah:33,
  Nahum:34, Habakkuk:35, Zephaniah:36, Haggai:37, Zechariah:38, Malachi:39,
  Matthew:40, Mark:41, Luke:42, John:43, Acts:44, Romans:45, '1 Corinthians':46,
  '2 Corinthians':47, Galatians:48, Ephesians:49, Philippians:50, Colossians:51,
  '1 Thessalonians':52, '2 Thessalonians':53, '1 Timothy':54, '2 Timothy':55,
  Titus:56, Philemon:57, Hebrews:58, James:59, '1 Peter':60, '2 Peter':61,
  '1 John':62, '2 John':63, '3 John':64, Jude:65, Revelation:66,
};
const ALIASES = {
  Matt:'Matthew', Mk:'Mark', Lk:'Luke', Jn:'John', Rom:'Romans',
  '1 Cor':'1 Corinthians', '2 Cor':'2 Corinthians', Gal:'Galatians', Eph:'Ephesians',
  Phil:'Philippians', Col:'Colossians', '1 Thess':'1 Thessalonians',
  '2 Thess':'2 Thessalonians', '1 Thes':'1 Thessalonians', '2 Thes':'2 Thessalonians',
  '1 Tim':'1 Timothy', '2 Tim':'2 Timothy',
  Philem:'Philemon', Heb:'Hebrews', Jas:'James', '1 Pet':'1 Peter', '2 Pet':'2 Peter',
  '1 Jn':'1 John', '2 Jn':'2 John', '3 Jn':'3 John', Rev:'Revelation',
  Gen:'Genesis', Ex:'Exodus', Exo:'Exodus', Lev:'Leviticus', Num:'Numbers',
  Deut:'Deuteronomy', Josh:'Joshua', Judg:'Judges', Psa:'Psalms', Ps:'Psalms',
  Prov:'Proverbs', Eccl:'Ecclesiastes', Isa:'Isaiah', Jer:'Jeremiah',
  Lam:'Lamentations', Ezek:'Ezekiel', Dan:'Daniel',
  '1 Sam':'1 Samuel', '2 Sam':'2 Samuel', '1 Kgs':'1 Kings', '2 Kgs':'2 Kings',
  '1 Chron':'1 Chronicles', '2 Chron':'2 Chronicles',
  '1 Chr':'1 Chronicles', '2 Chr':'2 Chronicles',
  Neh:'Nehemiah', Esth:'Esther', Hos:'Hosea', Obad:'Obadiah', Mic:'Micah',
  Nah:'Nahum', Hab:'Habakkuk', Zeph:'Zephaniah', Hag:'Haggai',
  Zech:'Zechariah', Mal:'Malachi', Song:'Song of Songs',
};
const fullBook = raw => {
  const n = raw.replace(/[_\s]+/g, ' ').replace(/\.$/, '').trim()
    .replace(/^([1-3])(?=[A-Za-z])/, '$1 ')   // lsmradio slugs: "1Corinthians"
    .replace(/^Songofsongs$/i, 'Song of Songs');
  return ALIASES[n] || n;
};

// lsmradio uses two path shapes: /audio/mp3-files/Book/ and /audio/stm-mp3/Book/.
const audioBook = url => (url || '').match(/(?:mp3-files|stm-mp3)\/([^/]+)\//);

// Chapter*1000+verse, so two ranges can be intersected numerically. daybread
// splits the NT at different verses than this schedule does, so we match on
// how much two portions overlap rather than on them being identical.
function span(ref) {
  const k = refKey(ref);
  if (!k) return null;
  const m = k.match(/^(.+) (\d+):(\d+)-(\d+):(\d+)$/);
  return m && {
    book: m[1],
    from: +m[2] * 1000 + +m[3],
    to: +m[4] * 1000 + +m[5],
  };
}

// Length of the shared range, or -1 when they do not touch / differ in book.
function overlap(a, b) {
  if (!a || !b || a.book !== b.book) return -1;
  return Math.min(a.to, b.to) - Math.max(a.from, b.from);
}

function refKey(ref) {
  if (!ref) return null;
  const m = ref.replace(/ /g, ' ').trim()
    .match(/^([1-3]?[\s_]?[A-Za-z]+)\.?\s*(\d+):(\d+)\s*[~\-–]\s*(?:[A-Za-z]+\.?\s*)?(?:(\d+):)?(\d+)/);
  if (!m) return null;
  return `${fullBook(m[1])} ${m[2]}:${m[3]}-${m[4] || m[2]}:${m[5]}`;
}

// ── 1. The Google Doc ──────────────────────────────────────────────────────
const DOC_COLS = ['topic', 'key_verse', 'emphasis', 'musing', 'prayer',
                  'hymn_title', 'hymn_url', 'ls_msg', 'ls_url', 'ls_audio'];

async function loadDoc() {
  const res = await fetch(`https://docs.google.com/document/d/${DOC_ID}/export?format=txt`);
  if (!res.ok) throw new Error(`doc export failed: ${res.status}`);
  const txt = (await res.text()).replace(/\r/g, '');

  // Entries are delimited by their "(MM/DD/YYYY) Daily Reading" heading.
  const parts = txt.split(/\((\d\d)\/(\d\d)\/(\d{4})\)\s*Daily Reading/);
  const entries = [];
  for (let i = 1; i < parts.length; i += 4) {
    const [mm, dd, yyyy, body] = [parts[i], parts[i + 1], parts[i + 2], parts[i + 3]];
    // A field runs to the next blank line; both ASCII and fullwidth colons appear.
    const f = label => {
      const m = body.match(new RegExp(label + '\\s*[:：]([\\s\\S]*?)(?=\\n\\s*\\n|$)'));
      return m ? m[1].replace(/\s+/g, ' ').trim() : '';
    };
    const nt = (body.match(/New Testament\s*[-–—]\s*([^\n(]+)/) || [])[1] || '';
    const hymn = f('Hymn');
    const lsLine = (body.match(/Life-study (?:Message|Reading)\s*\d*\s*[:：][^\n]*/) || [])[0] || '';
    entries.push({
      date: `${yyyy}-${mm}-${dd}`, year: +yyyy, ntKey: refKey(nt),
      topic: f('Topic'), key_verse: f('Key Verse'), emphasis: f('Emphasis'),
      musing: f('Musing'), prayer: f('Prayer'),
      hymn_title: hymn.replace(/\(?<?https?:\/\/\S+>?\)?/g, '').trim() || null,
      hymn_url: (hymn.match(/https?:\/\/[^\s()<>]+/) || [])[0] || null,
      ls_msg: (lsLine.match(/(\d+)/) || [])[1] || null,
      ls_url: (lsLine.match(/https?:\/\/[^\s()<>]+/) || [])[0] || null,
      ls_audio: (body.match(/Life-study Broadcast\s*[:：]\s*<?(https?:\/\/[^\s()<>]+?)>?\s*(?:\n|$)/) || [])[1] || null,
    });
  }

  // Merge field by field, newest year first — 2026 wins where it is filled in.
  const byRef = {};
  entries.filter(e => e.ntKey).sort((a, b) => b.year - a.year).forEach(e => {
    const cur = byRef[e.ntKey] || (byRef[e.ntKey] = {});
    DOC_COLS.forEach(c => { if (!cur[c] && e[c]) cur[c] = e[c]; });
  });
  console.log(`doc: ${entries.length} entries → ${Object.keys(byRef).length} distinct portions`);
  return byRef;
}

// Small pool — this is a volunteer-run church site, not a CDN.
async function pooled(items, worker, limit = 5) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const n = i++;
      try { out[n] = await worker(items[n]); } catch (e) { out[n] = null; }
    }
  }));
  return out;
}

// ── 2. daybread.org (gap filler) ───────────────────────────────────────────
// A different reading plan, so only ~117 of our 364 days have a matching
// portion. Those days are worth having: they are the only Chinese prose that
// exists for this schedule, and they backfill the days the doc left blank.
const PATHS = { en: '-en', zh: '', sc: '-zh' };   // yes, "-zh" is the simplified one
const FIELDS = {
  'Verses':'verses_ref',   '讀經':'verses_ref', '读经':'verses_ref',
  // daybread spells the key verse both ways depending on the year.
  'Key Verse':'key_verse', '要節':'key_verse',  '要节':'key_verse',
                           '鑰節':'key_verse',  '钥节':'key_verse',
  'Topic':'topic',         '主題':'topic',      '主题':'topic',
  'Emphasis':'emphasis',   '重點':'emphasis',   '重点':'emphasis',
  'Meditate':'musing',     '默想':'musing',
  'Prayer':'prayer',       '禱告':'prayer',     '祷告':'prayer',
  'Hymn':'hymn',           '詩歌':'hymn',       '诗歌':'hymn',
};

const decode = s => s
  .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
  // A field can be sliced mid-tag, leaving a dangling '<div class="' in the text.
  .replace(/<[^>]*$/, '')
  .replace(/&#8217;|&rsquo;/g, '’').replace(/&#8216;|&lsquo;/g, '‘')
  .replace(/&#8220;|&ldquo;/g, '“').replace(/&#8221;|&rdquo;/g, '”')
  .replace(/&#8211;|&ndash;/g, '–').replace(/&#8212;|&mdash;/g, '—')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
  .replace(/[ \t]+/g, ' ').trim();

function parseDaybread(html) {
  const article = html.slice(html.indexOf('<article'), html.indexOf('pvc_clear'));
  if (!article) return null;
  const row = {};
  const marks = [...article.matchAll(/<strong>([^<]{1,20})：<\/strong>/g)];
  marks.forEach((m, i) => {
    const col = FIELDS[m[1].trim()];
    if (!col) return;
    const body = article.slice(m.index + m[0].length, marks[i + 1]?.index ?? article.length);
    if (col === 'hymn') {
      const a = body.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/);
      // Some days inline the whole hymn text rather than linking hymnal.net.
      // The title is only ever the first line; everything after it is lyrics,
      // which we keep so those days still get an expandable text section.
      const lines = decode(body).split('\n').map(s => s.trim()).filter(Boolean);
      row.hymn_title = (a ? decode(a[2]).split('\n').map(s => s.trim()).find(Boolean) : lines[0])
        || null;
      row.hymn_url = a ? a[1] : null;
      // Drop only the first occurrence — a chorus may repeat the title line.
      const at = lines.indexOf(row.hymn_title);
      const rest = at >= 0 ? [...lines.slice(0, at), ...lines.slice(at + 1)] : lines;
      row.hymn_inline_text = rest.length ? rest.join('\n') : null;
      // Either an mp3 the site hosts or an embedded YouTube video.
      row.hymn_audio = (body.match(/<source[^>]+src=["']([^"'?]+)/) ||
                        body.match(/<iframe[^>]+src=["']([^"']+)/) || [])[1] || null;
    } else {
      row[col] = decode(body) || null;
    }
  });
  return row.topic ? row : null;
}

// daybread splits the NT at different verses than this schedule does, so an
// exact reference match only ever hits ~117 of 364 days. Scraping more years
// does not help — every year from 2020-2026 uses the identical set of portions
// and merely shifts which date each lands on. So we match on overlap: for each
// of our days, take the daybread portion sharing the most verses with it.
//
// The Chinese pages state their reference in Chinese, which we cannot key on,
// so the English pass tells us which day index holds which portion, and we then
// pull the Chinese pages for just the indices we chose.
async function loadDaybread(year, days) {
  const idx = [...Array(366).keys()];
  const en = await pooled(idx, async day => {
    const res = await fetch(`https://daybread.org/ciw/y${year}${PATHS.en}/m${day}`);
    if (!res.ok) return null;
    const row = parseDaybread(await res.text());
    return row ? { span: span(row.verses_ref), row } : null;
  });
  console.log(`daybread ${year}: ${en.filter(Boolean).length} portions parsed`);

  // md -> day index, choosing the best-overlapping portion.
  const chosen = {};
  let exact = 0, covSum = 0;
  for (const d of days) {
    let best = -1, bestOv = -1;
    idx.forEach(i => {
      const ov = overlap(en[i]?.span, d.span);
      if (ov > bestOv) { bestOv = ov; best = i; }
    });
    if (bestOv < 0) continue;                       // no candidate in that book
    chosen[d.md] = best;
    const s = en[best].span;
    if (s.from === d.span.from && s.to === d.span.to) exact++;
    covSum += bestOv / ((d.span.to - d.span.from) || 1);
  }
  const n = Object.keys(chosen).length;
  console.log(`daybread: matched ${n}/${days.length} days ` +
              `(${exact} exact, mean coverage ${Math.round(covSum / n * 100)}%)`);

  const need = [...new Set(Object.values(chosen))];
  const out = { en: {}, zh: {}, sc: {} };
  for (const lang of ['en', 'zh', 'sc']) {
    const rows = lang === 'en'
      ? need.map(i => en[i].row)
      : await pooled(need, async day => {
          const res = await fetch(`https://daybread.org/ciw/y${year}${PATHS[lang]}/m${day}`);
          return res.ok ? parseDaybread(await res.text()) : null;
        });
    const byIdx = Object.fromEntries(need.map((i, k) => [i, rows[k]]));
    for (const [md, i] of Object.entries(chosen)) if (byIdx[i]) out[lang][md] = byIdx[i];
    console.log(`daybread ${lang}: ${Object.keys(out[lang]).length} days`);
  }
  return out;
}

// ── Traditional → Simplified ───────────────────────────────────────────────
// daybread publishes most days in both scripts, and the two are the same text,
// so aligning them character by character yields a conversion table for free.
// Only pairs of equal length are used — T→S is overwhelmingly 1:1, and a length
// mismatch means the two pages differ in some other way and cannot be aligned.
const T2S_FIELDS = ['topic', 'key_verse', 'emphasis', 'musing', 'prayer',
                    'hymn_title', 'hymn_inline_text'];

const isCJK = c => c >= '一' && c <= '鿿';

function buildT2S(db) {
  // Equal length alone is not enough: two unrelated strings of the same length
  // align into nonsense (an earlier version learned 像→0 and 父→們, which then
  // corrupted the output). Only accept pairs that are clearly the same text,
  // then take a majority vote per character.
  const votes = new Map();
  let usedPairs = 0, rejectedPairs = 0;
  for (const md of Object.keys(db.zh)) {
    const t = db.zh[md], s = db.sc[md];
    if (!s) continue;
    for (const f of T2S_FIELDS) {
      const a = t[f], b = s[f];
      if (!a || !b || a.length !== b.length || a.length < 4) continue;
      let diff = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
      // Traditional and Simplified of the same text differ in a minority of
      // characters. A third or more means these are not the same sentence.
      if (diff / a.length > 0.34) { rejectedPairs++; continue; }
      usedPairs++;
      for (let i = 0; i < a.length; i++) {
        if (a[i] === b[i] || !isCJK(a[i]) || !isCJK(b[i])) continue;
        const m = votes.get(a[i]) || (votes.set(a[i], new Map()), votes.get(a[i]));
        m.set(b[i], (m.get(b[i]) || 0) + 1);
      }
    }
  }

  // How often each character appears in Simplified text unchanged. A character
  // that routinely survives into Simplified is script-invariant, so any
  // "substitution" learned for it is alignment noise — this is what produced
  // 十→七, silently rewriting 第二十二篇 as 第二七二篇.
  const seenInS = new Map();
  for (const md of Object.keys(db.sc)) {
    for (const f of T2S_FIELDS) {
      for (const ch of (db.sc[md][f] || '')) {
        if (isCJK(ch)) seenInS.set(ch, (seenInS.get(ch) || 0) + 1);
      }
    }
  }

  // These numerals are identical in both scripts and carry meaning (message
  // numbers, verse references), so must never be rewritten. Note 萬→万 and
  // 兩→两 DO differ between scripts and are deliberately not listed.
  const NEVER = new Set('一二三四五六七八九十百千零');

  const map = new Map();
  let ambiguous = 0, invariant = 0;
  for (const [from, tally] of votes) {
    const total = [...tally.values()].reduce((x, y) => x + y, 0);
    const [to, n] = [...tally].sort((x, y) => y[1] - x[1])[0];
    if (NEVER.has(from)) { invariant++; continue; }
    // If it shows up in Simplified text more often than it is substituted,
    // it does not actually need substituting.
    if ((seenInS.get(from) || 0) > n) { invariant++; continue; }
    // Needs corroboration and near-unanimity, or it is alignment noise.
    if (n >= 2 && n / total >= 0.8) map.set(from, to); else ambiguous++;
  }

  // Two-sided check. Testing only "these must change" let 十→七 through, which
  // rewrote 第二十二篇 as 第二七二篇 — so also assert what must NOT change.
  const known = { '們':'们', '這':'这', '說':'说', '對':'对', '開':'开',
                  '學':'学', '樂':'乐', '見':'见', '與':'与', '經':'经' };
  // 節→节, 萬→万 and 兩→两 are real substitutions and are NOT listed here.
  const mustNotChange = [...'一二三四五六七八九十百千零篇章第年月日天人神主'];

  const wrong = Object.entries(known)
    .filter(([k, v]) => map.has(k) && map.get(k) !== v)
    .map(([k, v]) => `${k}→${map.get(k)} (expected ${v})`);
  const changed = mustNotChange
    .filter(c => map.has(c))
    .map(c => `${c}→${map.get(c)} (must not change)`);

  const covered = Object.keys(known).filter(k => map.has(k)).length;
  console.log(`t2s: ${usedPairs} aligned pairs (${rejectedPairs} rejected), ` +
              `${map.size} substitutions, ${ambiguous} ambiguous, ${invariant} invariant; ` +
              `spot-check ${covered}/${Object.keys(known).length} known, ` +
              `${wrong.length + changed.length} wrong`);
  if (wrong.length || changed.length) {
    console.error('t2s: REFUSING to convert — table is wrong: ' +
                  [...wrong, ...changed].join(', '));
    return new Map();          // safer to show Traditional than corrupted text
  }
  return map;
}

const toSimplified = (str, map) =>
  typeof str === 'string' ? [...str].map(c => map.get(c) || c).join('') : str;

// ── 2b. lsmradio programs (fills the life-study gaps) ──────────────────────
// Every NT life-study message, with the scripture it covers. The doc only names
// a message on ~76% of days; for the rest we pick the message whose scripture
// overlaps that day's NT portion, breaking ties on how well its title matches
// the day's topic. Combined volumes ("1 & 2 Thessalonians") still name the
// individual book and its own message number, which is what twgbr expects.
const LSM_NT = ['matthew','mark','luke','john','acts','romans','1corinthians',
  '2corinthians','galatians','ephesians','philippians','colossians','thessalonians',
  'timothy-titus-philemon','hebrews','james','peter-jude','123john','revelation'];
// The OT pages are scraped too, but only to identify the messages the doc
// already names. Combined volumes ("1 & 2 Samuel") publish under a single
// /Samuel/ audio folder, so the URL alone cannot say which book a message
// belongs to — but these pages state it, and the audio url joins them.
const LSM_OT = ['genesis','exodus','leviticus','numbers','deuteronomy',
  'joshua-judges-ruth','samuel','kings','chronicles','ezra-nehemiah-esther','job',
  'psalms','proverbs-ecclesiastes-songofsongs','isaiah','jeremiah-lamentations',
  'ezekiel','daniel','minor-prophets','zechariah'];

// lsmradio writes references loosely — "1 Thes. 1:1-3", "Matt. 1:17", "Rom. 9",
// "Matt. 13:1-58". The book always comes from the "Life-study of X" label rather
// than the reference, because the two use different abbreviations ("1 Thes."
// vs "1 Thess.") and only the label is guaranteed to name one book.
function scriptureSpan(scripture, book) {
  // Strip the leading book name. It must be matched explicitly rather than as
  // "everything before the first digit" — numbered books start WITH a digit,
  // so "1 Cor. 1:1-9" would otherwise read as chapter 1 of the whole book.
  const body = (scripture || '').replace(/ /g, ' ')
    .replace(/^\s*(?:[1-3]\s*)?[A-Za-z][A-Za-z]*\.?\s*/, '').trim();

  // "19:23-30; 20:1-16" is one message covering both — union the segments.
  const seg = part => {
    let m;
    if ((m = part.match(/^(\d+):(\d+)\s*[-–—]\s*(\d+):(\d+)/)))     // 1:1-2:5
      return [+m[1] * 1000 + +m[2], +m[3] * 1000 + +m[4]];
    if ((m = part.match(/^(\d+):(\d+)\s*[-–—]\s*(\d+)/)))           // 13:1-58
      return [+m[1] * 1000 + +m[2], +m[1] * 1000 + +m[3]];
    if ((m = part.match(/^(\d+):(\d+)/)))                           // 1:17
      return [+m[1] * 1000 + +m[2], +m[1] * 1000 + +m[2]];
    if ((m = part.match(/^(\d+)\s*[-–—]\s*(\d+)/)))                 // 16-17
      return [+m[1] * 1000, +m[2] * 1000 + 999];
    if ((m = part.match(/^(\d+)/)))                                 // 9
      return [+m[1] * 1000, +m[1] * 1000 + 999];
    return null;
  };

  const parts = body.split(/[;,]/).map(s => seg(s.trim())).filter(Boolean);
  if (!parts.length) return null;
  return {
    book,
    from: Math.min(...parts.map(p => p[0])),
    to: Math.max(...parts.map(p => p[1])),
  };
}

async function loadPrograms(slugs) {
  const pages = await pooled(slugs, async slug => {
    const res = await fetch(`https://www.lsmradio.com/programs/${slug}`,
      { headers: { 'user-agent': 'Mozilla/5.0' } });
    return res.ok ? await res.text() : null;
  }, 4);

  const out = [];
  pages.forEach((html, pi) => {
    if (!html) return;
    let idx = 0;
    for (const blk of html.split('accordion-navigation').slice(1)) {
      idx++;   // 1-based position on the page = the "program" number
      const title = decode((blk.match(/<strong>Title:<\/strong>([^<]*)/) || [])[1] || '');
      const scripture = decode((blk.match(/<strong>Scripture:<\/strong>([^<]*)/) || [])[1] || '');
      const ls = blk.match(/<em>Life-study of ([^<:]+):<\/em>\s*<\/a>\s*Message\s*(\d+)/);
      if (!ls || !scripture) continue;
      const dl = (blk.match(/href="(https:\/\/www\.lsmradio\.com\/audio\/mp3-files\/[^"]+\.mp3)"/) || [])[1];
      const mb = (blk.match(/href="(https:\/\/www\.ministrybooks\.org\/books\/[^"]+)"/) || [])[1];
      // Most pages name one book ("Life-study of 1 Thessalonians"), but some
      // keep the combined title ("1 & 2 Kings") and some just say "varied".
      // twgbr needs a single book, so whenever the label is not itself a book,
      // fall back to the book the scripture names.
      const label = ls[1].replace(/^(First|Second|Third)\s+/i,
        m => ({ first: '1 ', second: '2 ', third: '3 ' })[m.trim().toLowerCase()]).trim();
      const fromScripture = (scripture.match(/^\s*((?:[1-3]\s*)?[A-Za-z]+)\.?/) || [])[1];
      const book = BOOKS[fullBook(label)] ? fullBook(label)
        : (fromScripture ? fullBook(fromScripture) : fullBook(label));
      out.push({
        book, msg: ls[2], title, scripture, slug: slugs[pi], idx,
        span: scriptureSpan(scripture, book),
        audio: dl || null, url: mb ? mb.replace(/&amp;/g, '&') : null,
      });
    }
  });
  // twgbr numbers messages per book. lsmradio mostly does too, but its combined
  // volumes (the minor prophets especially) number continuously across the
  // whole volume — "Life-study of Obadiah: Message 20", though Obadiah is one
  // chapter and has no 20th message. Detect that by whether a book's messages
  // start at 1; if not, the label's number is a volume offset and the position
  // within the book is what twgbr wants.
  // A few messages in combined volumes give their scripture as the literal word
  // "varied" — they span both books, so neither the label nor the reference
  // names one. These volumes run through the first book then the second, so
  // inherit the book from the nearest earlier message on the same page.
  let inferred = 0;
  const pages_ = {};
  out.forEach(p => (pages_[p.slug] ||= []).push(p));
  Object.values(pages_).forEach(g => {
    g.sort((a, b) => a.idx - b.idx);
    let last = null;
    g.forEach(p => {
      if (BOOKS[p.book]) { last = p.book; return; }
      if (last) { p.book = last; p.bookInferred = true; inferred++; }
    });
    // Anything before the first identifiable book borrows from after it.
    const first = g.find(p => BOOKS[p.book] && !p.bookInferred);
    if (first) g.forEach(p => {
      if (!BOOKS[p.book]) { p.book = first.book; p.bookInferred = true; inferred++; }
    });
  });
  if (inferred) console.log(`lsmradio: ${inferred} messages had scripture "varied"; book inherited from the previous message`);

  let renumbered = 0;
  const groups = {};
  out.forEach(p => (groups[`${p.slug}|${p.book}`] ||= []).push(p));
  Object.values(groups).forEach(g => {
    g.sort((a, b) => a.idx - b.idx);
    const perBook = g.some(p => +p.msg === 1);
    g.forEach((p, i) => {
      p.cnMsg = perBook ? p.msg : String(i + 1);
      if (p.cnMsg !== p.msg) renumbered++;
    });
  });
  console.log(`lsmradio: ${out.length} messages, ${out.filter(p => p.span).length} with a parseable ` +
              `scripture, ${renumbered} renumbered per book for twgbr`);
  return out;
}

// Eight days had no life-study message whose scripture touches the reading, so
// the automatic pick was only "nearest message in the same book". Simon
// reviewed all eight; these five are his corrections, identified by the radio
// program number on the book's lsmradio page. The other three (01-09, 01-14,
// 05-31, 12-26) he approved as chosen.
const LS_OVERRIDES = {
  '05-23': { slug: 'kings', program: 9 },                    // Life-study of Kings, msg 11
  '10-19': { slug: 'jeremiah-lamentations', program: 10 },   // Life-study of Jeremiah, msg 9
  '11-17': { slug: 'james', program: 3 },                    // Life-study of James, msg 3
  '11-18': { slug: 'james', program: 4 },                    // Life-study of James, msg 4
};

// Word overlap between a message title and the day's topic, 0..1.
function titleAffinity(a, b) {
  const words = s => new Set((s || '').toLowerCase().match(/[a-z]{4,}/g) || []);
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  let hit = 0;
  A.forEach(w => { if (B.has(w)) hit++; });
  return hit / Math.min(A.size, B.size);
}

// ── 2c. hymnal.net lyrics + audio ──────────────────────────────────────────
function parseHymn(html) {
  const art = html.match(/<article[^>]*class="[^"]*js-stanzas[^"]*"[^>]*>([\s\S]*?)<\/article>/);
  const verses = [];
  if (art) {
    for (const m of art[1].matchAll(/<div[^>]+data-type="[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]+data-type=|$)/g)) {
      const num = (m[1].match(/verse-num[^>]*>\s*<span>([^<]*)</) || [])[1] || '';
      const body = (m[1].match(/text-container[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '';
      const lines = decode(body).split('\n').map(s => s.trim()).filter(Boolean);
      if (lines.length) verses.push((num ? num + '. ' : '') + lines.join('\n'));
    }
  }
  return {
    text: verses.join('\n\n') || null,
    mp3: (html.match(/https?:\/\/[^"'<> ]*\/mp3\/[^"'<> ]*\.mp3/) || [])[0] || null,
  };
}

async function loadHymns(urls) {
  const list = [...urls].filter(u => /hymnal\.net/.test(u));
  const out = {};
  await pooled(list, async url => {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
    if (!res.ok) return;
    const h = parseHymn(await res.text());
    if (h.text || h.mp3) out[url] = h;
  });
  console.log(`hymnal.net: ${Object.keys(out).length}/${list.length} hymns fetched`);
  return out;
}

// ── 3. twgbr Chinese life-study ────────────────────────────────────────────
// The doc names a message number and a broadcast url whose path holds the book
// ("/mp3-files/Romans/Rom_11.mp3"). Book + number is enough to reach twgbr.
async function loadTwgbr(pairs) {
  const out = {};
  await pooled([...pairs], async pair => {
    const [book, msg] = pair.split('|');
    const num = BOOKS[book];
    if (!num) return;
    const url = `https://line.twgbr.org/life-study/${num}${msg === '1' ? '' : '_' + msg}.html`;
    const res = await fetch(url);
    if (!res.ok) return;
    const html = await res.text();
    const title = ((html.match(/<h3[^>]*>([^<]+)/) || [])[1] || '').trim();
    // twgbr's message title omits the book, so "第一篇　介言" is the title of
    // message 1 in every book. Prefix the book heading ("彼得前書生命讀經") or
    // nine different days all read as the same message.
    let heading = ((html.match(/<h1[^>]*>([^<]+)<\/h1>/) || [])[1] || '').trim();
    // Some volumes share one heading across both books (11 and 12 are both
    // 列王紀生命讀經), so message 1 of each would read identically. Mark which
    // half it is when the heading does not already say.
    const half = /^([1-3]) /.exec(book);
    if (heading && half && !/[上中下前後]/.test(heading)) {
      heading += `（${['上', '中', '下'][+half[1] - 1]}）`;
    }
    const mp3 = (html.match(/https:\/\/line\.twgbr\.org\/life-study\/mp3\/[a-z]+\/[^"]+\.mp3/) || [])[0];
    if (title) out[pair] = { title: heading ? `${heading}　${title}` : title, url, mp3: mp3 || null };
  });
  console.log(`twgbr: ${Object.keys(out).length}/${pairs.size} messages resolved`);
  return out;
}

// ── Assemble ───────────────────────────────────────────────────────────────
async function main() {
  const days = Object.entries(schedule)
    .map(([md, r]) => ({ md, nt: r.nt, key: refKey(r.nt), span: span(r.nt) }))
    .filter(d => d.key);          // 12-31 is "Rest" — no portion, no devotional
  console.log(`schedule: ${days.length} days`);

  const doc = await loadDoc();
  const db = await loadDaybread(2026, days);
  const t2s = buildT2S(db);

  // Life-study per day: the doc where it names one, otherwise the lsmradio NT
  // message whose scripture best covers the day's portion.
  const all = NO_LS ? [] : await loadPrograms([...LSM_NT, ...LSM_OT]);
  const programs = all.filter(p => p.span && BOOKS[p.book] >= 40);   // NT only, for filling
  // The doc's broadcast url is an lsmradio url, so it joins straight back to
  // the message — which names the book a /Samuel/-style folder cannot.
  const byAudio = {};
  all.forEach(p => { if (p.audio) byAudio[p.audio.replace(/^http:/, 'https:')] = p; });

  const ls = {};
  let fromDoc = 0, fromLsm = 0, viaAudio = 0, overridden = 0;
  for (const d of days) {
    const e = doc[d.key] || {};
    const ov = LS_OVERRIDES[d.md];
    if (ov) {
      const p = all.find(x => x.slug === ov.slug && x.idx === ov.program);
      if (p) {
        ls[d.md] = { book: p.book, msg: p.msg, cnMsg: p.cnMsg, url: p.url, audio: p.audio,
                     label: `Message ${p.msg} — Life-study of ${p.book}` };
        overridden++;
        continue;
      }
      console.warn(`override for ${d.md} (${ov.slug} #${ov.program}) did not resolve`);
    }
    if (e.ls_msg) {
      const hit = e.ls_audio && byAudio[e.ls_audio.replace(/^http:/, 'https:')];
      if (hit) viaAudio++;
      const book = hit ? hit.book
        : fullBook(decodeURIComponent((audioBook(e.ls_audio) || [])[1] || ''));
      const msg = hit ? hit.msg : e.ls_msg;
      const cnMsg = hit ? hit.cnMsg : e.ls_msg;
      ls[d.md] = { book, msg, cnMsg, url: e.ls_url, audio: e.ls_audio,
                   label: `Message ${msg}${book ? ` — Life-study of ${book}` : ''}` };
      fromDoc++;
      continue;
    }
    let best = null, bestScore = -Infinity;
    for (const p of programs) {
      if (p.span.book !== d.span.book) continue;
      const ov = overlap(p.span, d.span);
      // Overlap dominates; the title/topic match only separates near-equals.
      // A handful of portions no message covers (Matt. 8:1-17, Rev. 18) fall
      // back to the nearest message in the same book rather than nothing.
      const gap = Math.max(d.span.from - p.span.to, p.span.from - d.span.to, 0);
      const score = (ov >= 0 ? ov : -1e6 - gap)
                  + titleAffinity(p.title, (doc[d.key] || {}).topic) * 500;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    if (!best) continue;
    ls[d.md] = { book: best.book, msg: best.msg, cnMsg: best.cnMsg, url: best.url, audio: best.audio,
                 label: `Message ${best.msg} — Life-study of ${best.book}`,
                 // No message's scripture touches this portion; this is the
                 // nearest one in the same book, which is a weaker match.
                 approx: bestScore < 0, nt: d.nt, scripture: best.scripture };
    fromLsm++;
  }
  console.log(`life-study: ${fromDoc} from doc (${viaAudio} book resolved via audio url) ` +
              `+ ${fromLsm} from lsmradio + ${overridden} manual ` +
              `= ${fromDoc + fromLsm + overridden}/${days.length}`);

  // ── Make every day's life-study message unique ───────────────────────────
  // The doc deliberately assigns one message across a multi-day stretch (2 Sam
  // msg 33 covers six days), but a reader wants fresh material daily. Keep the
  // doc's choice on the FIRST day of each run and move later days to their next
  // best unused message. Proverbs, Ecclesiastes and Amos do not have enough
  // messages to go round, so those overflow days fall back to an NT message —
  // the same rule already used for filling gaps.
  const used = new Set();
  const bump = [];
  const ntPool = programs.filter(p => p.span);

  // First occurrence of each message keeps it; the rest need reassigning.
  const dupes = [];
  for (const d of days) {
    const cur = ls[d.md];
    if (!cur) continue;
    const key = `${cur.book}|${cur.msg}`;
    if (!used.has(key)) { used.add(key); continue; }
    dupes.push(d);
  }

  // Handle the tightest books first. Assigning in date order lets a roomy book
  // spend messages a scarce book still needs, which is what pushed 25 days out
  // of their own book unnecessarily.
  const supply = {};
  all.forEach(p => (supply[p.book] ||= new Set()).add(p.msg));
  const slack = d => {
    const b = ls[d.md].book;
    const total = supply[b] ? supply[b].size : 0;
    const spent = [...used].filter(k => k.startsWith(b + '|')).length;
    const wanted = dupes.filter(x => ls[x.md].book === b).length;
    return (total - spent) - wanted;
  };
  const order = [...dupes].sort((a, b) => slack(a) - slack(b));

  for (const d of order) {
    const cur = ls[d.md];

    // Same book first, then anything in the NT, always preferring real overlap.
    // Messages whose scripture could not be parsed ("varied" in the combined
    // volumes) are still valid candidates within their own book — excluding
    // them pushed Samuel/Kings/Chronicles days out of their book needlessly.
    const candidates = [...all.filter(p => p.book === cur.book), ...ntPool];
    let best = null, bestScore = -Infinity;
    for (const p of candidates) {
      if (used.has(`${p.book}|${p.msg}`)) continue;
      const sameBook = p.book === cur.book ? 1e7 : 0;
      let fit;
      if (!p.span) fit = -1e5;                       // usable, just unrankable
      else {
        const ov = overlap(p.span, d.span);
        fit = ov >= 0 ? ov
            : -1e4 - Math.max(d.span.from - p.span.to, p.span.from - d.span.to, 0);
      }
      const score = sameBook + fit
                  + titleAffinity(p.title, (doc[d.key] || {}).topic) * 500;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    if (!best) continue;                       // nothing left anywhere: keep it
    bump.push(`${d.md} ${cur.label} -> Message ${best.msg} — Life-study of ${best.book}` +
              (best.book === cur.book ? '' : '  [different book]'));
    ls[d.md] = { book: best.book, msg: best.msg, cnMsg: best.cnMsg, url: best.url,
                 audio: best.audio, approx: cur.approx, nt: d.nt, scripture: best.scripture,
                 label: `Message ${best.msg} — Life-study of ${best.book}` };
    used.add(`${best.book}|${best.msg}`);
  }
  const crossBook = bump.filter(b => b.includes('[different book]')).length;
  console.log(`\ndeduped ${bump.length} days onto unused messages ` +
              `(${crossBook} had to leave their own book)`);
  bump.filter(b => b.includes('[different book]')).forEach(b => console.log('   ' + b));

  const pairs = new Set();
  Object.values(ls).forEach(x => { if (BOOKS[x.book]) pairs.add(`${x.book}|${x.cnMsg || x.msg}`); });
  const twgbr = pairs.size ? await loadTwgbr(pairs) : {};

  const hymns = await loadHymns(new Set([
    ...days.map(d => (doc[d.key] || {}).hymn_url),
    ...['en', 'zh', 'sc'].flatMap(l => days.map(d => (db[l][d.md] || {}).hymn_url)),
  ].filter(Boolean)));

  const rows = [];
  for (const d of days) {
    const e = doc[d.key] || {};
    const mine = ls[d.md];
    const cn = mine && twgbr[`${mine.book}|${mine.cnMsg || mine.msg}`];

    for (const lang of ['en', 'zh', 'sc']) {
      // English prefers the doc — it is the curated version — and falls back to
      // daybread for the days the doc left blank. Chinese has no doc at all, so
      // it is daybread or nothing.
      const en = lang === 'en';
      // Simplified pages are missing on some days daybread publishes in
      // Traditional. Fall back field by field, converting the borrowed text
      // rather than showing Traditional characters to a Simplified reader.
      let b;
      if (lang === 'sc') {
        const merged = { ...(db.zh[d.md] || {}),
          ...Object.fromEntries(Object.entries(db.sc[d.md] || {})
            .filter(([, v]) => v != null && v !== '')) };
        // Convert the whole row, not just the borrowed Traditional days —
        // daybread's own Simplified pages still carry stray Traditional forms.
        b = Object.fromEntries(Object.entries(merged)
          .map(([k, v]) => [k, T2S_FIELDS.includes(k) ? toSimplified(v, t2s) : v]));
      } else {
        b = db[lang][d.md] || {};
      }
      const pick = (docVal, dbVal) => (en ? docVal || dbVal : dbVal) || null;
      const hymnUrl = pick(e.hymn_url, b.hymn_url);
      const hy = (hymnUrl && hymns[hymnUrl]) || {};
      const row = {
        md: d.md, lang,
        verses_ref: d.nt,
        topic:      pick(e.topic, b.topic),
        key_verse:  pick(e.key_verse, b.key_verse),
        emphasis:   pick(e.emphasis, b.emphasis),
        musing:     pick(e.musing, b.musing),
        prayer:     pick(e.prayer, b.prayer),
        hymn_title: pick(e.hymn_title, b.hymn_title),
        hymn_url:   hymnUrl,
        // hymnal.net's own recording wins; daybread's mp3/YouTube is the fallback.
        hymn_audio: hy.mp3 || (en && e.hymn_url ? null : b.hymn_audio) || null,
        // hymnal.net lyrics when the hymn links there, otherwise whatever
        // daybread printed inline on the page.
        hymn_text:  hy.text || b.hymn_inline_text || null,
        ls_title: null, ls_url: null, ls_audio: null,
      };
      if (en && mine) {
        row.ls_title = mine.label;
        row.ls_url = mine.url;
        row.ls_audio = mine.audio;
      } else if (!en && cn) {
        // twgbr publishes in Traditional; convert for the Simplified rows.
        row.ls_title = lang === 'sc' ? toSimplified(cn.title, t2s) : cn.title;
        row.ls_url = cn.url;
        row.ls_audio = cn.mp3;
      }
      rows.push(row);
    }
  }

  // Nothing covers 1-2 Thessalonians in Chinese, and the doc has a few blanks of
  // its own. Rather than leave holes, carry the previous covered day forward —
  // a repeat beats an empty section. Life-study is left alone; a wrong message
  // reference would be worse than none.
  const CARRY = ['topic', 'key_verse', 'emphasis', 'musing', 'prayer',
                 'hymn_title', 'hymn_url', 'hymn_audio', 'hymn_text'];
  // Per field, not per row: a day can have its own topic but no hymn, and that
  // hymn should still be filled. Wraps around so early days can borrow from the
  // end of the year rather than staying empty.
  const carried = {};
  for (const lang of ['en', 'zh', 'sc']) {
    const mine = rows.filter(r => r.lang === lang);
    carried[lang] = 0;
    for (const c of CARRY) {
      const last = {};
      for (let pass = 0; pass < 2; pass++) {      // second pass fills the head
        for (const r of mine) {
          if (r[c]) { last.v = r[c]; continue; }
          if (last.v === undefined) continue;
          r[c] = last.v;
          if (pass === 0 || c === 'topic') carried[lang]++;
        }
      }
    }
  }
  console.log(`carried-forward field values: ${JSON.stringify(carried)}`);

  // Days needing a human decision, printed so they can be corrected by hand.
  const approx = Object.entries(ls).filter(([, v]) => v.approx).sort();
  console.log(`\n── ${approx.length} days using the nearest message in the book (no scripture overlap):`);
  approx.forEach(([md, v]) => console.log(`   ${md}  reading ${v.nt}  ->  ${v.label} (${v.scripture})`));

  const noCn = rows.filter(r => r.lang === 'zh' && !r.ls_title).map(r => r.md).sort();
  console.log(`\n── ${noCn.length} days with no Chinese life-study:`);
  noCn.forEach(md => {
    const v = ls[md];
    console.log(`   ${md}  ${v ? `${v.label} — no twgbr page for ${v.book} msg ${v.msg}` : 'no message identified'}`);
  });
  console.log('');

  const pct = (n) => `${n} (${Math.round(n / days.length * 100)}%)`;
  for (const lang of ['en', 'zh', 'sc']) {
    const r = rows.filter(x => x.lang === lang);
    console.log(`${lang}: topic ${pct(r.filter(x => x.topic).length)}, ` +
                `prayer ${pct(r.filter(x => x.prayer).length)}, ` +
                `hymn ${pct(r.filter(x => x.hymn_title).length)}, ` +
                `life-study ${pct(r.filter(x => x.ls_title).length)}`);
  }

  if (DRY) { console.log('\n--dry: nothing written'); console.log(rows.find(r => r.md === '08-10')); return; }
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase.from('daily_bread')
      .upsert(rows.slice(i, i + 200), { onConflict: 'md,lang' });
    if (error) { console.error(error); process.exit(1); }
  }
  console.log(`wrote ${rows.length} rows`);
}

main();

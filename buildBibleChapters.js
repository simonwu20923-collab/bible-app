// buildBibleChapters.js
// One-time migration: reads all rows from `verses`, parses verse text,
// and populates the `bible_chapters` table with one row per book+chapter.
//
// Run:
//   node buildBibleChapters.js            -- full migration
//   node buildBibleChapters.js --dry-run  -- preview only (no writes)
//
// Before running, create the table in Supabase SQL editor:
//   See CREATE TABLE statement at the bottom of this file (as a comment)
//
// Uses the anon/publishable key. The table must have RLS disabled or
// have an INSERT policy for the anon role. Alternatively, replace
// SUPABASE_KEY below with your service_role key from Project Settings > API.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';
// If anon key is blocked by RLS, replace with service_role key from:
// Supabase Dashboard → Project Settings → API → service_role

const DRY_RUN = process.argv.includes('--dry-run');
const PAGE_SIZE = 1000;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Abbreviation normalisation (same as Bible.js) ──────────────────────────

const ABBR_TO_ENGLISH = {
  // Traditional Chinese
  '太':'Mt','可':'Mk','路':'Lk','約':'Jn','徒':'Acts',
  '羅':'Rm','林前':'1Co','林後':'2Co','加':'Gal','弗':'Eph',
  '腓':'Phil','西':'Col','帖前':'1Th','帖後':'2Th',
  '提前':'1Ti','提後':'2Ti','多':'Tit','門':'Phm','來':'Heb',
  '雅':'Jas','彼前':'1Pe','彼後':'2Pe',
  '約一':'1Jn','約二':'2Jn','約三':'3Jn','猶':'Jude','啟':'Rev',
  '創':'Gen','出':'Exo','利':'Lev','民':'Num','申':'Deut',
  '書':'Josh','士':'Judg','得':'Ruth',
  '撒上':'1Sam','撒下':'2Sam','王上':'1Kgs','王下':'2Kgs',
  '代上':'1Chr','代下':'2Chr',
  '拉':'Ezra','尼':'Neh','斯':'Esth','伯':'Job',
  '詩':'Ps','箴':'Prov','傳':'Eccl','歌':'Song',
  '賽':'Isa','耶':'Jer','哀':'Lam','結':'Ezek','但':'Dan',
  '何':'Hos','珥':'Joel','摩':'Amos','俄':'Obad',
  '拿':'Jonah','彌':'Mic','鴻':'Nah','哈':'Hab',
  '番':'Zeph','該':'Hag','亞':'Zech','瑪':'Mal',
  // Simplified Chinese differences
  '约':'Jn','罗':'Rm','林后':'2Co','帖后':'2Th',
  '提后':'2Ti','门':'Phm','来':'Heb','彼后':'2Pe',
  '约一':'1Jn','约二':'2Jn','约三':'3Jn','犹':'Jude','启':'Rev',
  '创':'Gen','书':'Josh','诗':'Ps','传':'Eccl',
  '赛':'Isa','结':'Ezek','弥':'Mic','鸿':'Nah',
  '该':'Hag','亚':'Zech','玛':'Mal',
  // Spanish (Recovery Version, strip trailing dot + spaces before lookup)
  'Ro':'Rm','Rom':'Rm','Hch':'Acts',
  'Lc':'Lk',   // Spanish Luke (Lucas)
  'Mc':'Mk',   // Spanish Mark (Marcos)
  'Gal':'Gal','Ef':'Eph','Fil':'Phil','Flm':'Phm','Stg':'Jas',
  'Ap':'Rev',
  'Gen':'Gen','Gn':'Gen','Ex':'Exo',
  'Nu':'Num','Nm':'Num','Dt':'Deut',
  'Jos':'Josh','Jue':'Judg','Rut':'Ruth','Rt':'Ruth',
  '1Re':'1Kgs','2Re':'2Kgs','1Cr':'1Chr','2Cr':'2Chr',
  'Esd':'Ezra','Est':'Esth',
  'Sal':'Ps','Ecl':'Eccl','Cant':'Song','Cnt':'Song',
  'Is':'Isa','Ez':'Ezek',
  'Os':'Hos','Am':'Amos','Abd':'Obad','Jon':'Jonah',
  'Mi':'Mic','Sof':'Zeph','Zac':'Zech',
  'Jd':'Jude',     // English Jude (single-chapter format)
  'Jud':'Jude',    // Spanish Jude (Judas)
  'Cnt':'Song','Cant':'Song','Cantar':'Song',  // Song of Songs variants
  '1Ts':'1Th','2Ts':'2Th',   // Spanish Thessalonians (Tesalonicenses)
  '1Tes':'1Th','2Tes':'2Th', // longer variant
  '1Thes':'1Th','2Thes':'2Th',
  '1King':'1Kgs','2King':'2Kgs',  // English-style Kings used in some Spanish rows
  '1Rey':'1Kgs','2Rey':'2Kgs',    // Spanish Reyes full form
  '1Tim':'1Ti','2Tim':'2Ti',      // Spanish/variant Timothy
  '1Sam':'1Sam','2Sam':'2Sam',    // already canonical but in case
  'Flm':'Phm','Philem':'Phm','Pm':'Phm',  // Philemon variants
  // Actual short English abbreviations used in the data
  'Ac':'Acts','Co':'Col','Ep':'Eph','Ga':'Gal',
  'He':'Heb','Ja':'Jas','Pp':'Phil','Rv':'Rev','Tt':'Tit',
  '1J':'1Jn','2J':'2Jn','3J':'3Jn',
  '1P':'1Pe','2P':'2Pe',
  'Dn':'Dan','Dt':'Deut','Ec':'Eccl','Es':'Esth',
  'Ezk':'Ezek','Ezr':'Ezra','Gn':'Gen',
  'Hb':'Hab','Hg':'Hag','Ho':'Hos',
  'Jb':'Job','Je':'Jer','Jg':'Judg',
  'Jl':'Joel','Jnh':'Jonah','Js':'Josh','La':'Lam',
  'Lv':'Lev','Ml':'Mal','Na':'Nah','Ne':'Neh',
  'Nm':'Num','Ob':'Obad','Pr':'Prov',
  'Ru':'Ruth','Zc':'Zech','Zp':'Zeph',
  '1Ch':'1Chr','2Ch':'2Chr','1K':'1Kgs','2K':'2Kgs',
  '1S':'1Sam','2S':'2Sam',
  'Am':'Amos',
  'SS':'Song',     // English Song of Songs
  'Philem':'Phm',  // English Philemon variant
  'Duet':'Deut',   // typo variant in data
  // English variant spellings
  'Matt':'Mt','Mar':'Mk','Luk':'Lk','Joh':'Jn',
  'Psa':'Ps','1Cor':'1Co','2Cor':'2Co',
  '1Pet':'1Pe','2Pet':'2Pe','Phlm':'Phm',
};

// Matches:  "Rm 12 :1 text"       English (space before colon)
//           "Rom. 12:1 text"       Spanish with dot
//           "1 Co. 3:1 text"       Spanish numbered book (space between digit and letters)
//           "S.S. 1:1 text"        Spanish Song of Songs (dots between letters)
//           "羅 12:1 text"          Chinese single-char abbr
//           "林前 1:1 text"         Chinese multi-char abbr
const ABBR_PAT = '(?:\\d\\s*[A-Za-z]+\\.?|[一-鿿]{1,3}|[A-Za-z0-9]+(?:\\.[A-Za-z0-9]+)*\\.?)';
const VERSE_RE = new RegExp(`^(${ABBR_PAT})\\s+(\\d+)\\s*:(\\d+)\\s*(.*)`);
// Single-chapter books: "Jd 1 text", "Phm 1 text", "Ob 1 text", "2J 1 text"
// No colon — the number is the verse, chapter is implicitly 1
const VERSE_RE_SINGLE = new RegExp(`^(${ABBR_PAT})\\s+(\\d+)\\s+(.*)`);

function normalizeAbbr(raw) {
  // Strip ALL dots and internal whitespace: "S.S." → "SS", "1 Co." → "1Co"
  const stripped = raw.replace(/\./g, '').replace(/\s+/g, '');
  return ABBR_TO_ENGLISH[stripped] || stripped;
}

// Maximum chapter count per book — used to filter data errors (e.g. "Pr. 145:1" typo in source)
const MAX_CHAPTERS = {
  Gen:50,Exo:40,Lev:27,Num:36,Deut:34,Josh:24,Judg:21,Ruth:4,
  '1Sam':31,'2Sam':24,'1Kgs':22,'2Kgs':25,'1Chr':29,'2Chr':36,
  Ezra:10,Neh:13,Esth:10,Job:42,Ps:150,Prov:31,Eccl:12,Song:8,
  Isa:66,Jer:52,Lam:5,Ezek:48,Dan:12,Hos:14,Joel:3,Amos:9,Obad:1,
  Jonah:4,Mic:7,Nah:3,Hab:3,Zeph:3,Hag:2,Zech:14,Mal:4,
  Mt:28,Mk:16,Lk:24,Jn:21,Acts:28,Rm:16,'1Co':16,'2Co':13,
  Gal:6,Eph:6,Phil:4,Col:4,'1Th':5,'2Th':3,'1Ti':6,'2Ti':4,
  Tit:3,Phm:1,Heb:13,Jas:5,'1Pe':5,'2Pe':3,'1Jn':5,'2Jn':1,'3Jn':1,
  Jude:1,Rev:22,
};

function parseVerseLine(line) {
  line = line.trim();
  let result = null;
  let m = line.match(VERSE_RE);
  if (m) {
    result = { abbr: normalizeAbbr(m[1]), chapter: parseInt(m[2], 10), verse: parseInt(m[3], 10), text: m[4] };
  } else {
    // Fallback for single-chapter books (no colon)
    m = line.match(VERSE_RE_SINGLE);
    if (m) result = { abbr: normalizeAbbr(m[1]), chapter: 1, verse: parseInt(m[2], 10), text: m[3] };
  }
  if (!result) return null;
  // Reject chapters beyond the book's known max (catches data typos like "Pr. 145:1")
  const max = MAX_CHAPTERS[result.abbr];
  if (max && result.chapter > max) return null;
  return result;
}

// Some English rows omit the book abbreviation entirely: "15:1 I am the true vine..."
// Used as fallback when parseVerseLine fails on English text; book inferred from ZH parallel.
const NO_ABBR_VERSE_RE = /^(\d+)\s*:\s*(\d+)\s+(.*)/;

function parseNoAbbrVerseLine(line) {
  const m = line.trim().match(NO_ABBR_VERSE_RE);
  if (!m) return null;
  return { chapter: parseInt(m[1], 10), verse: parseInt(m[2], 10), text: m[3] };
}

function parseAudioUrls(raw) {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [p];
  } catch { return typeof raw === 'string' ? [raw] : []; }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function fetchAllVerses() {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('verses')
      .select('nt_text,ot_text,nt_text_es,ot_text_es,nt_text_zh,ot_text_zh,nt_text_sc,ot_text_sc,nt_audio,ot_audio,nt_audio_zh,ot_audio_zh,nt_audio_es,ot_audio_es')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    all = all.concat(data);
    process.stdout.write(`  Fetched ${all.length} rows...\r`);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  console.log(`  Fetched ${all.length} rows total.`);
  return all;
}

function buildChapterMap(rows) {
  // chapterMap[abbr][chapter] = { text_en, text_es, text_zh, text_sc, audio_en, audio_zh, audio_es }
  // verse text stored as "N versetext\n..." lines (verse number + space + text)
  const map = {};
  const langs = ['en', 'es', 'zh', 'sc'];

  for (const row of rows) {
    for (const portion of ['nt', 'ot']) {
      // Parse audio arrays
      const audioUrls = {
        en: parseAudioUrls(row[`${portion}_audio`]),
        zh: parseAudioUrls(row[`${portion}_audio_zh`]),
        es: parseAudioUrls(row[`${portion}_audio_es`]),
      };

      // Build chapter→abbr map from ZH text so we can infer the book for no-prefix EN lines
      const zhChapMap = {};
      const zhText = row[`${portion}_text_zh`];
      if (zhText) {
        for (const line of zhText.split('\n')) {
          const p = parseVerseLine(line);
          if (p) zhChapMap[p.chapter] = p.abbr;
        }
      }

      function resolveVerseLine(line, lang) {
        let p = parseVerseLine(line);
        if (!p && lang === 'en') {
          const np = parseNoAbbrVerseLine(line);
          if (np && zhChapMap[np.chapter]) {
            p = { abbr: zhChapMap[np.chapter], chapter: np.chapter, verse: np.verse, text: np.text };
          }
        }
        return p;
      }

      // Find chapter order from English text (for audio URL assignment)
      const enText = row[`${portion}_text`];
      const orderedChaps = [];
      if (enText) {
        const seen = new Set();
        for (const line of enText.split('\n')) {
          const p = resolveVerseLine(line, 'en');
          if (p && !seen.has(`${p.abbr}_${p.chapter}`)) {
            seen.add(`${p.abbr}_${p.chapter}`);
            orderedChaps.push({ abbr: p.abbr, chapter: p.chapter });
          }
        }
      }

      // Collect verse lines per (abbr, chapter, lang)
      const verseBuf = {}; // `abbr_ch_lang` -> lines[]

      for (const lang of langs) {
        const field = lang === 'en' ? `${portion}_text` : `${portion}_text_${lang}`;
        const text = row[field];
        if (!text) continue;

        for (const line of text.split('\n')) {
          const p = resolveVerseLine(line, lang);
          if (!p) continue;
          const key = `${p.abbr}_${p.chapter}_${lang}`;
          if (!verseBuf[key]) verseBuf[key] = [];
          verseBuf[key].push(`${p.verse} ${p.text}`);
        }
      }

      // Merge verse lines into map — accumulate per verse number so chapters
      // that span multiple reading-day rows get ALL their verses, not just
      // the first row's partial set.
      for (const [key, lines] of Object.entries(verseBuf)) {
        const [abbr, chStr, lang] = key.split('_');
        const chapter = parseInt(chStr, 10);

        if (!map[abbr]) map[abbr] = {};
        if (!map[abbr][chapter]) map[abbr][chapter] = {};

        // Use a verse-number keyed object so we can accumulate across rows
        // and deduplicate without losing any verse.
        const verseKey = `_vs_${lang}`;
        if (!map[abbr][chapter][verseKey]) map[abbr][chapter][verseKey] = {};
        for (const line of lines) {
          const vNum = parseInt(line, 10); // "N text" — parseInt stops at space
          if (!map[abbr][chapter][verseKey][vNum]) {
            map[abbr][chapter][verseKey][vNum] = line;
          }
        }
      }

      // Assign audio URLs by chapter position
      for (let i = 0; i < orderedChaps.length; i++) {
        const { abbr, chapter } = orderedChaps[i];
        if (!map[abbr]?.[chapter]) continue;

        for (const [lc, urls] of Object.entries(audioUrls)) {
          const fieldName = `audio_${lc}`;
          if (map[abbr][chapter][fieldName]) continue; // don't overwrite
          if (!urls || urls.length === 0) continue;
          const url = urls.length === orderedChaps.length ? urls[i] : urls[0];
          if (url) map[abbr][chapter][fieldName] = url;
        }

        // SC uses ZH audio
        if (!map[abbr][chapter].audio_sc && map[abbr][chapter].audio_zh) {
          map[abbr][chapter].audio_sc = map[abbr][chapter].audio_zh;
        }
      }
    }
  }

  return map;
}

async function main() {
  console.log('=== Bible Chapters Migration ===');
  if (DRY_RUN) console.log('DRY RUN — no writes will happen\n');

  console.log('Fetching verses from Supabase...');
  const rows = await fetchAllVerses();

  console.log('Parsing and building chapter map...');
  const chapterMap = buildChapterMap(rows);

  // Finalise verse accumulation: convert _vs_<lang> objects → sorted text strings
  for (const chapters of Object.values(chapterMap)) {
    for (const data of Object.values(chapters)) {
      for (const lang of ['en', 'es', 'zh', 'sc']) {
        const verseKey = `_vs_${lang}`;
        if (data[verseKey]) {
          const sorted = Object.keys(data[verseKey]).map(Number).sort((a, b) => a - b);
          data[`text_${lang}`] = sorted.map(n => data[verseKey][n]).join('\n');
          delete data[verseKey];
        }
      }
    }
  }

  // Flatten map into insert rows
  const insertRows = [];
  for (const [abbr, chapters] of Object.entries(chapterMap)) {
    for (const [chStr, data] of Object.entries(chapters)) {
      insertRows.push({
        book_abbr: abbr,
        chapter: parseInt(chStr, 10),
        text_en: data.text_en || null,
        text_es: data.text_es || null,
        text_zh: data.text_zh || null,
        text_sc: data.text_sc || null,
        audio_en: data.audio_en || null,
        audio_zh: data.audio_zh || null,
        audio_es: data.audio_es || null,
      });
    }
  }

  // Sort for readability
  insertRows.sort((a, b) => a.book_abbr.localeCompare(b.book_abbr) || a.chapter - b.chapter);

  console.log(`\nTotal chapters to insert: ${insertRows.length}`);

  // Print summary by book
  const bookSummary = {};
  for (const r of insertRows) {
    if (!bookSummary[r.book_abbr]) bookSummary[r.book_abbr] = { chapters: 0, missingEn: 0, missingZh: 0, missingEs: 0 };
    bookSummary[r.book_abbr].chapters++;
    if (!r.text_en) bookSummary[r.book_abbr].missingEn++;
    if (!r.text_zh) bookSummary[r.book_abbr].missingZh++;
    if (!r.text_es) bookSummary[r.book_abbr].missingEs++;
  }

  console.log('\nBook summary (chapters | missing EN | missing ZH | missing ES):');
  for (const [abbr, s] of Object.entries(bookSummary)) {
    const issues = [
      s.missingEn ? `EN:${s.missingEn}` : '',
      s.missingZh ? `ZH:${s.missingZh}` : '',
      s.missingEs ? `ES:${s.missingEs}` : '',
    ].filter(Boolean).join(' ');
    console.log(`  ${abbr.padEnd(6)} ${String(s.chapters).padStart(3)} chapters  ${issues || 'complete'}`);
  }

  if (DRY_RUN) {
    console.log('\nDry run complete. No data written.');
    return;
  }

  console.log('\nInserting into bible_chapters (upsert in batches of 100)...');
  const BATCH = 100;
  for (let i = 0; i < insertRows.length; i += BATCH) {
    const batch = insertRows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('bible_chapters')
      .upsert(batch, { onConflict: 'book_abbr,chapter' });
    if (error) {
      console.error(`Error at batch ${i / BATCH + 1}:`, error.message);
      process.exit(1);
    }
    process.stdout.write(`  Inserted ${Math.min(i + BATCH, insertRows.length)}/${insertRows.length}\r`);
  }

  console.log('\nDone! bible_chapters table populated.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

/*
──────────────────────────────────────────────────────────────────────────────
  RUN THIS SQL IN SUPABASE SQL EDITOR FIRST:
──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bible_chapters (
  book_abbr TEXT    NOT NULL,
  chapter   INTEGER NOT NULL,
  text_en   TEXT,
  text_es   TEXT,
  text_zh   TEXT,
  text_sc   TEXT,
  audio_en  TEXT,
  audio_zh  TEXT,
  audio_es  TEXT,
  PRIMARY KEY (book_abbr, chapter)
);

-- Allow anon reads (public Bible text)
ALTER TABLE bible_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON bible_chapters FOR SELECT USING (true);

-- If running the migration with the anon key, also allow inserts:
CREATE POLICY "Anon insert" ON bible_chapters FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon upsert" ON bible_chapters FOR UPDATE USING (true);

──────────────────────────────────────────────────────────────────────────────
*/

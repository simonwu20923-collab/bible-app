#!/usr/bin/env node
/**
 * generate_chinese_outlines.js
 *
 * Fetches https://ezoe.work/bible/jw/nk01.htm … nk66.htm,
 * parses the book intro + hierarchical outline for each of the 66 books,
 * and writes two SQL files:
 *   bible_data_chinese_intros.sql
 *   bible_data_chinese_outlines.sql
 *
 * Each file contains rows for both lang='sc' (Simplified) and lang='zh' (Traditional).
 * TC text is produced by opencc-js (SC→TW conversion).
 *
 * Usage:
 *   node generate_chinese_outlines.js
 *
 * Requires Node ≥ 18 (built-in fetch).
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Book abbreviations in canonical Bible order (nk01 = Gen … nk66 = Rev) ──
const BOOKS = [
  'Gen','Exo','Lev','Num','Deut','Josh','Judg','Ruth',
  '1Sam','2Sam','1Kgs','2Kgs','1Chr','2Chr','Ezra','Neh','Esth',
  'Job','Ps','Prov','Eccl','Song','Isa','Jer','Lam','Ezek','Dan',
  'Hos','Joel','Amos','Obad','Jonah','Mic','Nah','Hab','Zeph','Hag','Zech','Mal',
  'Mt','Mk','Lk','Jn','Acts','Rm','1Co','2Co','Gal','Eph','Phil','Col',
  '1Th','2Th','1Ti','2Ti','Tit','Phm','Heb','Jas','1Pe','2Pe',
  '1Jn','2Jn','3Jn','Jude','Rev',
];

// ── Chinese digit map ─────────────────────────────────────────────────────
const CN_DIGIT = { 一:1, 二:2, 三:3, 四:4, 五:5, 六:6, 七:7, 八:8, 九:9 };

/**
 * Parse a Chinese chapter-numeral string (as used on ezoe.work) to an integer.
 *
 * Supports:
 *   Standard: 一=1 … 九=9, 十=10, 十一=11 … 十九=19
 *   Round tens: 二十=20, 三十=30, 四十=40, 五十=50 … 九十=90
 *   Abbreviated 2-digit (site convention): 二四=24, 三七=37, 四三=43
 *   Standard 3-char: 三十七=37, 八十九=89
 *   Hundreds (Psalms): 一百=100, 一百零六=106, 一百五十=150
 */
function parseCN(s) {
  if (!s) return null;
  s = s.trim();
  if (!s) return null;

  let result = 0;

  // Handle hundreds
  const baiIdx = s.indexOf('百');
  if (baiIdx >= 0) {
    const hundredsPart = s.slice(0, baiIdx);
    result += (hundredsPart ? (CN_DIGIT[hundredsPart] || 1) : 1) * 100;
    s = s.slice(baiIdx + 1).replace(/^零/, ''); // strip leading 零 filler
    if (!s) return result;
  }

  // Handle leading 十: 十=10, 十一=11, …, 十九=19
  if (s[0] === '十') {
    if (s.length === 1) return result + 10;
    return result + 10 + (CN_DIGIT[s[1]] || 0);
  }

  if (s.length === 1) return result + (CN_DIGIT[s] || 0);

  // Two-character forms
  if (s.length === 2) {
    const a = CN_DIGIT[s[0]];
    if (s[1] === '十') return result + (a || 0) * 10;      // 二十=20, 三十=30…
    const b = CN_DIGIT[s[1]];
    if (a && b) return result + a * 10 + b;                // 二四=24, 三七=37…
    return null;
  }

  // Three-character standard form X十Y (e.g., 三十七=37, 八十九=89)
  if (s.length === 3 && s[1] === '十') {
    const a = CN_DIGIT[s[0]], b = CN_DIGIT[s[2]];
    return result + (a || 0) * 10 + (b || 0);
  }

  return result || null;
}

/**
 * Parse one half of a verse-ref part, e.g. "一1", "十二3", "24", "二4下", "一2上".
 * Returns { ch, v } where ch may be null (no chapter prefix present).
 */
function parseHalf(s) {
  if (!s) return { ch: null, v: null };
  s = s.replace(/[上下节章]/g, '').trim();
  const m = s.match(/^([一二三四五六七八九十百]*)(\d+)?$/);
  if (!m) return { ch: null, v: null };
  const ch = m[1] ? parseCN(m[1]) : null;
  const v  = m[2] ? parseInt(m[2], 10) : null;
  return { ch, v };
}

/**
 * Parse a full verse-ref string like "一1～二25", "24～25", "一2下～5".
 * Also handles the Psalms format "第X至Y篇" (chapter ranges, no verse).
 * The separator ～ may be U+FF5E (fullwidth tilde) or U+007E (tilde).
 * Returns { sc, sv, ec, ev } — start/end chapter+verse; any may be null.
 */
function parseVerseRef(refStr) {
  if (!refStr) return { sc: null, sv: null, ec: null, ev: null };
  refStr = refStr.trim();

  // Psalms format: 第X至Y篇
  const psalmRange = refStr.match(/^第([一二三四五六七八九十百零]+)至([一二三四五六七八九十百零]+)篇$/);
  if (psalmRange) {
    return { sc: parseCN(psalmRange[1]), sv: 1, ec: parseCN(psalmRange[2]), ev: null };
  }

  // Take only the first range when multiple comma-separated ranges exist
  refStr = refStr.split(/[，,]/)[0].trim();

  const parts = refStr.split(/[～~]/);
  const start = parseHalf(parts[0]);

  if (parts.length === 1) {
    return { sc: start.ch, sv: start.v, ec: null, ev: null };
  }

  const end = parseHalf(parts[1]);
  return {
    sc: start.ch,
    sv: start.v,
    ec: end.ch ?? start.ch,   // inherit chapter from start if not specified
    ev: end.v,
  };
}

// ── Outline level detection from prefix ──────────────────────────────────
const CN_ORD = new Set([...Object.keys(CN_DIGIT), '十','百',
  '壹','贰','叁','肆','伍','陆','柒','捌','玖','拾',
]);

function getLevel(prefix) {
  if (!prefix) return null;
  const p = prefix.trim();

  // Level 1 — Chinese ordinals (壹贰叁肆伍陆柒捌玖拾)
  if (/^[壹贰叁肆伍陆柒捌玖拾]$/.test(p)) return 1;

  // Level 1 — Psalms volumes (卷一 … 卷五)
  if (/^卷[一二三四五六七八九]$/.test(p)) return 1;

  // Level 2 — Chinese cardinal chapter numerals (一 … 十九 etc.)
  // Must be ONLY CN numeral chars (no Arabic)
  if (/^[一二三四五六七八九十百]+$/.test(p)) return 2;

  // Level 3 — Arabic numerals
  if (/^\d+$/.test(p)) return 3;

  // Level 4 — Latin lowercase letters
  if (/^[a-z]$/.test(p)) return 4;

  // Level 5 — （Chinese numeral）
  if (/^（[一二三四五六七八九十百]+）$/.test(p)) return 5;

  // Level 6 — （Arabic numeral）
  if (/^（\d+）$/.test(p)) return 6;

  return null;
}

/** True if string looks like a verse reference (not a title fragment). */
function looksLikeRef(s) {
  if (!s) return false;
  const orig = s.trim();
  const s2 = orig.replace(/\s+/g, ''); // strip internal whitespace for pattern check
  // Psalms chapter-range format: 第X至Y篇
  if (/^第[一二三四五六七八九十百零]+至[一二三四五六七八九十百零]+篇$/.test(s2)) return true;
  // Must start with Chinese numeral or Arabic digit and contain only
  // CN numerals, Arabic digits, ～/~, 上, 下, comma (multi-range separator)
  return /^[一二三四五六七八九十百\d][一二三四五六七八九十百\d～~上下，,]*$/.test(s2);
}

// ── HTML → plain text ─────────────────────────────────────────────────────
function htmlToText(html) {
  // Decode common entities first
  html = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));

  // Insert newlines at block boundaries
  html = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, '\t');

  // Strip all remaining tags
  html = html.replace(/<[^>]+>/g, '');

  return html;
}

// ── Parse a single outline line ───────────────────────────────────────────
const IDEOGRAPHIC = '　'; // U+3000 Ideographic Space

function parseLine(rawLine) {
  // Strip leading whitespace, list markers, parenthetical wrappers
  let line = rawLine.trim();
  // Remove surrounding parentheses like （以扫的后代　三六1～43）
  const paren = line.match(/^（(.+)）$/);
  if (paren) line = paren[1].trim();

  // Split on ideographic space
  let parts = line.split(IDEOGRAPHIC).map(s => s.trim()).filter(Boolean);

  // Fallback: split on 2+ regular spaces or tab if no ideographic space found
  if (parts.length < 2) {
    parts = line.split(/[ \t]{2,}/).map(s => s.trim()).filter(Boolean);
  }
  if (parts.length < 2) return null;

  const prefix = parts[0];
  const level  = getLevel(prefix);
  if (level === null) return null;

  // If the last part looks like a verse ref, split title from ref
  const last = parts[parts.length - 1];
  let title, refStr;

  if (looksLikeRef(last) && parts.length >= 2) {
    title  = parts.slice(1, -1).join(IDEOGRAPHIC).trim();
    refStr = last.replace(/\s+/g, ''); // strip any embedded spaces from ref
  } else {
    title  = parts.slice(1).join(IDEOGRAPHIC).trim();
    refStr = null;
  }

  // Clean up title — strip surrounding quotation marks or dashes
  title = title.replace(/^[─—「"]+|[─—」"]+$/g, '').trim();

  // Fallback: if title is empty (e.g. Psalms "卷一 第一至四十一篇"), use the ref text
  if (!title && refStr) title = refStr;

  const ref = parseVerseRef(refStr);
  return { level, prefix, title, ref };
}

// ── Parse intro metadata from raw page text ───────────────────────────────
function parseIntro(text) {
  const grab = (pattern) => {
    const m = text.match(pattern);
    return m ? m[1].trim().replace(/\s+/g, ' ').replace(/[。\n]+.*$/s, '') : '';
  };

  // 主题 uses full-width colon ：
  const subject = grab(/主题[：:]\s*["「]?([^\n"」]+)/);
  // Other fields use ideographic space or colon as separator
  const author          = grab(/著者[\s　：:]+([^\n]+)/);
  const timeOfWriting   = grab(/著时[\s　：:]+([^\n]+)/);
  const placeOfWriting  = grab(/著地[\s　：:]+([^\n]+)/);
  const timePeriod      = grab(/涵盖时段[\s　：:]+([^\n]+)/);
  const recipient       = grab(/受者[\s　：:]+([^\n]+)/);

  // Strip trailing period
  const clean = s => s.replace(/[。.]+\s*$/, '').trim();

  return {
    subject:         clean(subject),
    author:          clean(author),
    time_of_writing: clean(timeOfWriting),
    place_of_writing:clean(placeOfWriting),
    time_period_covered: clean(timePeriod),
    recipient:       clean(recipient),
  };
}

// ── SQL helpers ───────────────────────────────────────────────────────────
function esc(s) {
  if (s === null || s === undefined) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}
function num(n) { return (n === null || n === undefined) ? 'NULL' : String(n); }

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  // Dynamic import for opencc-js (ESM-only package)
  let toTC;
  try {
    const opencc = await import('opencc-js');
    toTC = opencc.Converter({ from: 'cn', to: 'tw' });
    console.error('opencc-js loaded — will produce zh (Traditional Chinese) rows.');
  } catch (e) {
    console.error('WARNING: opencc-js not available. zh rows will be copies of sc rows.');
    toTC = s => s;
  }

  const introRows    = [];  // { bookAbbr, lang, fields }
  const outlineRows  = [];  // { bookAbbr, lang, level, prefix, title, sc, sv, ec, ev, sort }

  for (let i = 1; i <= 66; i++) {
    const bookAbbr = BOOKS[i - 1];
    const url = `https://ezoe.work/bible/jw/nk${String(i).padStart(2, '0')}.htm`;
    console.error(`[${i}/66] ${bookAbbr} — ${url}`);

    let html;
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      html = await resp.text();
    } catch (e) {
      console.error(`  ERROR fetching: ${e.message}`);
      continue;
    }

    const text = htmlToText(html);
    const lines = text.split('\n');

    // ── Parse intro ──────────────────────────────────────────────────────
    const intro_sc = parseIntro(text);

    // ── Parse outline items ──────────────────────────────────────────────
    let sortOrder    = 1;
    let currentChapter = null;  // tracks last chapter seen, for context-less refs

    const bookOutlineSC = [];

    for (const rawLine of lines) {
      const item = parseLine(rawLine);
      if (!item) continue;

      // Update current-chapter tracker
      if (item.ref.sc !== null) currentChapter = item.ref.sc;

      const sc_ch = item.ref.sc ?? currentChapter;
      const sv    = item.ref.sv;
      const ec    = item.ref.ec;
      const ev    = item.ref.ev;

      bookOutlineSC.push({
        level: item.level,
        prefix: item.prefix,
        title_sc: item.title,
        sc_ch, sv, ec, ev,
        sort: sortOrder++,
      });
    }

    if (bookOutlineSC.length === 0) {
      console.error(`  WARNING: no outline items parsed for ${bookAbbr}`);
    } else {
      console.error(`  Parsed ${bookOutlineSC.length} outline items`);
    }

    // ── Build SC rows ────────────────────────────────────────────────────
    introRows.push({ bookAbbr, lang: 'sc', ...intro_sc });

    for (const row of bookOutlineSC) {
      outlineRows.push({ bookAbbr, lang: 'sc', ...row, title: row.title_sc });
    }

    // ── Build ZH (Traditional Chinese) rows ─────────────────────────────
    const intro_zh = {
      subject:         toTC(intro_sc.subject),
      author:          toTC(intro_sc.author),
      time_of_writing: toTC(intro_sc.time_of_writing),
      place_of_writing:toTC(intro_sc.place_of_writing),
      time_period_covered: toTC(intro_sc.time_period_covered),
      recipient:       toTC(intro_sc.recipient),
    };
    introRows.push({ bookAbbr, lang: 'zh', ...intro_zh });

    for (const row of bookOutlineSC) {
      outlineRows.push({ bookAbbr, lang: 'zh', ...row, title: toTC(row.title_sc) });
    }

    // Small delay to be polite to the server
    await new Promise(r => setTimeout(r, 300));
  }

  // ── Write intro SQL ───────────────────────────────────────────────────
  const introLines = [
    '-- ============================================================',
    '-- Bible Book Intros: Simplified + Traditional Chinese',
    '-- Source: https://ezoe.work/bible/jw/nk01.htm … nk66.htm',
    `-- Generated: ${new Date().toISOString().slice(0, 10)}`,
    '-- ============================================================',
    '',
    '-- Add recipient column if it does not yet exist',
    'ALTER TABLE bible_book_intros ADD COLUMN IF NOT EXISTS recipient TEXT;',
    '',
    "DELETE FROM bible_book_intros WHERE lang IN ('sc','zh');",
    '',
    "INSERT INTO bible_book_intros (book_abbr, lang, author, time_of_writing, place_of_writing, time_period_covered, subject, recipient) VALUES",
  ];

  for (let i = 0; i < introRows.length; i++) {
    const r   = introRows[i];
    const sep = i < introRows.length - 1 ? ',' : ';';
    introLines.push(
      `(${esc(r.bookAbbr)},${esc(r.lang)},${esc(r.author)},${esc(r.time_of_writing)},${esc(r.place_of_writing)},${esc(r.time_period_covered)},${esc(r.subject)},${esc(r.recipient)})${sep}`
    );
  }

  // ── Write outline SQL ─────────────────────────────────────────────────
  // Group by book+lang to emit DELETE before each block
  const outlineLines = [
    '-- ============================================================',
    '-- Bible Outlines: Simplified + Traditional Chinese',
    '-- Source: https://ezoe.work/bible/jw/nk01.htm … nk66.htm',
    `-- Generated: ${new Date().toISOString().slice(0, 10)}`,
    '-- ============================================================',
    '',
    "DELETE FROM bible_outlines WHERE lang IN ('sc','zh');",
    '',
  ];

  // Group rows by bookAbbr+lang
  const grouped = {};
  for (const r of outlineRows) {
    const key = `${r.bookAbbr}|${r.lang}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  }

  for (const [key, rows] of Object.entries(grouped)) {
    const [bookAbbr, lang] = key.split('|');
    outlineLines.push(`-- ${bookAbbr} (${lang})`);
    outlineLines.push(
      'INSERT INTO bible_outlines (book_abbr,lang,level,prefix,title,start_chapter,start_verse,end_chapter,end_verse,sort_order) VALUES'
    );
    for (let i = 0; i < rows.length; i++) {
      const r   = rows[i];
      const sep = i < rows.length - 1 ? ',' : ';';
      outlineLines.push(
        `(${esc(r.bookAbbr)},${esc(r.lang)},${num(r.level)},${esc(r.prefix)},${esc(r.title)},${num(r.sc_ch)},${num(r.sv)},${num(r.ec)},${num(r.ev)},${num(r.sort)})${sep}`
      );
    }
    outlineLines.push('');
  }

  const outDir = path.dirname(__filename);
  const introPath   = path.join(outDir, 'bible_data_chinese_intros.sql');
  const outlinePath = path.join(outDir, 'bible_data_chinese_outlines.sql');

  fs.writeFileSync(introPath,   introLines.join('\n'),   'utf8');
  fs.writeFileSync(outlinePath, outlineLines.join('\n'), 'utf8');

  console.error(`\nDone!`);
  console.error(`  Intros:   ${introPath}   (${introRows.length} rows)`);
  console.error(`  Outlines: ${outlinePath} (${outlineRows.length} rows)`);
}

main().catch(e => { console.error(e); process.exit(1); });

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { BOOK_NAMES, NT_BOOKS, OT_BOOKS } from '../utils/bibleBooks';

// ── Book-name → abbr lookup for cross-reference parsing ──────────────────────
const REF_NAME_MAP = {
  // OT
  'genesis':'Gen','gen':'Gen',
  'exodus':'Exo','exod':'Exo','exo':'Exo','ex':'Exo',
  'leviticus':'Lev','lev':'Lev',
  'numbers':'Num','num':'Num',
  'deuteronomy':'Deut','deut':'Deut','deu':'Deut',
  'joshua':'Josh','josh':'Josh','jos':'Josh',
  'judges':'Judg','judg':'Judg','jud':'Judg',
  'ruth':'Ruth',
  '1 samuel':'1Sam','1 sam':'1Sam','1sam':'1Sam',
  '2 samuel':'2Sam','2 sam':'2Sam','2sam':'2Sam',
  '1 kings':'1Kgs','1 kgs':'1Kgs','1 king':'1Kgs','1 kgs':'1Kgs',
  '2 kings':'2Kgs','2 kgs':'2Kgs','2 king':'2Kgs',
  '1 chronicles':'1Chr','1 chron':'1Chr','1 chr':'1Chr','1chr':'1Chr',
  '2 chronicles':'2Chr','2 chron':'2Chr','2 chr':'2Chr','2chr':'2Chr',
  'ezra':'Ezra',
  'nehemiah':'Neh','neh':'Neh',
  'esther':'Esth','esth':'Esth',
  'job':'Job',
  'psalms':'Ps','psalm':'Ps','ps':'Ps','psa':'Ps',
  'proverbs':'Prov','prov':'Prov',
  'ecclesiastes':'Eccl','eccl':'Eccl','eccles':'Eccl',
  'song':'Song','song of songs':'Song','song of solomon':'Song','ss':'Song','s.s':'Song',
  'isaiah':'Isa','isa':'Isa',
  'jeremiah':'Jer','jer':'Jer',
  'lamentations':'Lam','lam':'Lam',
  'ezekiel':'Ezek','ezek':'Ezek','eze':'Ezek',
  'daniel':'Dan','dan':'Dan',
  'hosea':'Hos','hos':'Hos',
  'joel':'Joel',
  'amos':'Amos',
  'obadiah':'Obad','obad':'Obad',
  'jonah':'Jonah',
  'micah':'Mic','mic':'Mic',
  'nahum':'Nah','nah':'Nah',
  'habakkuk':'Hab','hab':'Hab',
  'zephaniah':'Zeph','zeph':'Zeph',
  'haggai':'Hag','hag':'Hag',
  'zechariah':'Zech','zech':'Zech','zec':'Zech',
  'malachi':'Mal','mal':'Mal',
  // NT
  'matthew':'Mt','matt':'Mt','mat':'Mt','mt':'Mt',
  'mark':'Mk','mk':'Mk','mar':'Mk',
  'luke':'Lk','lk':'Lk',
  'john':'Jn','jn':'Jn','joh':'Jn',
  'acts':'Acts','act':'Acts',
  'romans':'Rm','rom':'Rm',
  '1 corinthians':'1Co','1 cor':'1Co','1cor':'1Co',
  '2 corinthians':'2Co','2 cor':'2Co','2cor':'2Co',
  'galatians':'Gal','gal':'Gal',
  'ephesians':'Eph','eph':'Eph',
  'philippians':'Phil','phil':'Phil',
  'colossians':'Col','col':'Col',
  '1 thessalonians':'1Th','1 thess':'1Th','1 thes':'1Th','1thess':'1Th',
  '2 thessalonians':'2Th','2 thess':'2Th','2 thes':'2Th','2thess':'2Th',
  '1 timothy':'1Ti','1 tim':'1Ti','1tim':'1Ti',
  '2 timothy':'2Ti','2 tim':'2Ti','2tim':'2Ti',
  'titus':'Tit','tit':'Tit',
  'philemon':'Phm','phlm':'Phm','phm':'Phm',
  'hebrews':'Heb','heb':'Heb',
  'james':'Jas','jas':'Jas',
  '1 peter':'1Pe','1 pet':'1Pe','1pet':'1Pe',
  '2 peter':'2Pe','2 pet':'2Pe','2pet':'2Pe',
  '1 john':'1Jn','1 joh':'1Jn','1jn':'1Jn',
  '2 john':'2Jn','2 joh':'2Jn','2jn':'2Jn',
  '3 john':'3Jn','3 joh':'3Jn','3jn':'3Jn',
  'jude':'Jude',
  'revelation':'Rev','rev':'Rev',
};

// ── Popup context — lets nested components push new popups ───────────────────
const PopupContext = React.createContext({ pushPopup: () => {} });

// ── Chinese book abbreviation → our book_abbr ────────────────────────────────
// Includes BOTH Simplified Chinese (SC) and Traditional Chinese (TW) variants
// so cross-refs work whether the popup content is SC or TW.
// Multi-char keys MUST come before single-char ones (greedy matching order).
const ZH_BOOK_MAP = {
  // NT multi-char — SC forms (后) + TW forms (後)
  '林前':'1Co',
  '林后':'2Co','林後':'2Co',
  '帖前':'1Th',
  '帖后':'2Th','帖後':'2Th',
  '提前':'1Ti',
  '提后':'2Ti','提後':'2Ti',
  '彼前':'1Pe',
  '彼后':'2Pe','彼後':'2Pe',
  // 1/2/3 John — SC (约) and TW (約)
  '约一':'1Jn','約一':'1Jn',
  '约二':'2Jn','約二':'2Jn',
  '约三':'3Jn','約三':'3Jn',
  // OT multi-char (same in SC and TW)
  '撒上':'1Sam','撒下':'2Sam',
  '王上':'1Kgs','王下':'2Kgs',
  '代上':'1Chr','代下':'2Chr',
  // NT single-char — SC + TW variants where chars differ
  '太':'Mt','可':'Mk','路':'Lk',
  '约':'Jn','約':'Jn',           // SC: 约  TW: 約
  '徒':'Acts',
  '罗':'Rm','羅':'Rm',           // SC: 罗  TW: 羅
  '加':'Gal','弗':'Eph','腓':'Phil','西':'Col',
  '多':'Tit',
  '门':'Phm','門':'Phm',         // SC: 门  TW: 門
  '来':'Heb','來':'Heb',         // SC: 来  TW: 來
  '雅':'Jas',
  '犹':'Jude','猶':'Jude',       // SC: 犹  TW: 猶
  '启':'Rev','啟':'Rev',         // SC: 启  TW: 啟
  // OT single-char — SC + TW variants
  '创':'Gen','創':'Gen',         // SC: 创  TW: 創
  '出':'Exo','利':'Lev','民':'Num','申':'Deut',
  '书':'Josh','書':'Josh',       // SC: 书  TW: 書
  '士':'Judg','得':'Ruth','拉':'Ezra','尼':'Neh',
  '斯':'Esth','伯':'Job',
  '诗':'Ps','詩':'Ps',           // SC: 诗  TW: 詩
  '箴':'Prov',
  '传':'Eccl','傳':'Eccl',       // SC: 传  TW: 傳
  '歌':'Song',
  '赛':'Isa','賽':'Isa',         // SC: 赛  TW: 賽
  '耶':'Jer','哀':'Lam',
  '结':'Ezek','結':'Ezek',       // SC: 结  TW: 結
  '但':'Dan',
  '何':'Hos','珥':'Joel','摩':'Amos','俄':'Obad','拿':'Jonah',
  '弥':'Mic','彌':'Mic',         // SC: 弥  TW: 彌
  '鸿':'Nah','鴻':'Nah',         // SC: 鸿  TW: 鴻
  '哈':'Hab','番':'Zeph',
  '该':'Hag','該':'Hag',         // SC: 该  TW: 該
  '亚':'Zech','亞':'Zech',       // SC: 亚  TW: 亞
  '玛':'Mal','瑪':'Mal',         // SC: 玛  TW: 瑪
};
// Book abbr keys sorted longest-first for greedy matching
const _sortedZhKeys = Object.keys(ZH_BOOK_MAP).sort((a, b) => b.length - a.length);

// Chinese chapter numeral regex (covers chapters 1-150)
// Includes BOTH standard form (二十八=28, 十三=13) AND compact two-digit form (二八=28, 四五=45)
const ZH_CH_PAT =
  '(?:一百(?:[一二三四五]十[一二三四五六七八九]?|零[一二三四五六七八九])?' +
  '|[二三四五六七八九]十[一二三四五六七八九]?' +
  '|十[一二三四五六七八九]?' +
  '|[一二三四五六七八九][一二三四五六七八九]' +  // compact 2-digit: 四五=45, 二八=28
  '|[一二三四五六七八九])';

// Pre-compiled anchored regexes for ZH chapter matching
const _zhChRe     = new RegExp('^(' + ZH_CH_PAT + ')(\\d+)(?:[上中下])?(?:[–\\-～](\\d+))?');
const _zhArabicRe = /^(\d+):(\d+)(?:[–\-～](\d+))?/;

// Convert a Chinese chapter numeral string to an integer
function parseZhChapter(s) {
  const D = {一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
  if (D[s] !== undefined) return D[s];
  if (s === '十') return 10;
  // Compact two-digit form: 四五=45, 二八=28, 一六=16, etc. (no 十 present)
  if (s.length === 2 && D[s[0]] !== undefined && D[s[1]] !== undefined) {
    return D[s[0]] * 10 + D[s[1]];
  }
  if (s.startsWith('一百')) {
    const r = s.slice(2);
    if (!r) return 100;
    if (r[0] === '零') return 100 + (D[r[1]] || 0);
    const shi = r.indexOf('十');
    if (shi !== -1) return 100 + (D[r[shi - 1]] || 0) * 10 + (D[r[shi + 1]] || 0);
    return 100;
  }
  const shi = s.indexOf('十');
  if (shi !== -1) {
    const tens = shi === 0 ? 1 : (D[s[0]] || 0);
    return tens * 10 + (D[s[shi + 1]] || 0);
  }
  return 0;
}

// ── Parse ZH ref strings — handles both BB2 Arabic (太1:16) and
//   footnote Chinese-numeral (弗一10；三9) formats, with continuation ──────────
function parseZhRefTokens(content) {
  const tokens = [];
  let lastIdx = 0;
  let lastAbbr = null;
  let i = 0;

  while (i < content.length) {
    let matched = false;

    // 1. Try book abbr (longest-first) + chapter at position i
    for (const key of _sortedZhKeys) {
      if (content.startsWith(key, i)) {
        const pos  = i + key.length;
        const abbr = ZH_BOOK_MAP[key];
        const rest = content.slice(pos);

        // Try Arabic ch:v  (e.g. 太1:16)
        const ara = rest.match(_zhArabicRe);
        if (ara) {
          if (i > lastIdx) tokens.push({ type: 'text', text: content.slice(lastIdx, i) });
          lastAbbr = abbr;
          tokens.push({ type: 'ref', label: key + ara[0], abbr,
            chapter: parseInt(ara[1]), startVerse: parseInt(ara[2]),
            endVerse: ara[3] ? parseInt(ara[3]) : parseInt(ara[2]) });
          lastIdx = i = pos + ara[0].length;
          matched = true;
          break;
        }
        // Try Chinese ch + Arabic verse  (e.g. 弗一10)
        const zh = rest.match(_zhChRe);
        if (zh) {
          if (i > lastIdx) tokens.push({ type: 'text', text: content.slice(lastIdx, i) });
          lastAbbr = abbr;
          tokens.push({ type: 'ref', label: key + zh[0], abbr,
            chapter: parseZhChapter(zh[1]), startVerse: parseInt(zh[2]),
            endVerse: zh[3] ? parseInt(zh[3]) : parseInt(zh[2]) });
          lastIdx = i = pos + zh[0].length;
          matched = true;
          break;
        }
        break; // book abbr found but no chapter — don't try shorter keys
      }
    }

    // 2. Try bare continuation (no book prefix) when a previous book is known
    if (!matched && lastAbbr) {
      const rest = content.slice(i);
      // Arabic ch:v continuation (e.g. 3:9 after Col.)
      const ara = rest.match(_zhArabicRe);
      if (ara) {
        if (i > lastIdx) tokens.push({ type: 'text', text: content.slice(lastIdx, i) });
        tokens.push({ type: 'ref', label: ara[0], abbr: lastAbbr,
          chapter: parseInt(ara[1]), startVerse: parseInt(ara[2]),
          endVerse: ara[3] ? parseInt(ara[3]) : parseInt(ara[2]) });
        lastIdx = i = i + ara[0].length;
        matched = true;
      } else {
        // Chinese ch continuation only after a ref-separator char (，；,(  etc.)
        const prevChar = i > 0 ? content[i - 1] : '';
        if (/[，；,;\s（(]/.test(prevChar)) {
          const zh = rest.match(_zhChRe);
          if (zh) {
            if (i > lastIdx) tokens.push({ type: 'text', text: content.slice(lastIdx, i) });
            tokens.push({ type: 'ref', label: zh[0], abbr: lastAbbr,
              chapter: parseZhChapter(zh[1]), startVerse: parseInt(zh[2]),
              endVerse: zh[3] ? parseInt(zh[3]) : parseInt(zh[2]) });
            lastIdx = i = i + zh[0].length;
            matched = true;
          }
        }
      }
    }

    if (!matched) i++;
  }

  if (lastIdx < content.length) tokens.push({ type: 'text', text: content.slice(lastIdx) });
  return tokens;
}

// Detect if content is Chinese (CJK characters present)
const CJK_RE_DETECT = /[一-鿿㐀-䶿]/;

// ── Parse a cross-ref string into text + ref tokens ──────────────────────────
// contextBook / contextChapter: the book+chapter whose note we're reading.
//   • lastAbbr/lastChapter reset to context at each newline (paragraph boundary)
//   • Alt 3: bare verse after "," or ";" inherits lastAbbr + lastChapter
//   • Alt 4: "v. N" / "vv. N-M" links to contextBook + contextChapter + verse
function parseRefTokens(content, contextBook = null, contextChapter = null) {
  // Pass 1: strip digit+letter note markers appended to verse numbers
  //   "2 Cor. 13:141a" (verse 14 + marker "1a") → "2 Cor. 13:14"
  let cleaned = content.replace(/:(\d+)\d[a-z]+/gi, ':$1');

  // Pass 2: mark single-digit note numbers that follow "note Book ch:v"
  //   "note Job 38:71" (verse 7 + note marker 1) → "note Job 38:7\x001"
  cleaned = cleaned.replace(
    /(\bnote\s+(?:\d+\s+)?[A-Z][A-Za-z.]+\s+\d+:)(\d+)(\d)(?=[^0-9a-zA-Z]|$)/g,
    '$1$2\x00$3'
  );

  // Alt 1: [N ] BookName ch:v[-endV]              — explicit book ref
  // Alt 2: ch:v[-endV]                             — inherits lastAbbr
  // Alt 3: bare verse after "," or ";" with spaces — inherits lastAbbr + lastChapter
  // Alt 4: v. N / vv. N[-M]                        — uses contextBook + contextChapter
  const re = /(?:(\d+)\s+)?([A-Z][A-Za-z]*(?:\.[A-Za-z]+)*\.?)\s+(\d+):(\d+)(?:\s*[-–]\s*(\d+))?|(?<!\d)(\d+):(\d+)(?:\s*[-–]\s*(\d+))?(?!\d)|(?<=[,;]\s{0,5})(\d{1,3})(?!\s*:)(?!\d)|\b[Vv][Vv]?\.?\s+(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/g;

  const tokens = [];
  let lastIdx = 0;
  let lastAbbr = contextBook;
  let lastChapter = contextChapter;
  let m;

  // Push a text token, stripping any stray \x00 separators
  const pushText = (s) => { if (s) tokens.push({ type: 'text', text: s.replace(/\x00./g, '') }); };

  while ((m = re.exec(cleaned))) {
    const matchEnd = m.index + m[0].length;

    // ── Paragraph boundary check ──────────────────────────────────────────
    // If there's a newline between the last processed position and this match,
    // reset context back to the host book/chapter so "1:1" in a new paragraph
    // refers to the current book, not whatever was last cited.
    if (cleaned.slice(lastIdx, m.index).includes('\n')) {
      lastAbbr    = contextBook;
      lastChapter = contextChapter;
    }

    // After the match check for a \x00+digit note-number marker
    const noteNum  = cleaned[matchEnd] === '\x00' ? cleaned[matchEnd + 1] : null;
    const afterEnd = noteNum ? matchEnd + 2 : matchEnd;

    if (m[2] !== undefined) {
      // ── Alt 1: explicit book ref ──────────────────────────────────────
      pushText(cleaned.slice(lastIdx, m.index));
      const numPrefix = m[1] ? m[1] + ' ' : '';
      const bookRaw   = (numPrefix + m[2]).toLowerCase().replace(/\.+$/, '').trim();
      const abbr      = REF_NAME_MAP[bookRaw];
      if (abbr) {
        lastAbbr    = abbr;
        lastChapter = parseInt(m[3], 10);
        tokens.push({ type: 'ref', label: m[0], abbr, noteNum,
          chapter: lastChapter, startVerse: parseInt(m[4], 10),
          endVerse: m[5] ? parseInt(m[5], 10) : parseInt(m[4], 10) });
      } else {
        pushText(m[0]);
      }
      lastIdx = afterEnd;

    } else if (m[6] !== undefined) {
      // ── Alt 2: bare ch:v — inherits lastAbbr ─────────────────────────
      if (lastAbbr) {
        pushText(cleaned.slice(lastIdx, m.index));
        lastChapter = parseInt(m[6], 10);
        tokens.push({ type: 'ref', label: m[0], abbr: lastAbbr, noteNum,
          chapter: lastChapter, startVerse: parseInt(m[7], 10),
          endVerse: m[8] ? parseInt(m[8], 10) : parseInt(m[7], 10) });
        lastIdx = afterEnd;
      }

    } else if (m[9] !== undefined) {
      // ── Alt 3: bare verse after "," or ";" — inherits lastAbbr + lastChapter
      if (lastAbbr && lastChapter) {
        pushText(cleaned.slice(lastIdx, m.index));
        const v = parseInt(m[9], 10);
        tokens.push({ type: 'ref', label: m[9], abbr: lastAbbr, noteNum,
          chapter: lastChapter, startVerse: v, endVerse: v });
        lastIdx = afterEnd;
      }

    } else if (m[10] !== undefined) {
      // ── Alt 4: "v. N" / "vv. N-M" — uses contextBook + contextChapter ─
      if (contextBook && contextChapter) {
        pushText(cleaned.slice(lastIdx, m.index));
        const startV = parseInt(m[10], 10);
        const endV   = m[11] ? parseInt(m[11], 10) : startV;
        tokens.push({ type: 'ref', label: m[0], abbr: contextBook, noteNum,
          chapter: contextChapter, startVerse: startV, endVerse: endV });
        lastIdx = afterEnd;
      }
    }
    // unrecognised bare ch:v with no prior book → skip
  }
  pushText(cleaned.slice(lastIdx));
  return tokens;
}

// ── Outline tree helpers ──────────────────────────────────────────────────────

// Standard verse counts per chapter for each book (index 0 = chapter 1)
const BIBLE_VERSE_COUNTS = {
  Gen:[31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,34,24,20,67,34,35,46,22,35,43,55,32,20,31,29,43,36,30,23,23,57,38,34,34,28,34,31,22,33,26],
  Exo:[22,25,22,11,14,23,17,15,21,22,19,25,16,14,23,15,29,43,11,12,25,11,22,23,15,26,11,22,23,15,26,18,25,10,36,24,14,14,27,18],
  Lev:[17,16,17,35,19,30,38,36,24,20,47,8,59,57,33,34,16,30,37,27,24,33,44,23,55,46,34],
  Num:[54,34,51,49,31,27,89,26,23,36,35,16,33,45,41,50,13,32,22,29,35,41,30,25,18,65,23,31,40,16,54,42,56,29,34,13],
  Deut:[46,37,29,49,33,25,26,20,29,22,32,32,18,29,23,22,20,22,21,20,23,30,25,22,19,19,26,68,29,20,30,52,29,12],
  Josh:[18,24,17,24,15,27,26,35,27,43,23,24,33,15,63,10,18,28,51,9,45,34,16,33],
  Judg:[36,23,31,24,31,40,25,35,57,18,40,15,25,20,20,31,13,31,30,48,25],
  Ruth:[22,23,18,22],
  '1Sam':[28,36,21,22,12,21,17,22,27,27,15,25,23,52,35,23,58,30,24,42,15,23,29,22,44,25,12,25,11,31,13],
  '2Sam':[27,32,39,12,25,23,29,18,13,19,27,31,39,33,37,23,29,33,43,26,22,51,39,25],
  '1Kgs':[53,46,28,34,18,38,51,66,28,29,43,33,34,31,34,34,24,46,21,43,29,53],
  '2Kgs':[18,25,27,44,27,33,20,29,37,36,21,21,25,29,38,20,41,37,37,21,26,20,37,20,30],
  '1Chr':[54,55,24,43,26,81,40,40,44,14,47,40,14,17,29,43,27,17,19,8,30,19,32,31,31,32,34,21,30],
  '2Chr':[17,18,17,22,14,42,22,18,31,19,23,16,22,15,19,14,19,34,11,37,20,12,21,27,28,23,9,27,36,27,21,33,25,33,27,23],
  Ezra:[11,70,13,24,17,22,28,36,15,44],
  Neh:[11,20,32,23,19,19,73,18,38,39,36,47,31],
  Esth:[22,23,15,17,14,14,10,17,32,3],
  Job:[22,13,26,21,27,30,21,22,35,22,20,25,28,22,35,22,16,21,29,29,34,30,17,25,6,14,23,28,25,31,40,22,33,37,16,33,24,41,30,32,26,17],
  Ps:[6,12,8,8,12,10,17,9,20,18,7,8,6,7,5,11,15,50,14,9,13,31,6,10,22,12,14,9,11,12,24,11,22,22,28,12,40,22,13,17,13,11,5,26,17,11,9,14,20,23,19,9,6,7,23,13,11,11,17,12,8,12,11,10,13,20,7,35,36,5,24,20,28,23,10,12,20,72,13,19,16,8,18,12,13,17,7,18,52,17,16,15,5,23,11,13,12,9,9,5,8,28,22,35,45,48,43,13,31,7,10,10,9,8,18,19,2,29,176,7,8,9,4,8,5,6,5,6,8,8,3,18,3,3,21,26,9,8,24,14,10,8,12,15,21,10,20,14,9,6],
  Prov:[33,22,35,27,23,35,27,36,18,32,31,28,25,35,33,33,28,24,29,30,31,29,35,34,28,28,27,28,27,33,31],
  Eccl:[18,26,22,16,20,12,29,17,18,20,10,14],
  Song:[17,17,11,16,16,13,13,14],
  Isa:[31,22,26,6,30,13,25,22,21,34,16,6,22,32,9,14,14,7,25,6,17,25,18,23,12,21,13,29,24,33,9,20,24,17,10,22,38,22,8,31,29,25,28,28,25,13,15,22,26,11,23,15,12,17,13,12,21,14,21,22,11,12,19,12,25,24],
  Jer:[19,37,25,31,31,30,34,22,26,25,23,17,27,22,21,21,27,23,15,18,14,30,40,10,38,24,22,17,32,24,40,44,26,22,19,32,21,28,18,16,18,22,13,30,5,28,7,47,39,46,64,34],
  Lam:[22,22,66,22,22],
  Ezek:[28,10,27,17,17,14,27,18,11,22,25,28,23,23,8,63,24,32,14,49,32,31,49,27,17,21,36,26,21,26,18,32,33,31,15,38,28,23,29,49,26,20,27,31,25,24,23,35],
  Dan:[21,49,30,37,31,28,28,27,27,21,45,13],
  Hos:[11,23,5,19,15,11,16,14,17,15,12,14,16,9],
  Joel:[20,32,21],
  Amos:[15,16,15,13,27,14,17,14,15],
  Obad:[21],
  Jonah:[17,10,10,11],
  Mic:[16,13,12,13,15,16,20],
  Nah:[15,13,19],
  Hab:[17,20,19],
  Zeph:[18,15,20],
  Hag:[15,23],
  Zech:[21,13,10,14,11,15,14,23,17,12,17,14,9,21],
  Mal:[14,17,18,6],
  Mt:[25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20],
  Mk:[45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20],
  Lk:[80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53],
  Jn:[51,25,36,54,47,71,53,59,41,42,57,50,38,31,27,33,26,40,42,31,25],
  Acts:[26,47,26,37,42,15,60,40,43,48,30,25,52,28,41,40,34,28,41,38,40,30,35,27,27,32,44,31],
  Rm:[32,29,31,25,21,23,25,39,33,21,36,21,14,26,33,25],
  '1Co':[31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24],
  '2Co':[24,17,18,18,21,18,16,24,15,18,33,21,14],
  Gal:[24,21,29,31,26,18],
  Eph:[23,22,21,32,33,24],
  Phil:[30,30,21,23],
  Col:[29,23,25,18],
  '1Th':[10,20,13,18,28],
  '2Th':[12,17,18],
  '1Ti':[20,15,16,16,25,21],
  '2Ti':[18,26,17,22],
  Tit:[16,15,15],
  Phm:[25],
  Heb:[14,18,19,16,14,20,28,13,28,39,40,29,25],
  Jas:[27,26,18,17,20],
  '1Pe':[25,25,22,19,14],
  '2Pe':[21,22,18],
  '1Jn':[10,29,24,21,21],
  '2Jn':[13],
  '3Jn':[14],
  Jude:[25],
  Rev:[20,29,22,11,14,17,17,13,21,11,19,17,18,20,8,21,18,24,21,15,27,21],
};

// For each outline item that has no end ref, infer it from the next sibling's start ref.
function inferEndRefs(items) {
  if (!items.length) return items;
  const bookAbbr = items[0].book_abbr;
  const counts = BIBLE_VERSE_COUNTS[bookAbbr] || [];
  const lastVerseOf = ch => counts[ch - 1] || 0;

  return items.map((item, i) => {
    if (item.end_chapter && item.end_verse) return item;
    if (!item.start_chapter || !item.start_verse) return item;

    // Find the next item at the same or shallower level
    let next = null;
    for (let j = i + 1; j < items.length; j++) {
      if (items[j].level <= item.level) { next = items[j]; break; }
    }

    let ec = null, ev = null;
    if (next?.start_chapter) {
      const nc = next.start_chapter, nv = next.start_verse || 1;
      if (nv > 1) {
        ec = nc; ev = nv - 1;
      } else if (nc > 1) {
        const lv = lastVerseOf(nc - 1);
        if (lv) { ec = nc - 1; ev = lv; }
      }
    } else if (counts.length) {
      // Last top-level item — end at the book's last verse
      ec = counts.length;
      ev = counts[counts.length - 1];
    }

    return (ec && ev) ? { ...item, end_chapter: ec, end_verse: ev } : item;
  });
}

function buildOutlineTree(items) {
  // items should already be end-ref-enriched (via inferEndRefs)
  const root = { children: [], level: 0 };
  const stack = [root];
  for (const item of items) {
    while (stack.length > 1 && stack[stack.length - 1].level >= item.level) stack.pop();
    const node = { ...item, children: [] };
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return root.children;
}

function formatOutlineRange(item) {
  if (!item.start_chapter || !item.start_verse) return '';
  const s = `${item.start_chapter}:${item.start_verse}`;
  if (!item.end_chapter || !item.end_verse) return s;
  if (item.start_chapter === item.end_chapter && item.start_verse === item.end_verse) return s;
  const e = item.end_chapter === item.start_chapter ? `${item.end_verse}` : `${item.end_chapter}:${item.end_verse}`;
  return `${s}—${e}`;
}

function OutlineNode({ node, expandAllTrigger, collapseAllTrigger, onNavigate }) {
  const [expanded, setExpanded] = useState(node.level === 1);
  const prevExpand   = useRef(expandAllTrigger);
  const prevCollapse = useRef(collapseAllTrigger);

  useEffect(() => {
    if (expandAllTrigger !== prevExpand.current) {
      prevExpand.current = expandAllTrigger;
      setExpanded(true);
    }
  }, [expandAllTrigger]);

  useEffect(() => {
    if (collapseAllTrigger !== prevCollapse.current) {
      prevCollapse.current = collapseAllTrigger;
      setExpanded(false);
    }
  }, [collapseAllTrigger]);

  const hasChildren = node.children && node.children.length > 0;
  const range = formatOutlineRange(node);
  const clickable = !!node.start_chapter;

  return (
    <div className={`outline-level-${node.level}`} style={{ paddingLeft: node.level === 1 ? 0 : (node.level - 1) * 14 + 'px' }}>
      <div className="outline-item-row">
        <button className="outline-toggle" onClick={() => setExpanded(e => !e)}>
          {hasChildren ? (expanded ? '−' : '+') : <span style={{ opacity: 0 }}>·</span>}
        </button>
        <div
          className={`outline-item-content${clickable ? ' outline-clickable' : ''}`}
          onClick={clickable ? () => onNavigate(node) : undefined}
        >
          {node.prefix && <span className="outline-prefix">{node.prefix} </span>}
          {node.title}
          {range && <span className="outline-range">{range}</span>}
        </div>
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children.map((child, i) => (
            <OutlineNode key={child.id || i} node={child} expandAllTrigger={expandAllTrigger} collapseAllTrigger={collapseAllTrigger} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function OutlineTree({ nodes, expandAllTrigger, collapseAllTrigger, onNavigate }) {
  return (
    <div className="outline-tree">
      {nodes.map((node, i) => (
        <OutlineNode key={node.id || i} node={node} expandAllTrigger={expandAllTrigger} collapseAllTrigger={collapseAllTrigger} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

// ── Draggable popup card ─────────────────────────────────────────────────────
// Uses pointer capture for reliable cross-browser drag (no mousemove/mouseup on window).
function DraggablePopup({ popup, idx, onClose, onCloseAll, totalCount, children }) {
  const headerRef = useRef(null);
  const dragState = useRef(null); // { startMX, startMY, startPX, startPY, el }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    // Don't drag when clicking close buttons
    if (e.target.closest('button')) return;
    e.preventDefault();
    const el = headerRef.current?.closest('.bible-ref-popup');
    if (!el) return;
    dragState.current = {
      startMX: e.clientX,
      startMY: e.clientY,
      startPX: popup.x,
      startPY: popup.y,
      el,
    };
    headerRef.current.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    const ds = dragState.current;
    if (!ds) return;
    const newX = ds.startPX + e.clientX - ds.startMX;
    const newY = ds.startPY + e.clientY - ds.startMY;
    ds.el.style.left = newX + 'px';
    ds.el.style.top  = newY + 'px';
  }

  function onPointerUp(e) {
    const ds = dragState.current;
    if (!ds) return;
    const newX = Math.max(8, ds.startPX + e.clientX - ds.startMX);
    const newY = Math.max(8, ds.startPY + e.clientY - ds.startMY);
    dragState.current = null;
    onClose({ type: 'move', id: popup.id, x: newX, y: newY });
  }

  function onPointerCancel() {
    dragState.current = null;
  }

  return (
    <div className="bible-ref-popup"
      style={{ top: popup.y, left: popup.x, zIndex: 9999 + idx }}
      onClick={e => e.stopPropagation()}
    >
      <div ref={headerRef} className="bible-ref-popup-header"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <span className="bible-ref-popup-title">{popup.title}</span>
        <div className="bible-ref-popup-actions">
          {totalCount > 1 && (
            <button className="bible-ref-popup-closeall"
              onPointerDown={e => e.stopPropagation()}
              onClick={onCloseAll} title="Close all">✕ all</button>
          )}
          <button className="bible-ref-popup-close"
            onPointerDown={e => e.stopPropagation()}
            onClick={() => onClose({ type: 'close', id: popup.id })}>✕</button>
        </div>
      </div>
      <div className="bible-ref-popup-body">
        {children}
      </div>
    </div>
  );
}

// ── Mobile bottom sheet ──────────────────────────────────────────────────────
// Shown on narrow screens instead of draggable popups.
// history = [{id, kind, title, ...}], idx = current position.
function MobileBottomSheet({ history, idx, onNavigate, onClose }) {
  const current = history[idx];
  if (!current) return null;
  const canBack = idx > 0;
  const canFwd  = idx < history.length - 1;
  return (
    <>
      <div className="mobile-sheet-backdrop" onClick={onClose} />
      <div className="mobile-sheet">
        <div className="mobile-sheet-header">
          <div className="mobile-sheet-nav">
            <button className="mobile-sheet-nav-btn" disabled={!canBack}
              onClick={() => onNavigate(idx - 1)} aria-label="Back">‹</button>
            {history.length > 1 && (
              <span className="mobile-sheet-nav-pos">{idx + 1}/{history.length}</span>
            )}
            <button className="mobile-sheet-nav-btn" disabled={!canFwd}
              onClick={() => onNavigate(idx + 1)} aria-label="Forward">›</button>
          </div>
          <span className="mobile-sheet-title">{current.title}</span>
          <button className="mobile-sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="mobile-sheet-body">
          {current.kind === 'note' && (
            <RefContent content={current.content} lang={current.contentLang}
              contextBook={current.contextBook} contextChapter={current.contextChapter} />
          )}
          {current.kind === 'verse' && (
            <div className="bible-ref-verse-stack">
              {current.verses.map(v => (
                <div key={v.verse} className="bible-ref-verse-row">
                  <span className="bible-ref-verse-num">{v.verse}</span>
                  <span className="bible-ref-verse-text">
                    <VerseWithMarkers verseNum={v.verse} plainText={v.text}
                      markedText={current.markedTexts[v.verse]}
                      refsMap={current.refsMap} verseLang={current.verseLang || 'en'} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Split "[marker]" tokens from marked-text string ──────────────────────────
function parseMarkerParts(text) {
  const parts = [];
  const re = /\[([^\]]+)\]/g;
  let lastIdx = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > lastIdx) parts.push({ kind: 'text', text: text.slice(lastIdx, m.index) });
    parts.push({ kind: 'marker', marker: m[1] });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) parts.push({ kind: 'text', text: text.slice(lastIdx) });
  return parts;
}

// ── Verse with clickable markers → each marker pushes a new note popup ───────
function VerseWithMarkers({ verseNum, plainText, markedText, refsMap, verseLang = 'en' }) {
  const { pushPopup } = React.useContext(PopupContext);
  if (!markedText) return <>{plainText}</>;
  const parts = parseMarkerParts(markedText);
  return (
    <>
      {parts.map((p, i) => {
        if (p.kind === 'text') return <React.Fragment key={i}>{p.text}</React.Fragment>;
        const refKey   = `${verseNum}_${p.marker}`;
        const ref      = refsMap[refKey];
        const isLetter = /^[a-z]/i.test(p.marker);
        return (
          <sup key={i}
            className={`bible-ref-sup${ref ? (isLetter ? ' bible-ref-cr' : ' bible-ref-fn') : ''}`}
            onClick={ref ? e => {
              e.stopPropagation();
              pushPopup({
                kind:        'note',
                title:       isLetter ? '📖 Cross-reference' : '📝 Footnote',
                content:     ref.content,
                contentLang: verseLang,
              });
            } : undefined}
          >
            {p.marker}
          </sup>
        );
      })}
    </>
  );
}

// ── RefContent: note body — ref links each open a new verse popup ─────────────
// Auto-detects ZH vs EN content and uses the appropriate tokenizer + columns
// contextBook / contextChapter: the host verse's book+chapter for paragraph-aware parsing
function RefContent({ content, lang: contentLang, contextBook, contextChapter }) {
  const { pushPopup } = React.useContext(PopupContext);
  const [loading, setLoading] = useState({});

  // Determine if this content is Chinese
  const isZh = contentLang === 'zh' || contentLang === 'sc' || CJK_RE_DETECT.test(content);
  const tokens = useMemo(
    () => isZh ? parseZhRefTokens(content) : parseRefTokens(content, contextBook, contextChapter),
    [content, isZh, contextBook, contextChapter]
  );

  async function handleRefClick(token, key) {
    if (loading[key]) return;
    setLoading(prev => ({ ...prev, [key]: true }));

    // Choose text/marked columns based on content language
    const textCol    = isZh ? (contentLang === 'sc' ? 'text_sc' : 'text_zh') : 'text_en';
    const markedCol  = isZh ? (contentLang === 'sc' ? 'text_sc_marked' : 'text_zh_marked') : 'text_en_marked';
    const refsLang   = isZh ? (contentLang === 'sc' ? 'sc' : 'zh') : 'en';

    const [{ data: chData }, { data: refsData }] = await Promise.all([
      supabase.from('bible_chapters').select(`${textCol},${markedCol}`)
        .eq('book_abbr', token.abbr).eq('chapter', token.chapter).single(),
      supabase.from('bible_refs').select('verse,marker,type,content')
        .eq('book_abbr', token.abbr).eq('chapter', token.chapter).eq('lang', refsLang),
    ]);
    setLoading(prev => ({ ...prev, [key]: false }));

    const verses = parseStoredVerses(chData?.[textCol] || '')
      .filter(v => v.verse >= token.startVerse && v.verse <= token.endVerse);
    const markedTexts = {};
    const markedRaw = chData?.[markedCol];
    if (markedRaw) {
      markedRaw.split('\n').forEach(line => {
        const mm = line.match(/^(\d+)\s+([\s\S]*)/);
        if (mm) markedTexts[parseInt(mm[1])] = mm[2];
      });
    }
    const refsMap = {};
    (refsData || []).forEach(r => { refsMap[`${r.verse}_${r.marker}`] = { type: r.type, content: r.content }; });

    pushPopup({ kind: 'verse', title: token.label, verses, markedTexts, refsMap,
                verseLang: isZh ? (contentLang === 'sc' ? 'sc' : 'zh') : 'en' });
  }

  return (
    <span>
      {tokens.map((token, i) => {
        if (token.type === 'text') return <span key={i} className="bible-ref-text-segment">{token.text}</span>;
        const key = `${token.abbr}_${token.chapter}_${token.startVerse}-${token.endVerse}`;
        return (
          <React.Fragment key={i}>
            <button className="bible-ref-link"
              onClick={() => handleRefClick(token, key)}
            >
              {token.label}{loading[key] ? ' …' : ''}
            </button>
            {token.noteNum && <sup className="bible-ref-note-num">{token.noteNum}</sup>}
          </React.Fragment>
        );
      })}
    </span>
  );
}

const LANG_OPTIONS = [
  { code: 'en',  label: '🇺🇸 English'      },
  { code: 'es',  label: '🇪🇸 Español'       },
  { code: 'zh',  label: '繁 Traditional'    },
  { code: 'sc',  label: '简 Simplified'     },
];

const UI_TEXT = {
  en: {
    nt: 'New Testament', ot: 'Old Testament', selectBook: 'Select a book to begin',
    loading: 'Loading…', parallel: '⇔ Parallel', noText: 'Text not available in this language.',
    chapters: 'CHAPTERS', verse: 'VERSE', text: 'Text:',
    outline: 'Outline', expandAll: 'Expand all', collapseAll: 'Collapse all',
    introFields: { author: 'Author', timeOfWriting: 'Time of Writing', placeOfWriting: 'Place of Writing', timePeriodCovered: 'Time Period Covered', recipient: 'Recipient' },
    subjectOf: (book) => `Subject of ${book}:`,
  },
  es: {
    nt: 'Nuevo Testamento', ot: 'Antiguo Testamento', selectBook: 'Selecciona un libro',
    loading: 'Cargando…', parallel: '⇔ Paralelo', noText: 'Texto no disponible.',
    chapters: 'CAPÍTULOS', verse: 'VERSÍCULO', text: 'Texto:',
    outline: 'Bosquejo', expandAll: 'Expandir todo', collapseAll: 'Contraer todo',
    introFields: { author: 'Autor', timeOfWriting: 'Fecha de escritura', placeOfWriting: 'Lugar de escritura', timePeriodCovered: 'Período cubierto', recipient: 'Destinatarios' },
    subjectOf: (book) => `Tema de ${book}:`,
  },
  zh: {
    nt: '新約', ot: '舊約', selectBook: '請選擇一本書',
    loading: '載入中…', parallel: '⇔ 對照', noText: '此語言暫無文字。',
    chapters: '章節選擇', verse: '節', text: '字體:',
    outline: '綱要', expandAll: '展開所有', collapseAll: '收合所有',
    introFields: { author: '著者', timeOfWriting: '著時', placeOfWriting: '著地', timePeriodCovered: '涵蓋時段', recipient: '受者' },
    subjectOf: (book) => `${book}的主題：`,
  },
  sc: {
    nt: '新约', ot: '旧约', selectBook: '请选择一本书',
    loading: '载入中…', parallel: '⇔ 对照', noText: '此语言暂无文字。',
    chapters: '章节选择', verse: '节', text: '字体:',
    outline: '纲要', expandAll: '展开所有', collapseAll: '收合所有',
    introFields: { author: '著者', timeOfWriting: '著时', placeOfWriting: '著地', timePeriodCovered: '涵盖时段', recipient: '受者' },
    subjectOf: (book) => `${book}的主题：`,
  },
};

function parseStoredVerses(text) {
  if (!text) return [];
  return text.split('\n')
    .map(line => { const m = line.match(/^(\d+)\s+(.*)/); return m ? { verse: parseInt(m[1], 10), text: m[2] } : null; })
    .filter(Boolean);
}

// ── Supabase queries ───────────────────────────────────────────────────────

async function fetchAvailableBooks() {
  const cacheKey = 'bibleBooks_v2';
  try { const c = sessionStorage.getItem(cacheKey); if (c) return JSON.parse(c); } catch (_) {}
  // Paginate to avoid Supabase's default 1000-row limit (table has 1189+ rows)
  let all = [], from = 0;
  while (true) {
    const { data, error } = await supabase.from('bible_chapters').select('book_abbr').range(from, from + 999);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  const books = [...new Set(all.map(r => r.book_abbr))];
  try { sessionStorage.setItem(cacheKey, JSON.stringify(books)); } catch (_) {}
  return books;
}

async function fetchChaptersForBook(bookAbbr) {
  const { data, error } = await supabase.from('bible_chapters').select('chapter').eq('book_abbr', bookAbbr).order('chapter');
  if (error) throw error;
  return data.map(r => r.chapter);
}

// ── Chapter data cache (sessionStorage, keyed per book+chapter) ────────────
function getChapterCache(bookAbbr, chapter) {
  try { const r = sessionStorage.getItem(`bch_${bookAbbr}_${chapter}`); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function mergeChapterCache(bookAbbr, chapter, newData) {
  const merged = { ...(getChapterCache(bookAbbr, chapter) || {}), ...newData };
  try { sessionStorage.setItem(`bch_${bookAbbr}_${chapter}`, JSON.stringify(merged)); } catch (_) {}
  return merged;
}

// Only fetches columns not already in cache; merges result back into cache.
async function fetchChapterData(bookAbbr, chapter, cols) {
  const cached  = getChapterCache(bookAbbr, chapter);
  const colArr  = cols.split(',');
  if (cached && colArr.every(c => cached[c] !== undefined)) return cached; // full cache hit
  const toFetch = cached ? colArr.filter(c => cached[c] === undefined) : colArr;
  const { data, error } = await supabase
    .from('bible_chapters')
    .select(toFetch.join(','))
    .eq('book_abbr', bookAbbr)
    .eq('chapter', chapter)
    .single();
  if (error) throw error;
  return mergeChapterCache(bookAbbr, chapter, data);
}

// ── Component ──────────────────────────────────────────────────────────────

export default function Bible({ lang }) {
  const [availableBooks, setAvailableBooks] = useState(null);
  const [loadError, setLoadError]           = useState(null);
  const [selectedBook, setSelectedBook]     = useState(null);
  const [chapters, setChapters]             = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [chapterData, setChapterData]       = useState(null);
  const [chapterLoading, setChapterLoading] = useState(false);

  const [displayLang, setDisplayLang]       = useState(() => localStorage.getItem('bibleAppLang') || 'en');
  const [fontSize, setFontSize]             = useState(() => parseInt(localStorage.getItem('bibleFontSize'), 10) || 18);
  const [parallelMode, setParallelMode]     = useState(false);
  const [parallelLangA, setParallelLangA]   = useState(() => lang || 'en');
  const [parallelLangB, setParallelLangB]   = useState('zh');
  const [mobileView, setMobileView]         = useState('books');

  // ── Book list collapse state ─────────────────────────────────────────────
  const [ntExpanded, setNtExpanded] = useState(true);
  const [otExpanded, setOtExpanded] = useState(true);

  // ── Sidebar expandable books + intro/outline state ───────────────────────
  const [expandedBooks, setExpandedBooks] = useState(new Set());
  const [sidebarChapters, setSidebarChapters] = useState({});
  const [showIntro, setShowIntro] = useState(false);
  const [bookIntro, setBookIntro] = useState(null);
  const [bookOutline, setBookOutline] = useState([]);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [outlineExpandTrigger, setOutlineExpandTrigger]   = useState(0);
  const [outlineCollapseTrigger, setOutlineCollapseTrigger] = useState(0);
  const [outlineAllExpanded, setOutlineAllExpanded]         = useState(false);
  const [chapterOutlines, setChapterOutlines]   = useState([]);
  const [chapterOutlinesB, setChapterOutlinesB] = useState([]);
  const [showOutline, setShowOutline] = useState(true);

  const pendingScrollVerse = useRef(null);

  // ── Admin refs mode ─────────────────────────────────────────────────────
  const isAdmin = sessionStorage.getItem('adminAuthed') === 'true';
  const [showRefs, setShowRefs]       = useState(false);
  const [refsMap, setRefsMap]         = useState({});  // column A: { "verse_marker": {type,content} }
  const [markedTexts, setMarkedTexts] = useState({});  // column A: { verseNum: markedString }
  const [refsMapB, setRefsMapB]       = useState({});  // column B (parallel)
  const [markedTextsB, setMarkedTextsB] = useState({}); // column B (parallel)
  const [popupStack, setPopupStack]   = useState([]); // desktop: [{ id, kind, title, x, y, ... }]
  const [mobileSheet, setMobileSheet] = useState({ history: [], idx: -1 }); // mobile bottom sheet
  const [isMobile, setIsMobile]       = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const mainRef         = useRef(null);
  const verseContentRef = useRef(null);

  // Push a note/verse popup — routes to bottom sheet on mobile, draggable stack on desktop
  const pushPopup = useCallback((popup) => {
    if (window.innerWidth < 768) {
      // Mobile: add to sheet history (truncate any forward history first)
      setMobileSheet(prev => {
        const history = [
          ...prev.history.slice(0, prev.idx + 1),
          { id: Date.now() + Math.random(), ...popup },
        ];
        return { history, idx: history.length - 1 };
      });
    } else {
      // Desktop: cascading draggable popups
      setPopupStack(prev => {
        const offset = prev.length * 30;
        const baseX  = popup.x ?? (prev.length ? prev[0].x + offset : 120);
        const baseY  = popup.y ?? (prev.length ? prev[0].y + offset : 120);
        return [...prev, {
          id: Date.now() + Math.random(),
          ...popup,
          x: Math.min(Math.max(baseX, 8), window.innerWidth  - 384),
          y: Math.min(Math.max(baseY, 8), window.innerHeight - 460),
        }];
      });
    }
  }, []);

  const closeAllPopups = useCallback(() => setPopupStack([]), []);
  const closeSheet     = useCallback(() => setMobileSheet({ history: [], idx: -1 }), []);
  const navigateSheet  = useCallback((idx) => setMobileSheet(prev => ({ ...prev, idx })), []);

  // Which refs lang is active — null means no refs for that lang (e.g. Spanish)
  const activeRefsLang = useMemo(() => {
    const l = parallelMode ? parallelLangA : displayLang;
    return (l === 'en' || l === 'zh' || l === 'sc') ? l : null;
  }, [parallelMode, parallelLangA, displayLang]);

  // Refs lang for parallel column B (only meaningful in parallel mode)
  const activeRefsLangB = useMemo(() => {
    if (!parallelMode) return null;
    return (parallelLangB === 'en' || parallelLangB === 'zh' || parallelLangB === 'sc') ? parallelLangB : null;
  }, [parallelMode, parallelLangB]);

  const t = UI_TEXT[displayLang] || UI_TEXT.en;

  const introLang = useMemo(() => (displayLang === 'es' ? 'en' : displayLang), [displayLang]);

  // Effective outline language for column A: use parallelLangA when in parallel mode
  const outlineLangA = useMemo(() => {
    if (parallelMode) return parallelLangA === 'es' ? 'en' : parallelLangA;
    return introLang;
  }, [parallelMode, parallelLangA, introLang]);

  // Outline language for parallel column B (null = same as A, no second fetch needed)
  const outlineLangB = useMemo(() => {
    if (!parallelMode) return null;
    const lang = parallelLangB === 'es' ? 'en' : parallelLangB;
    return lang === outlineLangA ? null : lang;
  }, [parallelMode, parallelLangB, outlineLangA]);

  // Persist font size preference
  useEffect(() => { localStorage.setItem('bibleFontSize', String(fontSize)); }, [fontSize]);

  // Columns to fetch for chapter text — only what the current display config needs
  const chapterCols = useMemo(() => {
    const audioCol = l => (l === 'sc' || l === 'zh') ? 'audio_zh' : l === 'es' ? 'audio_es' : 'audio_en';
    const cols = new Set();
    if (parallelMode) {
      cols.add(`text_${parallelLangA}`); cols.add(`text_${parallelLangB}`);
      cols.add(audioCol(parallelLangA));  cols.add(audioCol(parallelLangB));
    } else {
      cols.add(`text_${displayLang}`);
      cols.add(audioCol(displayLang));
    }
    return [...cols].join(',');
  }, [displayLang, parallelMode, parallelLangA, parallelLangB]);

  // Re-fetch chapter data when language/mode changes and the needed column isn't cached yet
  useEffect(() => {
    if (!selectedBook || !selectedChapter || !chapterData) return;
    const colArr = chapterCols.split(',');
    if (colArr.every(c => chapterData[c] !== undefined)) return; // already have all needed cols
    fetchChapterData(selectedBook, selectedChapter, chapterCols)
      .then(data => setChapterData(data))
      .catch(() => {});
  }, [chapterCols]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch primary outlines reactively — deferred until outline panel is open
  useEffect(() => {
    if (!selectedBook || !selectedChapter) { setChapterOutlines([]); return; }
    if (!showOutline) return; // don't fetch while panel is hidden; fires when user opens it
    supabase.from('bible_outlines').select('*')
      .eq('book_abbr', selectedBook).eq('lang', outlineLangA).eq('start_chapter', selectedChapter)
      .order('sort_order')
      .then(({ data }) => setChapterOutlines(data || []));
  }, [outlineLangA, selectedBook, selectedChapter, showOutline]);

  // Fetch secondary outlines when parallel mode or chapter changes
  useEffect(() => {
    if (!outlineLangB || !selectedBook || !selectedChapter) {
      setChapterOutlinesB([]);
      return;
    }
    supabase.from('bible_outlines').select('*')
      .eq('book_abbr', selectedBook).eq('lang', outlineLangB).eq('start_chapter', selectedChapter)
      .order('sort_order')
      .then(({ data }) => setChapterOutlinesB(data || []));
  }, [outlineLangB, selectedBook, selectedChapter]);

  useEffect(() => {
    fetchAvailableBooks()
      .then(books => setAvailableBooks(books))
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => { setDisplayLang(lang); }, [lang]);

  const { ntBooks, otBooks } = useMemo(() => {
    if (!availableBooks) return { ntBooks: [], otBooks: [] };
    const set = new Set(availableBooks);
    return { ntBooks: NT_BOOKS.filter(b => set.has(b)), otBooks: OT_BOOKS.filter(b => set.has(b)) };
  }, [availableBooks]);

  function bookName(abbr, l) {
    const code = l || displayLang;
    return BOOK_NAMES[abbr]?.[code] || BOOK_NAMES[abbr]?.en || abbr;
  }

  // Re-fetch intro + outline whenever book or language changes
  useEffect(() => {
    if (!selectedBook) { setBookIntro(null); setBookOutline([]); return; }
    setOutlineLoading(true);
    Promise.all([
      supabase.from('bible_book_intros').select('*').eq('book_abbr', selectedBook).eq('lang', introLang).maybeSingle(),
      supabase.from('bible_outlines').select('*').eq('book_abbr', selectedBook).eq('lang', introLang).order('sort_order'),
    ]).then(([{ data: introData }, { data: outlineData }]) => {
      setBookIntro(introData || null);
      setBookOutline(outlineData || []);
      setOutlineAllExpanded(false); // reset expand/collapse state on new book/language
    }).catch(() => {
      setBookIntro(null); setBookOutline([]);
    }).finally(() => setOutlineLoading(false));
  }, [selectedBook, introLang]);

  async function selectBook(abbr) {
    if (abbr === selectedBook && showIntro) return;
    setSelectedBook(abbr);
    setSelectedChapter(null);
    setChapterData(null);
    setShowIntro(true);
    setMobileView('chapters');
    try {
      const chs = await fetchChaptersForBook(abbr);
      setChapters(chs);
      setSidebarChapters(prev => ({ ...prev, [abbr]: chs }));
    } catch {
      setChapters([]);
    }
  }

  async function selectChapter(ch, bookOverride) {
    const bookAbbr = bookOverride || selectedBook;
    setSelectedChapter(ch);
    setChapterData(null);
    setChapterLoading(true);
    setShowIntro(false);
    setMobileView('verses');
    setChapterOutlines([]);
    setChapterOutlinesB([]);
    // Scroll verse area to top
    setTimeout(() => verseContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    try {
      const chData = await fetchChapterData(bookAbbr, ch, chapterCols);
      setChapterData(chData);
    } catch { setChapterData(null); }
    setChapterLoading(false);
  }

  function toggleBookExpand(abbr) {
    setExpandedBooks(prev => {
      const next = new Set(prev);
      if (next.has(abbr)) { next.delete(abbr); }
      else {
        next.add(abbr);
        if (!sidebarChapters[abbr]) {
          fetchChaptersForBook(abbr).then(chs => setSidebarChapters(p => ({ ...p, [abbr]: chs })));
        }
      }
      return next;
    });
  }

  async function openChapter(abbr, ch) {
    if (abbr !== selectedBook) {
      setSelectedBook(abbr);
      if (!sidebarChapters[abbr]) {
        const chs = await fetchChaptersForBook(abbr);
        setSidebarChapters(p => ({ ...p, [abbr]: chs }));
        setChapters(chs);
      } else {
        setChapters(sidebarChapters[abbr]);
      }
    }
    await selectChapter(ch, abbr);
  }

  function scrollToVerse(n) {
    const el = document.getElementById(`bible-verse-${n}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function getAudioSrc(l) {
    if (!chapterData) return null;
    if (l === 'sc') return chapterData.audio_zh || null;
    return chapterData[`audio_${l}`] || null;
  }

  // ── Refs data fetching (admin only) ────────────────────────────────────────
  useEffect(() => {
    if (!showRefs || !selectedBook || !selectedChapter) {
      setRefsMap({}); setMarkedTexts({});
      setRefsMapB({}); setMarkedTextsB({});
      return;
    }

    // Helper: fetch refs + marked text for one lang
    async function fetchLangData(lang) {
      if (!lang) return { map: {}, texts: {} };
      const col = lang === 'sc' ? 'text_sc_marked' : lang === 'zh' ? 'text_zh_marked' : 'text_en_marked';
      const [{ data: refs }, { data: ch }] = await Promise.all([
        supabase.from('bible_refs').select('verse,marker,type,content')
          .eq('book_abbr', selectedBook).eq('chapter', selectedChapter).eq('lang', lang),
        supabase.from('bible_chapters').select(col)
          .eq('book_abbr', selectedBook).eq('chapter', selectedChapter).single(),
      ]);
      const map = {};
      (refs || []).forEach(r => { map[`${r.verse}_${r.marker}`] = { type: r.type, content: r.content }; });
      const texts = {};
      if (ch?.[col]) {
        ch[col].split('\n').forEach(line => {
          const mm = line.match(/^(\d+)\s+([\s\S]*)/);
          if (mm) texts[parseInt(mm[1])] = mm[2];
        });
      }
      return { map, texts };
    }

    (async () => {
      const sameLang = !!(activeRefsLangB && activeRefsLangB === activeRefsLang);
      const [aData, bData] = await Promise.all([
        fetchLangData(activeRefsLang),
        sameLang ? Promise.resolve(null) : fetchLangData(activeRefsLangB),
      ]);
      setRefsMap(aData.map);
      setMarkedTexts(aData.texts);
      if (sameLang) {
        setRefsMapB(aData.map);
        setMarkedTextsB(aData.texts);
      } else if (bData) {
        setRefsMapB(bData.map);
        setMarkedTextsB(bData.texts);
      } else {
        setRefsMapB({}); setMarkedTextsB({});
      }
    })();
  }, [showRefs, selectedBook, selectedChapter, activeRefsLang, activeRefsLangB]);

  // ── Pending scroll to verse after chapter load ────────────────────────────
  useEffect(() => {
    if (pendingScrollVerse.current !== null && selectedChapter && chapterData) {
      const v = pendingScrollVerse.current;
      pendingScrollVerse.current = null;
      setTimeout(() => document.getElementById(`bible-verse-${v}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  }, [selectedChapter, chapterData]);

  // ── Marked text parser: "...[marker]word..." → React nodes ───────────────
  // overrideRefsMap / overrideLang: used for parallel column B
  const parseMarkedText = useCallback((text, verseNum, overrideRefsMap, overrideLang) => {
    const localMap  = overrideRefsMap || refsMap;
    const localLang = overrideLang    || activeRefsLang;
    const parts = [];
    const re = /\[([^\]]+)\]/g;
    let lastIdx = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > lastIdx) parts.push({ kind: 'text', text: text.slice(lastIdx, m.index) });
      parts.push({ kind: 'marker', marker: m[1] });
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < text.length) parts.push({ kind: 'text', text: text.slice(lastIdx) });

    return parts.map((p, i) => {
      if (p.kind === 'text') return <React.Fragment key={i}>{p.text}</React.Fragment>;
      const key = `${verseNum}_${p.marker}`;
      const ref = localMap[key];
      const isLetter = /^[a-z]/i.test(p.marker);
      return (
        <sup
          key={i}
          className={`bible-ref-sup${ref ? (isLetter ? ' bible-ref-cr' : ' bible-ref-fn') : ''}`}
          title={ref ? (ref.type === 'cr' ? '📖 ' : '📝 ') + ref.content.slice(0, 80) + (ref.content.length > 80 ? '…' : '') : ''}
          onClick={ref ? e => {
            e.stopPropagation();
            const rect = e.target.getBoundingClientRect();
            pushPopup({
              kind:           'note',
              title:          isLetter ? '📖 Cross-reference' : '📝 Footnote',
              content:        ref.content,
              contentLang:    localLang || 'en',
              contextBook:    selectedBook,
              contextChapter: selectedChapter,
              x: rect.left,
              y: rect.bottom + 6,
            });
          } : undefined}
        >
          {p.marker}
        </sup>
      );
    });
  }, [refsMap, pushPopup, activeRefsLang]);

  // Called by DraggablePopup: either close one popup or commit a drag-move
  const handlePopupAction = useCallback((action) => {
    if (action.type === 'close') {
      setPopupStack(prev => prev.filter(p => p.id !== action.id));
    } else if (action.type === 'move') {
      setPopupStack(prev => prev.map(p => p.id === action.id ? { ...p, x: action.x, y: action.y } : p));
    }
  }, []);

  // ── Verse renderers ────────────────────────────────────────────────────────

  // Build verse→[outlineItems] map; items with no start_verse slot in at verse 1
  function buildOutlinesByVerse(outlines) {
    const map = {};
    for (const ol of outlines) {
      const v = ol.start_verse || 1;
      if (!map[v]) map[v] = [];
      map[v].push(ol);
    }
    return map;
  }

  // Render a single inline outline header row
  function renderOutlineHeader(ol, key) {
    const range = formatOutlineRange(ol);
    return (
      <div
        key={key}
        className={`bible-inline-outline bible-inline-outline-lv${ol.level}`}
        style={{ cursor: ol.start_verse ? 'pointer' : 'default' }}
        onClick={ol.start_verse ? () => scrollToVerse(ol.start_verse) : undefined}
      >
        <div className="bible-inline-outline-title">
          {ol.prefix && <span>{ol.prefix} </span>}{ol.title}
        </div>
        {range && <div className="bible-inline-outline-range">{range}</div>}
      </div>
    );
  }

  function renderVerses(text, outlines = []) {
    const verses = parseStoredVerses(text);
    if (verses.length === 0) return <p style={{ opacity: 0.5, padding: '12px 0' }}>{t.noText}</p>;
    const byVerse = showOutline && outlines.length ? buildOutlinesByVerse(outlines) : {};
    return verses.map(({ verse, text: vt }) => {
      const headers = byVerse[verse] || [];
      const useMarked = showRefs && markedTexts[verse];
      const content   = useMarked ? parseMarkedText(markedTexts[verse], verse) : vt;
      return (
        <React.Fragment key={verse}>
          {headers.map((ol, i) => renderOutlineHeader(ol, `ol-${ol.id || i}`))}
          <div id={`bible-verse-${verse}`} style={{ display: 'flex', gap: '10px', marginBottom: '8px', lineHeight: 1.75, fontSize: fontSize + 'px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '22px', paddingTop: '4px', fontWeight: 600, flexShrink: 0 }}>
              {verse}
            </span>
            <span>{content}</span>
          </div>
        </React.Fragment>
      );
    });
  }

  function renderVersesParallel(textA, textB, outlinesA = [], outlinesB = []) {
    const versesA = parseStoredVerses(textA);
    if (versesA.length === 0) return <p style={{ opacity: 0.5 }}>{t.noText}</p>;
    const mapB = {};
    parseStoredVerses(textB).forEach(v => { mapB[v.verse] = v.text; });
    const byVerseA = showOutline && outlinesA.length ? buildOutlinesByVerse(outlinesA) : {};
    const byVerseB = showOutline && outlinesB.length ? buildOutlinesByVerse(outlinesB) : {};
    return versesA.map(({ verse, text: vt }) => {
      const headersA = byVerseA[verse] || [];
      const headersB = byVerseB[verse] || [];
      const hasHeaders = headersA.length > 0 || headersB.length > 0;
      // Column A — uses activeRefsLang (parallelLangA)
      const contentA = (showRefs && activeRefsLang && markedTexts[verse])
        ? parseMarkedText(markedTexts[verse], verse) : vt;
      // Column B — uses activeRefsLangB + its own refsMap / markedTexts
      const contentB = (showRefs && activeRefsLangB && markedTextsB[verse])
        ? parseMarkedText(markedTextsB[verse], verse, refsMapB, activeRefsLangB)
        : (mapB[verse] || '');
      return (
        <React.Fragment key={verse}>
          {hasHeaders && (
            <div className="parallel-row" style={{ marginBottom: '2px' }}>
              <div className="parallel-col">
                {headersA.map((ol, i) => renderOutlineHeader(ol, `olA-${ol.id || i}`))}
              </div>
              <div className="parallel-col">
                {headersB.map((ol, i) => renderOutlineHeader(ol, `olB-${ol.id || i}`))}
              </div>
            </div>
          )}
          <div id={`bible-verse-${verse}`} className="parallel-row" style={{ marginBottom: '8px' }}>
            <div className="parallel-col" style={{ display: 'flex', gap: '10px', lineHeight: 1.75, fontSize: fontSize + 'px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '22px', paddingTop: '4px', fontWeight: 600, flexShrink: 0 }}>{verse}</span>
              <span>{contentA}</span>
            </div>
            <div className="parallel-col" style={{ display: 'flex', gap: '10px', lineHeight: 1.75, fontSize: fontSize + 'px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '22px', paddingTop: '4px', fontWeight: 600, flexShrink: 0 }}>{verse}</span>
              <span>{contentB}</span>
            </div>
          </div>
        </React.Fragment>
      );
    });
  }

  // ── Outline tree (memoised) ──────────────────────────────────────────────
  // Enrich all outline items with inferred end refs (once, for reuse in both tree and inline view)
  const enrichedBookOutline = useMemo(() => inferEndRefs(bookOutline), [bookOutline]);
  const outlineTree = useMemo(() => buildOutlineTree(enrichedBookOutline), [enrichedBookOutline]);
  // Build an id-keyed map so inline chapter outlines can look up enriched items
  // Enrich chapter outlines independently (so ranges show even if book intro hasn't been loaded)
  const enrichedChapterOutlines  = useMemo(() => inferEndRefs(chapterOutlines),  [chapterOutlines]);
  const enrichedChapterOutlinesB = useMemo(() => inferEndRefs(chapterOutlinesB), [chapterOutlinesB]);

  // Verse count for the jump strip
  const verseCount = useMemo(() => {
    if (!chapterData) return 0;
    const col = parallelMode ? `text_${parallelLangA}` : `text_${displayLang}`;
    const text = chapterData[col] || '';
    return parseStoredVerses(text).length;
  }, [chapterData, displayLang, parallelMode, parallelLangA]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loadError) return <div style={{ textAlign: 'center', padding: '60px', color: '#e53e3e' }}>Failed to load Bible data.</div>;

  if (!availableBooks) return (
    <div style={{ textAlign: 'center', padding: '80px', opacity: 0.6 }}>
      <div className="bible-loading-spinner" />
      <div style={{ marginTop: '16px' }}>{t.loading}</div>
    </div>
  );

  const langLabel = (code) => LANG_OPTIONS.find(l => l.code === code)?.label || code;

  return (
    <PopupContext.Provider value={{ pushPopup }}>
    <>
    {/* ── Mobile bottom sheet (< 768 px) ───────────────────────────── */}
    {isMobile && mobileSheet.idx >= 0 && (
      <MobileBottomSheet
        history={mobileSheet.history}
        idx={mobileSheet.idx}
        onNavigate={navigateSheet}
        onClose={closeSheet}
      />
    )}
    {/* ── Desktop popup stack (≥ 768 px) — fixed, cascaded, draggable ─ */}
    {!isMobile && popupStack.map((popup, idx) => (
      <DraggablePopup key={popup.id} popup={popup} idx={idx}
        onClose={handlePopupAction} onCloseAll={closeAllPopups}
        totalCount={popupStack.length}
      >
        {popup.kind === 'note' && <RefContent content={popup.content} lang={popup.contentLang} contextBook={popup.contextBook} contextChapter={popup.contextChapter} />}
        {popup.kind === 'verse' && (
          <div className="bible-ref-verse-stack">
            {popup.verses.map(v => (
              <div key={v.verse} className="bible-ref-verse-row">
                <span className="bible-ref-verse-num">{v.verse}</span>
                <span className="bible-ref-verse-text">
                  <VerseWithMarkers
                    verseNum={v.verse}
                    plainText={v.text}
                    markedText={popup.markedTexts[v.verse]}
                    refsMap={popup.refsMap}
                    verseLang={popup.verseLang || 'en'}
                  />
                </span>
              </div>
            ))}
          </div>
        )}
      </DraggablePopup>
    ))}
    <div className="bible-layout">

      {/* ── Books sidebar ───────────────────────────────────── */}
      <div className={`bible-sidebar${mobileView !== 'books' ? ' bible-hidden-mobile' : ''}`}>
        <div className="bible-testament-label bible-testament-collapse"
          onClick={() => setNtExpanded(e => !e)}>
          <span className="bible-collapse-arrow">{ntExpanded ? '▾' : '▸'}</span>
          {t.nt}
        </div>
        {ntExpanded && ntBooks.map(abbr => (
          <div key={abbr} className="bible-book-item">
            <div className="bible-book-row">
              <button className="bible-book-expand-btn" onClick={e => { e.stopPropagation(); toggleBookExpand(abbr); }}>
                {expandedBooks.has(abbr) ? '▾' : '▸'}
              </button>
              <button className={`bible-book-btn${selectedBook === abbr ? ' active' : ''}`} onClick={() => selectBook(abbr)}>
                {bookName(abbr)}
              </button>
            </div>
            {expandedBooks.has(abbr) && (
              <div className="bible-sidebar-chapter-grid">
                {(sidebarChapters[abbr] || (selectedBook === abbr ? chapters : [])).map(ch => (
                  <button key={ch}
                    className={`bible-sidebar-ch-btn${selectedBook === abbr && selectedChapter === ch ? ' active' : ''}`}
                    onClick={() => openChapter(abbr, ch)}>
                    {ch}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="bible-testament-label bible-testament-collapse"
          style={{ marginTop: '8px' }}
          onClick={() => setOtExpanded(e => !e)}>
          <span className="bible-collapse-arrow">{otExpanded ? '▾' : '▸'}</span>
          {t.ot}
        </div>
        {otExpanded && otBooks.map(abbr => (
          <div key={abbr} className="bible-book-item">
            <div className="bible-book-row">
              <button className="bible-book-expand-btn" onClick={e => { e.stopPropagation(); toggleBookExpand(abbr); }}>
                {expandedBooks.has(abbr) ? '▾' : '▸'}
              </button>
              <button className={`bible-book-btn${selectedBook === abbr ? ' active' : ''}`} onClick={() => selectBook(abbr)}>
                {bookName(abbr)}
              </button>
            </div>
            {expandedBooks.has(abbr) && (
              <div className="bible-sidebar-chapter-grid">
                {(sidebarChapters[abbr] || (selectedBook === abbr ? chapters : [])).map(ch => (
                  <button key={ch}
                    className={`bible-sidebar-ch-btn${selectedBook === abbr && selectedChapter === ch ? ' active' : ''}`}
                    onClick={() => openChapter(abbr, ch)}>
                    {ch}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Main content ────────────────────────────────────── */}
      <div className={`bible-main${mobileView === 'books' ? ' bible-hidden-mobile' : ''}`} ref={mainRef}>

        {/* Mobile back */}
        <div className="bible-mobile-nav">
          {(mobileView === 'chapters' || mobileView === 'verses') && (
            <button className="bible-back-btn" onClick={() => setMobileView('books')}>← Books</button>
          )}
        </div>

        {/* No book selected */}
        {!selectedBook && (
          <div style={{ textAlign: 'center', padding: '80px 20px', opacity: 0.45, fontSize: '15px' }}>
            {t.selectBook}
          </div>
        )}

        {/* Book selected */}
        {selectedBook && (
          showIntro ? (
            /* ── Book intro page ── */
            <div className="bible-intro-page">
              {/* Chapter grid at top */}
              <div className="bible-chapter-section">
                <div className="bible-chapter-section-header">
                  <h2 className="bible-book-heading">{bookName(selectedBook)}</h2>
                  <span className="bible-section-tag">{t.chapters}</span>
                </div>
                <div className="bible-chapter-grid">
                  {chapters.map(ch => (
                    <button key={ch} className="bible-ch-btn" onClick={() => selectChapter(ch)}>{ch}</button>
                  ))}
                </div>
              </div>
              {/* Intro body */}
              {outlineLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>{t.loading}</div>
              ) : (
                <div className="bible-intro-body">
                  {bookIntro && (
                    <div className="bible-intro-meta">
                      {[
                        [t.introFields.author,            bookIntro.author],
                        [t.introFields.timeOfWriting,     bookIntro.time_of_writing],
                        [t.introFields.placeOfWriting,    bookIntro.place_of_writing],
                        [t.introFields.timePeriodCovered, bookIntro.time_period_covered],
                        [t.introFields.recipient,         bookIntro.recipient],
                      ].filter(([, v]) => v).map(([label, value]) => (
                        <div key={label} className="bible-intro-field">
                          <span className="bible-intro-label">{label}: </span>
                          <RefContent content={value} lang={introLang} contextBook={selectedBook} contextChapter={1} />
                        </div>
                      ))}
                    </div>
                  )}
                  {bookIntro?.subject && (
                    <div className="bible-intro-subject">
                      <div className="bible-intro-subject-label">{t.subjectOf(bookName(selectedBook))}</div>
                      <div className="bible-intro-subject-text">{bookIntro.subject}</div>
                    </div>
                  )}
                  {bookOutline.length > 0 && (
                    <div className="bible-outline-section">
                      <div className="bible-outline-header">
                        <h3 className="bible-outline-title">{t.outline}</h3>
                        <button
                          className="bible-expand-all-btn"
                          onClick={() => {
                            if (outlineAllExpanded) {
                              setOutlineCollapseTrigger(n => n + 1);
                              setOutlineAllExpanded(false);
                            } else {
                              setOutlineExpandTrigger(n => n + 1);
                              setOutlineAllExpanded(true);
                            }
                          }}
                        >
                          {outlineAllExpanded ? t.collapseAll : t.expandAll}
                        </button>
                      </div>
                      <OutlineTree
                        nodes={outlineTree}
                        expandAllTrigger={outlineExpandTrigger}
                        collapseAllTrigger={outlineCollapseTrigger}
                        onNavigate={node => {
                          if (node.start_chapter) {
                            if (node.start_verse) pendingScrollVerse.current = node.start_verse;
                            selectChapter(node.start_chapter);
                          }
                        }}
                      />
                    </div>
                  )}
                  {!bookIntro && bookOutline.length === 0 && (
                    <p className="bible-intro-empty">Introduction data coming soon.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ── Chapter + verse view ── */
            <>
              {/* ── Chapter selection block ── */}
              <div className="bible-chapter-section">
                <div className="bible-chapter-section-header">
                  <h2 className="bible-book-heading">{bookName(selectedBook)}</h2>
                  <span className="bible-section-tag">{t.chapters}</span>
                </div>
                <div className="bible-chapter-grid">
                  {chapters.map(ch => (
                    <button
                      key={ch}
                      className={`bible-ch-btn${selectedChapter === ch ? ' active' : ''}`}
                      onClick={() => selectChapter(ch)}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Verse reading block ── */}
              {selectedChapter && (
                <div className="bible-verse-view" ref={verseContentRef}>

                  {/* Controls row */}
                  <div className="bible-verse-header">
                    <div className="bible-verse-title-row">
                      <h3 className="bible-ch-heading">
                        {displayLang === 'zh' || displayLang === 'sc'
                          ? `第 ${selectedChapter} 章`
                          : `Chapter ${selectedChapter}`}
                      </h3>
                      <div className="bible-verse-controls">
                        {/* Font size controls — same style as Reading page */}
                        <div className="font-size-row">
                          <span>{t.text}</span>
                          <button className="font-btn" onClick={() => setFontSize(f => Math.max(12, f - 2))}>A−</button>
                          <button className="font-btn" onClick={() => setFontSize(18)}>A</button>
                          <button className="font-btn" onClick={() => setFontSize(f => Math.min(26, f + 2))}>A+</button>
                        </div>

                        {/* Parallel toggle — same style as Reading page */}
                        <button
                          className={`parallel-btn${parallelMode ? ' active' : ''}`}
                          onClick={() => {
                            const next = !parallelMode;
                            setParallelMode(next);
                            if (next) setParallelLangA(displayLang);
                          }}
                        >
                          {t.parallel}
                        </button>

                        {/* Admin-only: references toggle */}
                        {isAdmin && (
                          <button
                            className={`parallel-btn${showRefs ? ' active' : ''}`}
                            title="Toggle cross-references and footnotes (admin only)"
                            onClick={() => { setShowRefs(r => !r); closeAllPopups(); }}
                          >
                            📖 Refs
                          </button>
                        )}
                        {/* Outline toggle — only shown when chapter has outline data */}
                        {chapterOutlines.length > 0 && (
                          <button
                            className={`parallel-btn${showOutline ? ' active' : ''}`}
                            title="Toggle outline headers in reading"
                            onClick={() => setShowOutline(v => !v)}
                          >
                            § Outline
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Parallel language bar — same layout as Reading page */}
                    {parallelMode && (
                      <div className="parallel-lang-bar">
                        <select className="parallel-lang-select" value={parallelLangA} onChange={e => setParallelLangA(e.target.value)}>
                          {LANG_OPTIONS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                        </select>
                        <span className="parallel-sep">⇔</span>
                        <select className="parallel-lang-select" value={parallelLangB} onChange={e => setParallelLangB(e.target.value)}>
                          {LANG_OPTIONS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Audio */}
                  {chapterData && (getAudioSrc(parallelMode ? parallelLangA : displayLang) || (parallelMode && getAudioSrc(parallelLangB))) && (
                    <div className={parallelMode ? 'parallel-audio-row' : 'bible-audio-single'}>
                      {getAudioSrc(parallelMode ? parallelLangA : displayLang)
                        ? <audio key={`a-${parallelMode ? parallelLangA : displayLang}-${selectedChapter}`} controls src={getAudioSrc(parallelMode ? parallelLangA : displayLang)} style={{ width: '100%' }} />
                        : parallelMode ? <div /> : null}
                      {parallelMode && (
                        getAudioSrc(parallelLangB)
                          ? <audio key={`b-${parallelLangB}-${selectedChapter}`} controls src={getAudioSrc(parallelLangB)} style={{ width: '100%' }} />
                          : <div />
                      )}
                    </div>
                  )}

                  {/* Verse jump strip */}
                  {!chapterLoading && verseCount > 0 && (
                    <div className="bible-verse-jump">
                      <span className="bible-verse-jump-label">{t.verse}</span>
                      <div className="bible-verse-jump-strip">
                        {Array.from({ length: verseCount }, (_, i) => i + 1).map(n => (
                          <button key={n} className="bible-verse-jump-btn" onClick={() => scrollToVerse(n)}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verse content */}
                  {chapterLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>{t.loading}</div>
                  ) : (
                    <div className="bible-verse-box" onClick={closeAllPopups}>
                      {parallelMode ? (
                        <>
                          <div className="parallel-titles-row" style={{ fontWeight: 700, opacity: 0.6, marginBottom: '10px', fontSize: '13px' }}>
                            <div>{langLabel(parallelLangA)}</div>
                            <div>{langLabel(parallelLangB)}</div>
                          </div>
                          {renderVersesParallel(chapterData?.[`text_${parallelLangA}`], chapterData?.[`text_${parallelLangB}`], enrichedChapterOutlines, enrichedChapterOutlinesB)}
                        </>
                      ) : (
                        renderVerses(chapterData?.[`text_${displayLang}`], enrichedChapterOutlines)
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
    </>
    </PopupContext.Provider>
  );
}

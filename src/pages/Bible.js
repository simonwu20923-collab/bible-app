import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { BOOK_NAMES, NT_BOOKS, OT_BOOKS } from '../utils/bibleBooks';

// ── Book-name → abbr lookup for cross-reference parsing ──────────────────────
const REF_NAME_MAP = {
  // OT
  'genesis':'Gen','gen':'Gen',
  'exodus':'Exo','exod':'Exo','ex':'Exo',
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
  'psalms':'Ps','psalm':'Ps','ps':'Ps',
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
// Multi-char abbrs MUST come before single-char ones (regex alternation is ordered)
const ZH_BOOK_MAP = {
  // NT multi-char first
  '林前':'1Co','林后':'2Co','帖前':'1Th','帖后':'2Th',
  '提前':'1Ti','提后':'2Ti','彼前':'1Pe','彼后':'2Pe',
  '约一':'1Jn','约二':'2Jn','约三':'3Jn',
  // NT single-char
  '太':'Mt','可':'Mk','路':'Lk','约':'Jn','徒':'Acts',
  '罗':'Rm','加':'Gal','弗':'Eph','腓':'Phil','西':'Col',
  '多':'Tit','门':'Phm','来':'Heb','雅':'Jas','犹':'Jude','启':'Rev',
  // OT multi-char first
  '撒上':'1Sam','撒下':'2Sam','王上':'1Kgs','王下':'2Kgs',
  '代上':'1Chr','代下':'2Chr',
  // OT single-char
  '创':'Gen','出':'Exo','利':'Lev','民':'Num','申':'Deut',
  '书':'Josh','士':'Judg','得':'Ruth','拉':'Ezra','尼':'Neh',
  '斯':'Esth','伯':'Job','诗':'Ps','箴':'Prov','传':'Eccl','歌':'Song',
  '赛':'Isa','耶':'Jer','哀':'Lam','结':'Ezek','但':'Dan',
  '何':'Hos','珥':'Joel','摩':'Amos','俄':'Obad','拿':'Jonah',
  '弥':'Mic','鸿':'Nah','哈':'Hab','番':'Zeph','该':'Hag',
  '亚':'Zech','玛':'Mal',
};
// Pre-build regex: longest keys first so multi-char abbrs match before sub-sequences
const _zhAbbrRe = new RegExp(
  `(${Object.keys(ZH_BOOK_MAP).sort((a,b)=>b.length-a.length).join('|')})` +
  `(\\d+):(\\d+)(?:[–\\-～](\\d+))?`, 'g'
);

// ── Parse ZH cross-ref string (BB2 style: "太1:16　verse text") ───────────────
function parseZhRefTokens(content) {
  const tokens = [];
  let lastIdx = 0;
  _zhAbbrRe.lastIndex = 0;
  let m;
  while ((m = _zhAbbrRe.exec(content))) {
    if (m.index > lastIdx) tokens.push({ type: 'text', text: content.slice(lastIdx, m.index) });
    const abbr = ZH_BOOK_MAP[m[1]];
    if (abbr) {
      tokens.push({ type: 'ref', label: m[0], abbr,
        chapter: parseInt(m[2], 10),
        startVerse: parseInt(m[3], 10),
        endVerse: m[4] ? parseInt(m[4], 10) : parseInt(m[3], 10) });
    } else {
      tokens.push({ type: 'text', text: m[0] });
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < content.length) tokens.push({ type: 'text', text: content.slice(lastIdx) });
  return tokens;
}

// Detect if content is Chinese (CJK characters present)
const CJK_RE_DETECT = /[一-鿿㐀-䶿]/;

// ── Parse a cross-ref string into text + ref tokens ──────────────────────────
// e.g. "Luke 3:23-38; Gen. 5:1" → [{type:'ref',...}, {type:'text',...}, ...]
function parseRefTokens(content) {
  const re = /(?:(\d+)\s+)?([A-Z][A-Za-z]*(?:\.[A-Za-z]+)*\.?)\s+(\d+):(\d+)(?:\s*[-–]\s*(\d+))?/g;
  const tokens = [];
  let lastIdx = 0, m;
  while ((m = re.exec(content))) {
    if (m.index > lastIdx) tokens.push({ type: 'text', text: content.slice(lastIdx, m.index) });
    const numPrefix = m[1] ? m[1] + ' ' : '';
    const bookRaw = (numPrefix + m[2]).toLowerCase().replace(/\.+$/, '').trim();
    const abbr = REF_NAME_MAP[bookRaw];
    if (abbr) {
      tokens.push({ type: 'ref', label: m[0], abbr,
        chapter: parseInt(m[3], 10),
        startVerse: parseInt(m[4], 10),
        endVerse: m[5] ? parseInt(m[5], 10) : parseInt(m[4], 10) });
    } else {
      tokens.push({ type: 'text', text: m[0] });
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < content.length) tokens.push({ type: 'text', text: content.slice(lastIdx) });
  return tokens;
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
function RefContent({ content, lang: contentLang }) {
  const { pushPopup } = React.useContext(PopupContext);
  const [loading, setLoading] = useState({});

  // Determine if this content is Chinese
  const isZh = contentLang === 'zh' || contentLang === 'sc' || CJK_RE_DETECT.test(content);
  const tokens = useMemo(
    () => isZh ? parseZhRefTokens(content) : parseRefTokens(content),
    [content, isZh]
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
          <button key={i} className="bible-ref-link"
            onClick={() => handleRefClick(token, key)}
          >
            {token.label}{loading[key] ? ' …' : ''}
          </button>
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
  en: { nt: 'New Testament', ot: 'Old Testament', selectBook: 'Select a book to begin', loading: 'Loading…', parallel: '⇔ Parallel', noText: 'Text not available in this language.', chapters: 'CHAPTERS', verse: 'VERSE', text: 'Text:' },
  es: { nt: 'Nuevo Testamento', ot: 'Antiguo Testamento', selectBook: 'Selecciona un libro', loading: 'Cargando…', parallel: '⇔ Paralelo', noText: 'Texto no disponible.', chapters: 'CAPÍTULOS', verse: 'VERSÍCULO', text: 'Texto:' },
  zh: { nt: '新約', ot: '舊約', selectBook: '請選擇一本書', loading: '載入中…', parallel: '⇔ 對照', noText: '此語言暫無文字。', chapters: '章節選擇', verse: '節', text: '字體:' },
  sc: { nt: '新约', ot: '旧约', selectBook: '请选择一本书', loading: '载入中…', parallel: '⇔ 对照', noText: '此语言暂无文字。', chapters: '章节选择', verse: '节', text: '字体:' },
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

async function fetchChapterData(bookAbbr, chapter) {
  const { data, error } = await supabase
    .from('bible_chapters')
    .select('text_en,text_es,text_zh,text_sc,audio_en,audio_zh,audio_es')
    .eq('book_abbr', bookAbbr)
    .eq('chapter', chapter)
    .single();
  if (error) throw error;
  return data;
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
  const [fontSize, setFontSize]             = useState(18);
  const [parallelMode, setParallelMode]     = useState(false);
  const [parallelLangA, setParallelLangA]   = useState(() => lang || 'en');
  const [parallelLangB, setParallelLangB]   = useState('zh');
  const [mobileView, setMobileView]         = useState('books');

  // ── Admin refs mode ─────────────────────────────────────────────────────
  const isAdmin = sessionStorage.getItem('adminAuthed') === 'true';
  const [showRefs, setShowRefs]     = useState(false);
  const [refsMap, setRefsMap]       = useState({});    // { "verse_marker": {type,content} }
  const [markedTexts, setMarkedTexts] = useState({}); // { verseNum: markedString }
  const [popupStack, setPopupStack] = useState([]); // [{ id, kind, title, x, y, ... }]

  const mainRef        = useRef(null);
  const verseContentRef = useRef(null);

  // Push a new popup onto the stack, cascading position
  const pushPopup = useCallback((popup) => {
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
  }, []);

  const closePopup    = useCallback(id  => setPopupStack(prev => prev.filter(p => p.id !== id)), []);
  const closeAllPopups = useCallback(()  => setPopupStack([]), []);

  // Which refs lang is active for the current display/parallel state
  // null means the current lang has no refs (e.g. Spanish)
  const activeRefsLang = useMemo(() => {
    const baseLang = parallelMode ? parallelLangA : displayLang;
    if (baseLang === 'en' || baseLang === 'zh' || baseLang === 'sc') return baseLang;
    return null;
  }, [parallelMode, parallelLangA, displayLang]);

  const t = UI_TEXT[displayLang] || UI_TEXT.en;

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

  async function selectBook(abbr) {
    if (abbr === selectedBook) return;
    setSelectedBook(abbr);
    setSelectedChapter(null);
    setChapterData(null);
    setMobileView('chapters');
    try { setChapters(await fetchChaptersForBook(abbr)); }
    catch { setChapters([]); }
  }

  async function selectChapter(ch) {
    setSelectedChapter(ch);
    setChapterData(null);
    setChapterLoading(true);
    setMobileView('verses');
    // Scroll verse area to top
    setTimeout(() => verseContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    try { setChapterData(await fetchChapterData(selectedBook, ch)); }
    catch { setChapterData(null); }
    setChapterLoading(false);
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
    if (!showRefs || !selectedBook || !selectedChapter || !activeRefsLang) {
      setRefsMap({});
      setMarkedTexts({});
      return;
    }

    const markedCol =
      activeRefsLang === 'sc' ? 'text_sc_marked' :
      activeRefsLang === 'zh' ? 'text_zh_marked' :
      'text_en_marked';

    (async () => {
      // Fetch refs from bible_refs (filtered by lang)
      const { data: refs } = await supabase
        .from('bible_refs')
        .select('verse,marker,type,content')
        .eq('book_abbr', selectedBook)
        .eq('chapter', selectedChapter)
        .eq('lang', activeRefsLang);

      if (refs) {
        const map = {};
        refs.forEach(r => { map[`${r.verse}_${r.marker}`] = { type: r.type, content: r.content }; });
        setRefsMap(map);
      }

      // Fetch marked text column for this lang
      const { data: ch } = await supabase
        .from('bible_chapters')
        .select(markedCol)
        .eq('book_abbr', selectedBook)
        .eq('chapter', selectedChapter)
        .single();

      if (ch?.[markedCol]) {
        const parsed = {};
        ch[markedCol].split('\n').forEach(line => {
          const m = line.match(/^(\d+)\s+([\s\S]*)/);
          if (m) parsed[parseInt(m[1])] = m[2];
        });
        setMarkedTexts(parsed);
      } else {
        setMarkedTexts({});
      }
    })();
  }, [showRefs, selectedBook, selectedChapter, activeRefsLang]);

  // ── Marked text parser: "...[marker]word..." → React nodes ───────────────
  const parseMarkedText = useCallback((text, verseNum) => {
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
      const ref = refsMap[key];
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
              kind:        'note',
              title:       isLetter ? '📖 Cross-reference' : '📝 Footnote',
              content:     ref.content,
              contentLang: activeRefsLang || 'en',
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

  // ── Verse renderers ────────────────────────────────────────────────────────

  function renderVerses(text) {
    const verses = parseStoredVerses(text);
    if (verses.length === 0) return <p style={{ opacity: 0.5, padding: '12px 0' }}>{t.noText}</p>;
    return verses.map(({ verse, text: vt }) => {
      // In refs mode, use marked text if available
      const useMarked = showRefs && markedTexts[verse];
      const content   = useMarked ? parseMarkedText(markedTexts[verse], verse) : vt;
      return (
        <div id={`bible-verse-${verse}`} key={verse} style={{ display: 'flex', gap: '10px', marginBottom: '8px', lineHeight: 1.75, fontSize: fontSize + 'px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '22px', paddingTop: '4px', fontWeight: 600, flexShrink: 0 }}>
            {verse}
          </span>
          <span>{content}</span>
        </div>
      );
    });
  }

  function renderVersesParallel(textA, textB) {
    const versesA = parseStoredVerses(textA);
    if (versesA.length === 0) return <p style={{ opacity: 0.5 }}>{t.noText}</p>;
    const mapB = {};
    parseStoredVerses(textB).forEach(v => { mapB[v.verse] = v.text; });
    return versesA.map(({ verse, text: vt }) => {
      // activeRefsLang tracks parallelLangA — show refs on column A when available
      const contentA = (showRefs && activeRefsLang && markedTexts[verse])
        ? parseMarkedText(markedTexts[verse], verse) : vt;
      // Column B only shows refs if it happens to be the same lang as A
      const contentB = (showRefs && activeRefsLang && parallelLangB === parallelLangA && markedTexts[verse])
        ? parseMarkedText(markedTexts[verse], verse) : (mapB[verse] || '');
      return (
        <div id={`bible-verse-${verse}`} key={verse} className="parallel-row" style={{ marginBottom: '8px' }}>
          <div className="parallel-col" style={{ display: 'flex', gap: '10px', lineHeight: 1.75, fontSize: fontSize + 'px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '22px', paddingTop: '4px', fontWeight: 600, flexShrink: 0 }}>{verse}</span>
            <span>{contentA}</span>
          </div>
          <div className="parallel-col" style={{ display: 'flex', gap: '10px', lineHeight: 1.75, fontSize: fontSize + 'px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '22px', paddingTop: '4px', fontWeight: 600, flexShrink: 0 }}>{verse}</span>
            <span>{contentB}</span>
          </div>
        </div>
      );
    });
  }

  // Verse count for the jump strip
  const verseCount = useMemo(() => {
    if (!chapterData) return 0;
    const text = chapterData[`text_en`] || chapterData[`text_zh`] || '';
    return parseStoredVerses(text).length;
  }, [chapterData]);

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
    {/* ── Popup stack (fixed, cascaded) ──────────────────────── */}
    {popupStack.map((popup, idx) => (
      <div key={popup.id}
        className="bible-ref-popup"
        style={{ top: popup.y, left: popup.x, zIndex: 9999 + idx }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bible-ref-popup-header">
          <span className="bible-ref-popup-title">{popup.title}</span>
          <div className="bible-ref-popup-actions">
            {popupStack.length > 1 && (
              <button className="bible-ref-popup-closeall" onClick={closeAllPopups} title="Close all">✕ all</button>
            )}
            <button className="bible-ref-popup-close" onClick={() => closePopup(popup.id)}>✕</button>
          </div>
        </div>
        {/* Body */}
        <div className="bible-ref-popup-body">
          {popup.kind === 'note' && <RefContent content={popup.content} lang={popup.contentLang} />}
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
        </div>
      </div>
    ))}
    <div className="bible-layout">

      {/* ── Books sidebar ───────────────────────────────────── */}
      <div className={`bible-sidebar${mobileView !== 'books' ? ' bible-hidden-mobile' : ''}`}>
        <div className="bible-testament-label">{t.nt}</div>
        {ntBooks.map(abbr => (
          <button key={abbr} className={`bible-book-btn${selectedBook === abbr ? ' active' : ''}`} onClick={() => selectBook(abbr)}>
            {bookName(abbr)}
          </button>
        ))}
        <div className="bible-testament-label" style={{ marginTop: '8px' }}>{t.ot}</div>
        {otBooks.map(abbr => (
          <button key={abbr} className={`bible-book-btn${selectedBook === abbr ? ' active' : ''}`} onClick={() => selectBook(abbr)}>
            {bookName(abbr)}
          </button>
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

        {/* Book selected — chapters always visible at top */}
        {selectedBook && (
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

                      {/* Primary language selector */}
                      <select
                        className="parallel-lang-select"
                        value={parallelMode ? parallelLangA : displayLang}
                        onChange={e => {
                          if (parallelMode) setParallelLangA(e.target.value);
                          else setDisplayLang(e.target.value);
                        }}
                      >
                        {LANG_OPTIONS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                      </select>

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
                        {renderVersesParallel(chapterData?.[`text_${parallelLangA}`], chapterData?.[`text_${parallelLangB}`])}
                      </>
                    ) : (
                      renderVerses(chapterData?.[`text_${displayLang}`])
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </>
    </PopupContext.Provider>
  );
}

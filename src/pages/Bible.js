import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import { BOOK_NAMES, NT_BOOKS, OT_BOOKS } from '../utils/bibleBooks';

const LANG_OPTIONS = [
  { code: 'en',  label: '🇺🇸 English'      },
  { code: 'es',  label: '🇪🇸 Español'       },
  { code: 'zh',  label: '繁 Traditional'    },
  { code: 'sc',  label: '简 Simplified'     },
];

const UI_TEXT = {
  en: { nt: 'New Testament', ot: 'Old Testament', selectBook: 'Select a book to begin', loading: 'Loading…', parallel: '⇔ Parallel', noText: 'Text not available in this language.', chapters: 'CHAPTERS', verse: 'VERSE' },
  es: { nt: 'Nuevo Testamento', ot: 'Antiguo Testamento', selectBook: 'Selecciona un libro', loading: 'Cargando…', parallel: '⇔ Paralelo', noText: 'Texto no disponible.', chapters: 'CAPÍTULOS', verse: 'VERSÍCULO' },
  zh: { nt: '新約', ot: '舊約', selectBook: '請選擇一本書', loading: '載入中…', parallel: '⇔ 對照', noText: '此語言暫無文字。', chapters: '章節選擇', verse: '節' },
  sc: { nt: '新约', ot: '旧约', selectBook: '请选择一本书', loading: '载入中…', parallel: '⇔ 对照', noText: '此语言暂无文字。', chapters: '章节选择', verse: '节' },
};

function parseStoredVerses(text) {
  if (!text) return [];
  return text.split('\n')
    .map(line => { const m = line.match(/^(\d+)\s+(.*)/); return m ? { verse: parseInt(m[1], 10), text: m[2] } : null; })
    .filter(Boolean);
}

// ── Supabase queries ───────────────────────────────────────────────────────

async function fetchAvailableBooks() {
  const cacheKey = 'bibleBooks_v1';
  try { const c = sessionStorage.getItem(cacheKey); if (c) return JSON.parse(c); } catch (_) {}
  const { data, error } = await supabase.from('bible_chapters').select('book_abbr').order('book_abbr');
  if (error) throw error;
  const books = [...new Set(data.map(r => r.book_abbr))];
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
  const [parallelMode, setParallelMode]     = useState(false);
  const [parallelLangA, setParallelLangA]   = useState(() => lang || 'en');
  const [parallelLangB, setParallelLangB]   = useState('zh');
  const [mobileView, setMobileView]         = useState('books');

  const mainRef        = useRef(null);
  const verseContentRef = useRef(null);

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

  // ── Verse renderers ────────────────────────────────────────────────────────

  function renderVerses(text) {
    const verses = parseStoredVerses(text);
    if (verses.length === 0) return <p style={{ opacity: 0.5, padding: '12px 0' }}>{t.noText}</p>;
    return verses.map(({ verse, text: vt }) => (
      <div id={`bible-verse-${verse}`} key={verse} style={{ display: 'flex', gap: '10px', marginBottom: '8px', lineHeight: 1.75 }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '22px', paddingTop: '4px', fontWeight: 600, flexShrink: 0 }}>
          {verse}
        </span>
        <span>{vt}</span>
      </div>
    ));
  }

  function renderVersesParallel(textA, textB) {
    const versesA = parseStoredVerses(textA);
    if (versesA.length === 0) return <p style={{ opacity: 0.5 }}>{t.noText}</p>;
    const mapB = {};
    parseStoredVerses(textB).forEach(v => { mapB[v.verse] = v.text; });
    return versesA.map(({ verse, text: vt }) => (
      <div id={`bible-verse-${verse}`} key={verse} className="parallel-row" style={{ marginBottom: '8px' }}>
        <div className="parallel-col" style={{ display: 'flex', gap: '10px', lineHeight: 1.75 }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '22px', paddingTop: '4px', fontWeight: 600, flexShrink: 0 }}>{verse}</span>
          <span>{vt}</span>
        </div>
        <div className="parallel-col" style={{ display: 'flex', gap: '10px', lineHeight: 1.75 }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '22px', paddingTop: '4px', fontWeight: 600, flexShrink: 0 }}>{verse}</span>
          <span>{mapB[verse] || ''}</span>
        </div>
      </div>
    ));
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
                  <div className="bible-verse-box">
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
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { BOOK_NAMES, NT_BOOKS, OT_BOOKS } from '../utils/bibleBooks';

// ── Canonical book order ──────────────────────────────────────────────────
const BOOK_ORDER = [...NT_BOOKS, ...OT_BOOKS];
const BOOK_ORDER_MAP = Object.fromEntries(BOOK_ORDER.map((b, i) => [b, i]));

// ── Language auto-detection ───────────────────────────────────────────────
const CJK_RE     = /[一-鿿㐀-䶿\u{20000}-\u{2a6df}]/u;
const SPANISH_RE = /[áéíóúüñÁÉÍÓÚÜÑ¿¡]/;

function detectLang(q) {
  if (CJK_RE.test(q)) return 'zh';
  if (SPANISH_RE.test(q)) return 'es';
  return 'en';
}

const LANG_LABEL = { en: 'EN', zh: '繁', sc: '简', es: 'ES' };

// ── Helpers ───────────────────────────────────────────────────────────────
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function highlightText(text, query) {
  if (!query || !text) return text;
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="search-hl">{part}</mark>
      : part
  );
}

function parseVerses(text) {
  if (!text) return [];
  return text.split('\n').map(line => {
    const m = line.match(/^(\d+)\s+([\s\S]*)/);
    return m ? { verse: parseInt(m[1]), text: m[2] } : null;
  }).filter(Boolean);
}

function bookName(abbr, lang) {
  return BOOK_NAMES[abbr]?.[lang] || BOOK_NAMES[abbr]?.en || abbr;
}

function chapterLabel(n, lang) {
  return (lang === 'zh' || lang === 'sc') ? `第 ${n} 章` : `Ch. ${n}`;
}

// ── Component ─────────────────────────────────────────────────────────────
export default function SearchOverlay({ onClose }) {
  const [query, setQuery]           = useState('');
  const [groups, setGroups]         = useState([]);   // [{book_abbr, chapters, totalMatches, lang}]
  const [loading, setLoading]       = useState(false);
  const [searched, setSearched]     = useState(false);
  const [expandedBooks, setExpandedBooks]         = useState(new Set());
  const [expandedChapters, setExpandedChapters]   = useState(new Set());
  const [detectedLang, setDetectedLang] = useState('en');
  const debounceRef = useRef(null);
  const inputRef    = useRef(null);
  const overlayRef  = useRef(null);

  // Autofocus on open
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 60); }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Click outside to close
  useEffect(() => {
    const onClick = e => {
      if (overlayRef.current && !overlayRef.current.contains(e.target)) onClose();
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', onClick), 100);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', onClick); };
  }, [onClose]);

  const doSearch = useCallback(async (q) => {
    const lang = detectLang(q);
    setDetectedLang(lang);
    setLoading(true);
    setExpandedBooks(new Set());
    setExpandedChapters(new Set());

    const field = `text_${lang}`;

    // Paginate through ALL matching chapters (no limit cap)
    let all = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('bible_chapters')
        .select(`book_abbr,chapter,${field}`)
        .ilike(field, `%${q}%`)
        .range(from, from + 999);
      if (error) { console.error(error); break; }
      all = all.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }

    setLoading(false);
    setSearched(true);

    const lq = q.toLowerCase();

    // Parse verses and find matches for each chapter
    const qRe = new RegExp(escapeRegex(q), 'gi');
    const chapterResults = all.map(row => {
      const verses = parseVerses(row[field]);
      const matched = verses.filter(v => v.text.toLowerCase().includes(lq));
      const occurrences = matched.reduce((s, v) => s + (v.text.match(qRe) || []).length, 0);
      return { book_abbr: row.book_abbr, chapter: row.chapter, verses, matched, occurrences, lang };
    }).filter(r => r.matched.length > 0);

    // Group by book
    const bookMap = {};
    for (const r of chapterResults) {
      if (!bookMap[r.book_abbr]) bookMap[r.book_abbr] = [];
      bookMap[r.book_abbr].push(r);
    }

    // Sort books by canonical Bible order; chapters by number within each book
    const sorted = Object.entries(bookMap)
      .sort(([a], [b]) => {
        const ai = BOOK_ORDER_MAP[a] ?? 999;
        const bi = BOOK_ORDER_MAP[b] ?? 999;
        return ai - bi;
      })
      .map(([book_abbr, chapters]) => ({
        book_abbr,
        chapters: chapters.sort((a, b) => a.chapter - b.chapter),
        totalMatches: chapters.reduce((s, c) => s + c.matched.length, 0),
        totalOccurrences: chapters.reduce((s, c) => s + c.occurrences, 0),
        lang: chapters[0]?.lang || lang,
      }));

    setGroups(sorted);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setGroups([]); setSearched(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  function toggleBook(abbr) {
    setExpandedBooks(prev => {
      const next = new Set(prev);
      if (next.has(abbr)) next.delete(abbr); else next.add(abbr);
      return next;
    });
  }

  function toggleChapter(key) {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const totalChapters     = groups.reduce((s, g) => s + g.chapters.length, 0);
  const totalVerses       = groups.reduce((s, g) => s + g.totalMatches, 0);
  const totalOccurrences  = groups.reduce((s, g) => s + g.totalOccurrences, 0);

  return (
    <div className="search-overlay" ref={overlayRef}>
      {/* ── Search bar ──────────────────────────────────────────── */}
      <div className="search-overlay-bar">
        <span className="search-overlay-icon">🔍</span>
        <input
          ref={inputRef}
          className="search-overlay-input"
          type="text"
          placeholder="Search for…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          spellCheck={false}
        />
        {query && detectedLang && (
          <span className="search-lang-pill">{LANG_LABEL[detectedLang]}</span>
        )}
        <button className="search-overlay-close" onClick={onClose} aria-label="Close search">✕</button>
      </div>

      {/* ── Results ─────────────────────────────────────────────── */}
      {query.trim().length >= 2 && (
        <div className="search-overlay-results">
          {loading && (
            <div className="search-overlay-status">
              <div className="bible-loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            </div>
          )}

          {!loading && searched && groups.length === 0 && (
            <div className="search-overlay-status">No results for "{query}"</div>
          )}

          {!loading && groups.length > 0 && (
            <div className="search-overlay-count">
              {groups.length} book{groups.length !== 1 ? 's' : ''} ·{' '}
              {totalChapters} chapter{totalChapters !== 1 ? 's' : ''} ·{' '}
              {totalVerses} verse match{totalVerses !== 1 ? 'es' : ''}
              {totalOccurrences !== totalVerses && (
                <> · {totalOccurrences} appearance{totalOccurrences !== 1 ? 's' : ''}</>
              )}
            </div>
          )}

          {/* ── Tree: Book → Chapter → Verses ─────────────────── */}
          <div className="search-overlay-list">
            {groups.map(group => {
              const isBookOpen = expandedBooks.has(group.book_abbr);
              const lang = group.lang;

              return (
                <div key={group.book_abbr} className={`stree-book${isBookOpen ? ' open' : ''}`}>
                  {/* Book row */}
                  <div className="stree-book-header" onClick={() => toggleBook(group.book_abbr)}>
                    <span className={`stree-chevron${isBookOpen ? ' open' : ''}`}>›</span>
                    <span className="stree-book-name">{bookName(group.book_abbr, lang)}</span>
                    <span className="stree-book-meta">
                      {group.chapters.length} ch · {group.totalMatches} v
                    </span>
                  </div>

                  {isBookOpen && (
                    <div className="stree-chapters">
                      {group.chapters.map(ch => {
                        const chKey = `${group.book_abbr}-${ch.chapter}`;
                        const isChOpen = expandedChapters.has(chKey);

                        return (
                          <div key={chKey} className={`stree-ch-block${isChOpen ? ' open' : ''}`}>
                            {/* Chapter row */}
                            <div className="stree-ch-header" onClick={() => toggleChapter(chKey)}>
                              <span className={`stree-ch-chevron${isChOpen ? ' open' : ''}`}>›</span>
                              <span className="stree-ch-label">{chapterLabel(ch.chapter, lang)}</span>
                              <span className="stree-ch-badge">{ch.matched.length}</span>
                              {!isChOpen && ch.matched.slice(0, 1).map(v => (
                                <span key={v.verse} className="stree-ch-preview">
                                  <span className="stree-vnum-tiny">v{v.verse}</span>
                                  <span className="stree-preview-text">
                                    {highlightText(
                                      v.text.length > 90 ? v.text.slice(0, 90) + '…' : v.text,
                                      query
                                    )}
                                  </span>
                                </span>
                              ))}
                            </div>

                            {/* Expanded: full chapter */}
                            {isChOpen && (
                              <div className="stree-verse-list">
                                {ch.verses.map(v => {
                                  const isMatch = ch.matched.some(m => m.verse === v.verse);
                                  return (
                                    <div key={v.verse} className={`stree-verse${isMatch ? ' match' : ''}`}>
                                      <span className="stree-verse-n">{v.verse}</span>
                                      <span className="stree-verse-t">
                                        {isMatch ? highlightText(v.text, query) : v.text}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

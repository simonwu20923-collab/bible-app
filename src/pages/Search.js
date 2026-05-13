import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { BOOK_NAMES } from '../utils/bibleBooks';

const LANG_OPTIONS = [
  { code: 'en', label: '🇺🇸 English' },
  { code: 'zh', label: '繁 Traditional' },
  { code: 'sc', label: '简 Simplified' },
  { code: 'es', label: '🇪🇸 Español' },
];

const UI_TEXT = {
  en: { title: 'Bible Search', placeholder: 'Search the Bible…', searching: 'Searching…', noResults: q => `No results for "${q}"`, count: (c, v) => `${c} chapter${c !== 1 ? 's' : ''} · ${v} verse match${v !== 1 ? 'es' : ''}`, chapter: n => `Chapter ${n}`, match: n => `${n} match${n !== 1 ? 'es' : ''}`, more: n => `+${n} more…` },
  es: { title: 'Búsqueda Bíblica', placeholder: 'Buscar en la Biblia…', searching: 'Buscando…', noResults: q => `Sin resultados para "${q}"`, count: (c, v) => `${c} capítulo${c !== 1 ? 's' : ''} · ${v} versículo${v !== 1 ? 's' : ''}`, chapter: n => `Capítulo ${n}`, match: n => `${n}`, more: n => `+${n} más…` },
  zh: { title: '搜索聖經', placeholder: '搜索聖經文字…', searching: '搜索中…', noResults: q => `找不到「${q}」的結果`, count: (c, v) => `${c} 章 · ${v} 節符合`, chapter: n => `第 ${n} 章`, match: n => `${n} 個結果`, more: n => `另 ${n} 個…` },
  sc: { title: '搜索圣经', placeholder: '搜索圣经文字…', searching: '搜索中…', noResults: q => `找不到「${q}」的结果`, count: (c, v) => `${c} 章 · ${v} 节符合`, chapter: n => `第 ${n} 章`, match: n => `${n} 个结果`, more: n => `另 ${n} 个…` },
};

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

export default function Search({ lang }) {
  const [query, setQuery]         = useState('');
  const [searchLang, setSearchLang] = useState(lang || 'en');
  const [results, setResults]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [searched, setSearched]   = useState(false);
  const [expanded, setExpanded]   = useState(null);
  const debounceRef = useRef(null);
  const inputRef    = useRef(null);

  const t = UI_TEXT[searchLang] || UI_TEXT.en;

  // Re-search when language changes (if there's already a query)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearched(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, searchLang]); // eslint-disable-line react-hooks/exhaustive-deps

  async function doSearch(q) {
    setLoading(true);
    setExpanded(null);
    const field = `text_${searchLang}`;
    const { data, error } = await supabase
      .from('bible_chapters')
      .select(`book_abbr,chapter,${field}`)
      .ilike(field, `%${q}%`)
      .order('book_abbr')
      .order('chapter')
      .limit(100);
    setLoading(false);
    setSearched(true);
    if (error) { console.error(error); return; }

    const processed = data.map(row => {
      const verses = parseVerses(row[field]);
      const lq = q.toLowerCase();
      const matched = verses.filter(v => v.text.toLowerCase().includes(lq));
      return { book_abbr: row.book_abbr, chapter: row.chapter, verses, matched };
    });
    setResults(processed);
  }

  function clearSearch() {
    setQuery('');
    setResults([]);
    setSearched(false);
    setExpanded(null);
    inputRef.current?.focus();
  }

  function toggleExpand(idx) {
    setExpanded(prev => (prev === idx ? null : idx));
  }

  function bookName(abbr) {
    return BOOK_NAMES[abbr]?.[searchLang] || BOOK_NAMES[abbr]?.en || abbr;
  }

  const totalVerses = results.reduce((s, r) => s + r.matched.length, 0);

  return (
    <div className="search-page">

      {/* ── Sticky search header ─────────────────────────────── */}
      <div className="search-header">
        <div className="search-bar-wrap">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            placeholder={t.placeholder}
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            spellCheck={false}
          />
          {query && (
            <button className="search-clear-btn" onClick={clearSearch} aria-label="Clear">✕</button>
          )}
        </div>

        {/* Language tabs */}
        <div className="search-lang-tabs">
          {LANG_OPTIONS.map(l => (
            <button
              key={l.code}
              className={`search-lang-btn${searchLang === l.code ? ' active' : ''}`}
              onClick={() => setSearchLang(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────── */}
      <div className="search-body">

        {loading && (
          <div className="search-status">
            <div className="bible-loading-spinner" />
            <span>{t.searching}</span>
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="search-status search-no-results">
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔎</div>
            {t.noResults(query)}
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="search-count-row">
            {t.count(results.length, totalVerses)}
          </div>
        )}

        <div className="search-results-list">
          {results.map((result, idx) => {
            const isOpen = expanded === idx;
            return (
              <div key={`${result.book_abbr}-${result.chapter}`} className={`search-card${isOpen ? ' open' : ''}`}>

                {/* Card header — always visible */}
                <div className="search-card-header" onClick={() => toggleExpand(idx)}>
                  <div className="search-card-meta">
                    <span className="search-card-book">{bookName(result.book_abbr)}</span>
                    <span className="search-card-ch">{t.chapter(result.chapter)}</span>
                    <span className="search-card-badge">{t.match(result.matched.length)}</span>
                  </div>

                  {/* Verse snippets preview */}
                  <div className="search-card-snippets">
                    {result.matched.slice(0, 2).map(v => (
                      <div key={v.verse} className="search-snippet">
                        <span className="search-snippet-vnum">v{v.verse}</span>
                        <span className="search-snippet-text">
                          {highlightText(v.text, query)}
                        </span>
                      </div>
                    ))}
                    {result.matched.length > 2 && (
                      <div className="search-snippet-more">{t.more(result.matched.length - 2)}</div>
                    )}
                  </div>

                  <span className={`search-card-chevron${isOpen ? ' open' : ''}`}>›</span>
                </div>

                {/* Expanded chapter view */}
                {isOpen && (
                  <div className="search-card-chapter">
                    <div className="search-chapter-heading">
                      {bookName(result.book_abbr)} · {t.chapter(result.chapter)}
                    </div>
                    <div className="search-verse-list">
                      {result.verses.map(v => {
                        const isMatch = result.matched.some(m => m.verse === v.verse);
                        return (
                          <div key={v.verse} className={`search-verse-row${isMatch ? ' match' : ''}`}>
                            <span className="search-verse-num">{v.verse}</span>
                            <span className="search-verse-text">
                              {highlightText(v.text, query)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { BOOK_NAMES, NT_BOOKS, OT_BOOKS } from '../utils/bibleBooks';

const ADMIN_PIN = '12061';

const LANG_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: 'Traditional 繁' },
  { code: 'sc', label: 'Simplified 简' },
];

// ── Bible Data Manager ────────────────────────────────────────────────────────
function BibleDataAdmin() {
  const [bookAbbr, setBookAbbr] = useState('Gen');
  const [lang,     setLang]     = useState('en');
  const [subTab,   setSubTab]   = useState('intro'); // 'intro' | 'outline'

  // ── Intro state ─────────────────────────────────────────────────────────────
  const [intro,       setIntro]       = useState({});
  const [introId,     setIntroId]     = useState(null);
  const [introSaving, setIntroSaving] = useState(false);
  const [introMsg,    setIntroMsg]    = useState('');

  // ── Outline state ────────────────────────────────────────────────────────────
  const [rows,          setRows]          = useState([]);
  const [outlineSaving, setOutlineSaving] = useState(false);
  const [outlineMsg,    setOutlineMsg]    = useState('');

  // Reload both whenever book / lang changes
  const loadIntro = useCallback(async () => {
    setIntroMsg('');
    const { data } = await supabase
      .from('bible_book_intros').select('*')
      .eq('book_abbr', bookAbbr).eq('lang', lang).maybeSingle();
    if (data) {
      setIntroId(data.id);
      setIntro({
        author:               data.author               || '',
        time_of_writing:      data.time_of_writing      || '',
        place_of_writing:     data.place_of_writing     || '',
        time_period_covered:  data.time_period_covered  || '',
        subject:              data.subject              || '',
      });
    } else {
      setIntroId(null);
      setIntro({ author:'', time_of_writing:'', place_of_writing:'', time_period_covered:'', subject:'' });
    }
  }, [bookAbbr, lang]);

  const loadOutline = useCallback(async () => {
    setOutlineMsg('');
    const { data } = await supabase
      .from('bible_outlines').select('*')
      .eq('book_abbr', bookAbbr).eq('lang', lang).order('sort_order');
    setRows((data || []).map(r => ({ ...r, _key: r.id })));
  }, [bookAbbr, lang]);

  useEffect(() => { loadIntro(); loadOutline(); }, [loadIntro, loadOutline]);

  // ── Intro CRUD ───────────────────────────────────────────────────────────────
  async function saveIntro() {
    setIntroSaving(true); setIntroMsg('');
    const payload = { book_abbr: bookAbbr, lang, ...intro };
    let err;
    if (introId) {
      ({ error: err } = await supabase.from('bible_book_intros').update(payload).eq('id', introId));
    } else {
      const { data, error } = await supabase.from('bible_book_intros').insert(payload).select().single();
      err = error;
      if (data) setIntroId(data.id);
    }
    setIntroMsg(err ? '❌ ' + err.message : '✅ Saved!');
    setIntroSaving(false);
  }

  function exportIntroSQL() {
    const esc = s => (s || '').replace(/'/g, "''");
    const sql =
      `INSERT INTO bible_book_intros (book_abbr, lang, author, time_of_writing, place_of_writing, time_period_covered, subject)\n` +
      `VALUES (\n` +
      `  '${bookAbbr}', '${lang}',\n` +
      `  '${esc(intro.author)}',\n` +
      `  '${esc(intro.time_of_writing)}',\n` +
      `  '${esc(intro.place_of_writing)}',\n` +
      `  '${esc(intro.time_period_covered)}',\n` +
      `  '${esc(intro.subject)}'\n` +
      `) ON CONFLICT (book_abbr, lang) DO UPDATE SET\n` +
      `  author = EXCLUDED.author,\n` +
      `  time_of_writing = EXCLUDED.time_of_writing,\n` +
      `  place_of_writing = EXCLUDED.place_of_writing,\n` +
      `  time_period_covered = EXCLUDED.time_period_covered,\n` +
      `  subject = EXCLUDED.subject;`;
    navigator.clipboard.writeText(sql);
    setIntroMsg('✅ SQL copied to clipboard!');
  }

  // ── Outline CRUD ─────────────────────────────────────────────────────────────
  function addRow() {
    const key = 'new_' + Date.now();
    setRows(prev => [...prev, {
      _key: key, level: 1, prefix: '', title: '',
      start_chapter: '', start_verse: '', end_chapter: '', end_verse: '',
    }]);
  }

  function updateRow(key, field, value) {
    setRows(prev => prev.map(r => r._key === key ? { ...r, [field]: value } : r));
  }

  function deleteRow(key) {
    setRows(prev => prev.filter(r => r._key !== key));
  }

  function moveRow(key, dir) {
    setRows(prev => {
      const idx = prev.findIndex(r => r._key === key);
      if (idx < 0) return prev;
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function saveOutline() {
    setOutlineSaving(true); setOutlineMsg('');
    // Delete all existing rows for this book+lang, then re-insert
    const { error: delErr } = await supabase
      .from('bible_outlines').delete()
      .eq('book_abbr', bookAbbr).eq('lang', lang);
    if (delErr) { setOutlineMsg('❌ ' + delErr.message); setOutlineSaving(false); return; }

    if (rows.length > 0) {
      const payload = rows.map((r, i) => ({
        book_abbr:     bookAbbr,
        lang,
        sort_order:    i + 1,
        level:         parseInt(r.level)         || 1,
        prefix:        r.prefix                  || null,
        title:         r.title                   || '',
        start_chapter: r.start_chapter ? parseInt(r.start_chapter) : null,
        start_verse:   r.start_verse   ? parseInt(r.start_verse)   : null,
        end_chapter:   r.end_chapter   ? parseInt(r.end_chapter)   : null,
        end_verse:     r.end_verse     ? parseInt(r.end_verse)     : null,
      }));
      const { error: insErr } = await supabase.from('bible_outlines').insert(payload);
      if (insErr) { setOutlineMsg('❌ ' + insErr.message); setOutlineSaving(false); return; }
    }
    setOutlineMsg('✅ Saved!');
    await loadOutline();
    setOutlineSaving(false);
  }

  function exportOutlineSQL() {
    if (rows.length === 0) { setOutlineMsg('⚠️ No rows to export.'); return; }
    const esc = s => (s || '').replace(/'/g, "''");
    const n   = v => (v === '' || v === null || v === undefined) ? 'NULL' : parseInt(v);
    const vals = rows.map((r, i) =>
      `  ('${bookAbbr}','${lang}',${i+1},${parseInt(r.level)||1},` +
      `'${esc(r.prefix)}','${esc(r.title)}',` +
      `${n(r.start_chapter)},${n(r.start_verse)},${n(r.end_chapter)},${n(r.end_verse)})`
    ).join(',\n');
    const sql =
      `-- ${BOOK_NAMES[bookAbbr]?.en || bookAbbr} outline (${lang}) — ${rows.length} rows\n` +
      `DELETE FROM bible_outlines WHERE book_abbr = '${bookAbbr}' AND lang = '${lang}';\n` +
      `INSERT INTO bible_outlines\n` +
      `  (book_abbr, lang, sort_order, level, prefix, title,\n` +
      `   start_chapter, start_verse, end_chapter, end_verse)\n` +
      `VALUES\n${vals};`;
    navigator.clipboard.writeText(sql);
    setOutlineMsg('✅ SQL copied to clipboard!');
  }

  const bookName = abbr => BOOK_NAMES[abbr]?.en || abbr;
  const LEVEL_COLORS = ['','#a78bfa','#7cb4d4','#6ee7b7','#fbbf24','#f87171'];

  return (
    <div className="bible-admin">
      {/* ── Selectors ── */}
      <div className="bible-admin-top">
        <select value={bookAbbr} onChange={e => setBookAbbr(e.target.value)} className="admin-select">
          <optgroup label="── New Testament ──">
            {NT_BOOKS.map(a => <option key={a} value={a}>{bookName(a)}</option>)}
          </optgroup>
          <optgroup label="── Old Testament ──">
            {OT_BOOKS.map(a => <option key={a} value={a}>{bookName(a)}</option>)}
          </optgroup>
        </select>
        <select value={lang} onChange={e => setLang(e.target.value)} className="admin-select">
          {LANG_OPTIONS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        <div className="bible-admin-subtabs">
          <button className={`ba-subtab${subTab==='intro'?' active':''}`} onClick={() => setSubTab('intro')}>
            📝 Introduction
          </button>
          <button className={`ba-subtab${subTab==='outline'?' active':''}`} onClick={() => setSubTab('outline')}>
            📋 Outline ({rows.length} rows)
          </button>
        </div>
      </div>

      {/* ── Introduction editor ── */}
      {subTab === 'intro' && (
        <div className="ba-intro-editor">
          {[
            ['author',              'Author'],
            ['time_of_writing',     'Time of Writing'],
            ['place_of_writing',    'Place of Writing'],
            ['time_period_covered', 'Time Period Covered'],
            ['subject',             'Subject'],
          ].map(([key, label]) => (
            <div key={key} className="ba-field">
              <label className="ba-label">{label}</label>
              <textarea
                className="ba-textarea"
                rows={key === 'subject' ? 2 : 3}
                value={intro[key] || ''}
                onChange={e => setIntro(p => ({ ...p, [key]: e.target.value }))}
                placeholder={`Enter ${label.toLowerCase()}…`}
              />
            </div>
          ))}
          <div className="ba-actions">
            <button className="ba-btn ba-btn-save" onClick={saveIntro} disabled={introSaving}>
              {introSaving ? 'Saving…' : '💾 Save'}
            </button>
            <button className="ba-btn ba-btn-export" onClick={exportIntroSQL}>
              📋 Copy SQL
            </button>
            {introMsg && <span className="ba-msg">{introMsg}</span>}
          </div>
        </div>
      )}

      {/* ── Outline editor ── */}
      {subTab === 'outline' && (
        <div className="ba-outline-editor">
          {/* Column header */}
          <div className="ba-row ba-row-header">
            <span className="ba-cell-lv">Lv</span>
            <span className="ba-cell-pfx">Prefix</span>
            <span className="ba-cell-title">Title</span>
            <span className="ba-cell-num">S.Ch</span>
            <span className="ba-cell-num">S.V</span>
            <span className="ba-cell-num">E.Ch</span>
            <span className="ba-cell-num">E.V</span>
            <span className="ba-cell-act"></span>
          </div>

          {rows.length === 0 && (
            <div className="ba-empty">No rows yet — click ＋ Add Row to start.</div>
          )}

          {rows.map((r, idx) => (
            <div key={r._key} className="ba-row"
              style={{ borderLeft: `3px solid ${LEVEL_COLORS[Math.min(r.level||1,5)] || '#555'}`,
                       paddingLeft: ((parseInt(r.level)||1) - 1) * 10 + 4 + 'px' }}>
              <input type="number" min={1} max={5}
                className="ba-input ba-cell-lv"
                value={r.level || 1}
                onChange={e => updateRow(r._key, 'level', e.target.value)} />
              <input type="text"
                className="ba-input ba-cell-pfx"
                value={r.prefix || ''}
                placeholder="I."
                onChange={e => updateRow(r._key, 'prefix', e.target.value)} />
              <input type="text"
                className="ba-input ba-cell-title"
                value={r.title || ''}
                placeholder="Title…"
                onChange={e => updateRow(r._key, 'title', e.target.value)} />
              <input type="number"
                className="ba-input ba-cell-num"
                value={r.start_chapter || ''}
                placeholder="—"
                onChange={e => updateRow(r._key, 'start_chapter', e.target.value)} />
              <input type="number"
                className="ba-input ba-cell-num"
                value={r.start_verse || ''}
                placeholder="—"
                onChange={e => updateRow(r._key, 'start_verse', e.target.value)} />
              <input type="number"
                className="ba-input ba-cell-num"
                value={r.end_chapter || ''}
                placeholder="—"
                onChange={e => updateRow(r._key, 'end_chapter', e.target.value)} />
              <input type="number"
                className="ba-input ba-cell-num"
                value={r.end_verse || ''}
                placeholder="—"
                onChange={e => updateRow(r._key, 'end_verse', e.target.value)} />
              <div className="ba-cell-act">
                <button className="ba-icon-btn" onClick={() => moveRow(r._key, -1)} disabled={idx === 0} title="Move up">↑</button>
                <button className="ba-icon-btn" onClick={() => moveRow(r._key, 1)} disabled={idx === rows.length - 1} title="Move down">↓</button>
                <button className="ba-icon-btn ba-icon-del" onClick={() => deleteRow(r._key)} title="Delete">✕</button>
              </div>
            </div>
          ))}

          <div className="ba-actions">
            <button className="ba-btn ba-btn-add" onClick={addRow}>＋ Add Row</button>
            <button className="ba-btn ba-btn-save" onClick={saveOutline} disabled={outlineSaving}>
              {outlineSaving ? 'Saving…' : '💾 Save All'}
            </button>
            <button className="ba-btn ba-btn-export" onClick={exportOutlineSQL} title="Copy SQL INSERT to clipboard">
              📋 Copy SQL
            </button>
            {outlineMsg && <span className="ba-msg">{outlineMsg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Admin component ──────────────────────────────────────────────────────
export default function Admin() {
  const [pin,          setPin]          = useState('');
  const [authed,       setAuthed]       = useState(() => sessionStorage.getItem('adminAuthed') === 'true');
  const [pinError,     setPinError]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [data,         setData]         = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [mainTab,      setMainTab]      = useState('checkins'); // 'checkins' | 'bible'

  useEffect(() => { if (authed) loadAdminData(); }, [authed, selectedDate]);

  function handlePin() {
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem('adminAuthed', 'true');
      setAuthed(true);
    } else {
      setPinError(true);
      setPin('');
    }
  }

  async function loadAdminData() {
    setLoading(true);
    // Supabase default row limit is 1000 — paginate to get all check-ins
    const PAGE = 1000;
    let all = [];
    let page = 0;
    while (true) {
      const { data: batch } = await supabase
        .from('checkins').select('name, date, portion, created_at')
        .order('created_at', { ascending: false })
        .range(page * PAGE, (page + 1) * PAGE - 1);
      if (!batch || batch.length === 0) break;
      all = all.concat(batch);
      if (batch.length < PAGE) break;
      page++;
    }
    if (all.length === 0) { setLoading(false); return; }

    const today = new Date().toISOString().split('T')[0];
    const todayCheckins = all.filter(r => r.date === selectedDate);
    const todayMap = {};
    todayCheckins.forEach(r => {
      const key = r.name.toLowerCase();
      if (!todayMap[key]) todayMap[key] = { name: r.name, nt: false, ot: false };
      if (r.portion === 'NT') todayMap[key].nt = true;
      if (r.portion === 'OT') todayMap[key].ot = true;
    });

    const peopleMap = {};
    all.forEach(r => {
      const key = r.name.toLowerCase();
      if (!peopleMap[key]) peopleMap[key] = { name: r.name, dates: {}, lastDate: null };
      if (!peopleMap[key].dates[r.date]) peopleMap[key].dates[r.date] = { nt: false, ot: false };
      if (r.portion === 'NT') peopleMap[key].dates[r.date].nt = true;
      if (r.portion === 'OT') peopleMap[key].dates[r.date].ot = true;
      if (!peopleMap[key].lastDate || r.date > peopleMap[key].lastDate) peopleMap[key].lastDate = r.date;
    });

    const topReaders = Object.values(peopleMap).map(p => {
      const fullDays  = Object.values(p.dates).filter(d => d.nt && d.ot).length;
      const totalDays = Object.keys(p.dates).length;
      return { name: p.name, fullDays, totalDays, lastDate: p.lastDate };
    }).sort((a, b) => b.fullDays - a.fullDays || b.totalDays - a.totalDays);

    const inactive = Object.values(peopleMap).map(p => {
      const daysAgo = Math.floor((new Date(today) - new Date(p.lastDate)) / (1000 * 60 * 60 * 24));
      return { name: p.name, lastDate: p.lastDate, daysAgo };
    }).filter(p => p.daysAgo >= 3).sort((a, b) => b.daysAgo - a.daysAgo);

    setData({ totalCheckins: all.length, uniqueUsers: Object.keys(peopleMap).length,
               todayReaders: Object.values(todayMap), topReaders: topReaders.slice(0,10), inactive });
    setLoading(false);
  }

  // ── PIN gate ─────────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="page">
        <div className="welcome-card">
          <div className="welcome-emoji">🔐</div>
          <h1>Admin Access</h1>
          <p className="welcome-sub">Enter PIN to continue</p>
          <div className="name-input-row">
            <input className="name-input" type="password" placeholder="Enter PIN…"
              value={pin}
              onChange={e => { setPin(e.target.value); setPinError(false); }}
              onKeyDown={e => e.key === 'Enter' && handlePin()} />
            <button className="start-btn" onClick={handlePin}>Enter →</button>
          </div>
          {pinError && <p style={{color:'#f87171',marginTop:'12px'}}>Incorrect PIN</p>}
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-main-tabs">
          <button className={`admin-main-tab${mainTab==='checkins'?' active':''}`} onClick={() => setMainTab('checkins')}>
            📊 Check-ins
          </button>
          <button className={`admin-main-tab${mainTab==='bible'?' active':''}`} onClick={() => setMainTab('bible')}>
            📖 Bible Data
          </button>
        </div>
      </div>

      {/* ── Check-ins tab ── */}
      {mainTab === 'checkins' && (
        <>
          {(loading || !data) ? (
            <div className="loading">Loading admin data…</div>
          ) : (
            <>
              <div className="admin-date-picker" style={{marginBottom:16}}>
                <input type="date" value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)} className="date-input" />
              </div>
              <div className="stats-row" style={{marginBottom:'24px'}}>
                <div className="stat-card"><div className="stat-number">{data.uniqueUsers}</div><div className="stat-label">Total Users</div></div>
                <div className="stat-card"><div className="stat-number">{data.totalCheckins}</div><div className="stat-label">Total Check-ins</div></div>
                <div className="stat-card"><div className="stat-number">{data.todayReaders.length}</div><div className="stat-label">Read on {selectedDate}</div></div>
              </div>
              <div className="admin-grid">
                <div className="admin-card">
                  <div className="admin-card-title">📅 Readers on {selectedDate} ({data.todayReaders.length})</div>
                  {data.todayReaders.length === 0 ? <div className="lb-empty">No check-ins on this date</div> : (
                    <div className="readers-table">
                      <div className="readers-header"><span>Name</span><span>NT</span><span>OT</span></div>
                      {data.todayReaders.map(r => (
                        <div className="readers-row" key={r.name}>
                          <span>{r.name}</span>
                          <span>{r.nt ? <span className="check-nt">✓</span> : '—'}</span>
                          <span>{r.ot ? <span className="check-ot">✓</span> : '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="admin-card">
                  <div className="admin-card-title">⭐ Top Readers (All Time)</div>
                  {data.topReaders.map((r, i) => (
                    <div className="lb-row" key={r.name}>
                      <span className="lb-rank">{i+1}</span>
                      <span className="lb-name">{r.name}</span>
                      <span className="lb-score">{r.fullDays} full · {r.totalDays} days</span>
                    </div>
                  ))}
                </div>
                <div className="admin-card admin-card-full">
                  <div className="admin-card-title">⚠️ Haven't Read in 3+ Days ({data.inactive.length})</div>
                  {data.inactive.length === 0 ? <div className="lb-empty">Everyone is on track! 🎉</div> : (
                    <div className="readers-table">
                      <div className="readers-header" style={{gridTemplateColumns:'1fr 140px 100px'}}>
                        <span>Name</span><span>Last Read</span><span>Days Ago</span>
                      </div>
                      {data.inactive.map(r => (
                        <div className="readers-row" key={r.name} style={{gridTemplateColumns:'1fr 140px 100px'}}>
                          <span>{r.name}</span>
                          <span>{r.lastDate}</span>
                          <span style={{color: r.daysAgo >= 7 ? '#f87171' : '#fbbf24'}}>{r.daysAgo} days</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Bible Data tab ── */}
      {mainTab === 'bible' && <BibleDataAdmin />}
    </div>
  );
}

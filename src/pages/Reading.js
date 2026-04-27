import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { getReadingForDate } from '../data/schedule';
import AudioPlayer from '../components/AudioPlayer';

export default function Reading() {
  const [searchParams, setSearchParams] = useSearchParams();
  const todayStr = new Date().toISOString().split('T')[0];
  const currentDate = searchParams.get('date') || todayStr;

  const dateLabel = new Date(currentDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const startOfYear = new Date(new Date(currentDate).getFullYear(), 0, 0);
  const dayOfYear = Math.floor((new Date(currentDate + 'T12:00:00') - startOfYear) / 86400000);

  const reading = getReadingForDate(currentDate);

  const [lang, setLang] = React.useState(() => localStorage.getItem('bibleAppLang') || 'en');
  const [name, setName] = React.useState(() => localStorage.getItem('bibleAppName') || '');
  const [nameInput, setNameInput] = React.useState('');
  const [ntDone, setNtDone] = React.useState(false);
  const [otDone, setOtDone] = React.useState(false);
  const [saving, setSaving] = React.useState('');
  const [todayReaders, setTodayReaders] = React.useState([]);
  const [bannerItems, setBannerItems] = React.useState([]);
  const [verses, setVerses] = React.useState(null);
  const [showNT, setShowNT] = React.useState(true);
  const [showOT, setShowOT] = React.useState(true);
  const [fontSize, setFontSize] = React.useState(18);
  const [comments, setComments] = React.useState([]);
  const [commentName, setCommentName] = React.useState(() => localStorage.getItem('bibleAppName') || '');
  const [commentText, setCommentText] = React.useState('');
  const [posting, setPosting] = React.useState(false);

  // Save language preference
  function changeLang(l) {
    setLang(l);
    localStorage.setItem('bibleAppLang', l);
  }

  React.useEffect(() => {
    setNtDone(false); setOtDone(false);
    setShowNT(true); setShowOT(true);
    setVerses(null); setTodayReaders([]); setBannerItems([]);
    loadVerses();
    loadComments();
    if (name) loadReaders(name);
  }, [currentDate]);

  async function loadVerses() {
    const { data } = await supabase.from('verses')
      .select('nt_title,nt_text,ot_title,ot_text,nt_audio,ot_audio,nt_text_es,ot_text_es,nt_text_zh,ot_text_zh')
      .eq('date', currentDate).single();
    if (data) setVerses(data);
  }

  async function loadReaders(n) {
    const { data } = await supabase.from('checkins')
      .select('name,portion,created_at')
      .eq('date', currentDate)
      .order('created_at', { ascending: true });
    if (!data) return;

    if (n) {
      const my = data.filter(r => r.name.toLowerCase() === n.toLowerCase());
      if (my.some(r => r.portion === 'NT')) setNtDone(true);
      if (my.some(r => r.portion === 'OT')) setOtDone(true);
    }

    const map = {};
    data.forEach(r => {
      const k = r.name.toLowerCase();
      if (!map[k]) map[k] = { name: r.name, nt: false, ot: false };
      if (r.portion === 'NT') map[k].nt = true;
      if (r.portion === 'OT') map[k].ot = true;
    });
    setTodayReaders(Object.values(map));

    const recent = [...data].reverse().slice(0, 8);
    setBannerItems(recent.map(r => ({
      name: r.name, portion: r.portion, time: timeAgo(r.created_at)
    })));
  }

  async function loadComments() {
    const { data } = await supabase.from('comments')
      .select('id,name,text,created_at')
      .eq('date', currentDate)
      .order('created_at', { ascending: false });
    if (data) setComments(data);
  }

  function timeAgo(ts) {
    const m = Math.floor((Date.now() - new Date(ts)) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  function changeDate(days) {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    const nd = d.toISOString().split('T')[0];
    setSearchParams(nd === todayStr ? {} : { date: nd });
  }

  async function handleCheckin(portion, done, setDone) {
    if (done || saving || !name) return;
    setSaving(portion);
    const { data: ex } = await supabase.from('checkins').select('id')
      .eq('date', currentDate).eq('portion', portion).ilike('name', name);
    if (ex && ex.length > 0) { setDone(true); setSaving(''); return; }
    const { error } = await supabase.from('checkins').insert({ name, date: currentDate, portion });
    if (!error) { setDone(true); loadReaders(name); }
    setSaving('');
  }

  async function postComment() {
    if (!commentText.trim() || !commentName.trim() || posting) return;
    setPosting(true);
    const { error } = await supabase.from('comments').insert({
      date: currentDate, name: commentName.trim(), text: commentText.trim()
    });
    if (!error) {
      setCommentText('');
      localStorage.setItem('bibleAppName', commentName.trim());
      loadComments();
    }
    setPosting(false);
  }

  function saveName() {
    if (nameInput.trim()) {
      localStorage.setItem('bibleAppName', nameInput.trim());
      setName(nameInput.trim());
      setCommentName(nameInput.trim());
    }
  }

  // Get the right text based on current language
  function getNtText() {
    if (!verses) return null;
    if (lang === 'es' && verses.nt_text_es) return verses.nt_text_es;
    if (lang === 'zh' && verses.nt_text_zh) return verses.nt_text_zh;
    return verses.nt_text;
  }

  function getOtText() {
    if (!verses) return null;
    if (lang === 'es' && verses.ot_text_es) return verses.ot_text_es;
    if (lang === 'zh' && verses.ot_text_zh) return verses.ot_text_zh;
    return verses.ot_text;
  }

  function formatVerses(text) {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      // Match lines like "Mt 1 :1 text" (English format)
      const mEn = line.match(/^([A-Z][a-z]+ \d+ :\d+)\s+(.*)/);
      if (mEn) return (
        <p key={i} className="verse-line" style={{ fontSize: fontSize + 'px' }}>
          <span className="verse-ref">{mEn[1]}</span>
          <span className="verse-body"> {mEn[2]}</span>
        </p>
      );
      // Match lines like "Mt. 1:1 text" or "創 1:1 text" (Spanish/Chinese format)
      const mOther = line.match(/^([\w\u4e00-\u9fff]+\.?\s*\d+:\d+)\s+(.*)/);
      if (mOther) return (
        <p key={i} className="verse-line" style={{ fontSize: fontSize + 'px' }}>
          <span className="verse-ref">{mOther[1]}</span>
          <span className="verse-body"> {mOther[2]}</span>
        </p>
      );
      return line ? <p key={i} className="verse-line" style={{ fontSize: fontSize + 'px' }}>{line}</p> : null;
    });
  }

  // Language availability indicators
  function langAvailable(l) {
    if (!verses) return false;
    if (l === 'en') return true;
    if (l === 'es') return !!(verses.nt_text_es || verses.ot_text_es);
    if (l === 'zh') return !!(verses.nt_text_zh || verses.ot_text_zh);
    return false;
  }

  if (!name) {
    return (
      <div className="page">
        <div className="welcome-card">
          <div className="welcome-emoji">📖</div>
          <h1>What's your name?</h1>
          <p className="welcome-sub">So we can track your reading</p>
          <div className="name-input-row">
            <input className="name-input" placeholder="Enter your name..."
              value={nameInput} onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()} />
            <button className="start-btn" onClick={saveName}>Save →</button>
          </div>
        </div>
      </div>
    );
  }

  const bannerContent = [...bannerItems, ...bannerItems];
  const dateShort = currentDate.slice(5).replace('-', '/');
  function getTitle(englishTitle, portion) {
  if (!englishTitle) return englishTitle;
  if (lang === 'en') return englishTitle;
  
  if (lang === 'es') {
    return englishTitle
      .replace('New Testament', 'Nuevo Testamento')
      .replace('Old Testament', 'Antiguo Testamento');
  }
  
  if (lang === 'zh') {
    return englishTitle
      .replace('New Testament', '新約')
      .replace('Old Testament', '舊約')
      .replace('Matthew', '太').replace('Mark', '可')
      .replace('Luke', '路').replace('John', '約')
      .replace('Acts', '徒').replace('Romans', '羅')
      .replace('Genesis', '創').replace('Exodus', '出')
      .replace('Leviticus', '利').replace('Numbers', '民')
      .replace('Deuteronomy', '申').replace('Joshua', '書')
      .replace('Judges', '士').replace('Psalms', '詩')
      .replace('Proverbs', '箴').replace('Isaiah', '賽')
      .replace('Jeremiah', '耶').replace('Ezekiel', '結')
      .replace('Daniel', '但').replace('Revelation', '啟')
      .replace('1 Samuel', '撒上').replace('2 Samuel', '撒下')
      .replace('1 Kings', '王上').replace('2 Kings', '王下')
      .replace('1 Corinthians', '林前').replace('2 Corinthians', '林後')
      .replace('Galatians', '加').replace('Ephesians', '弗')
      .replace('Philippians', '腓').replace('Colossians', '西')
      .replace('Hebrews', '來').replace('James', '雅')
      .replace('1 Peter', '彼前').replace('2 Peter', '彼後')
      .replace('1 John', '約壹').replace('Jude', '猶')
      .replace(' - ', ' - ');
  }
  return englishTitle;
}
  return (
    <>
      {bannerItems.length > 0 && (
        <div className="sticky-banner">
          <div className="banner-track">
            {bannerContent.map((r, i) => (
              <span key={i} className="banner-item">
                <span className={r.portion === 'NT' ? 'banner-nt' : 'banner-ot'}>{r.name}</span>
                {' '}finished {r.portion} ({dateShort}) {r.time}
                <span className="banner-sep"> • </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="page reading-page-content">
        <div className="date-nav">
          <button className="nav-arrow" onClick={() => changeDate(-1)}>←</button>
          <div className="date-nav-center">
            <div className="reading-date-label">{dateLabel}</div>
            <div className="reading-day-count">Day {dayOfYear} of 365</div>
          </div>
          <button className="nav-arrow" onClick={() => changeDate(1)}>→</button>
        </div>

        <div className="reading-meta-row">
          <span className="readers-count-pill">
            {todayReaders.length} {todayReaders.length === 1 ? 'person has' : 'people have'} read today
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Language Toggle */}
            <div className="lang-toggle">
              {[
                { code: 'en', label: '🇺🇸 EN' },
                { code: 'es', label: '🇪🇸 ES' },
                { code: 'zh', label: '🇨🇳 中文' },
              ].map(({ code, label }) => (
                <button
                  key={code}
                  className={`lang-btn ${lang === code ? 'lang-btn-active' : ''} ${!langAvailable(code) ? 'lang-btn-unavailable' : ''}`}
                  onClick={() => langAvailable(code) && changeLang(code)}
                  title={!langAvailable(code) ? 'Not yet available' : ''}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Font Size */}
            <div className="font-size-row">
              <span>Text:</span>
              <button className="font-btn" onClick={() => setFontSize(f => Math.max(12, f - 2))}>A−</button>
              <button className="font-btn" onClick={() => setFontSize(18)}>A</button>
              <button className="font-btn" onClick={() => setFontSize(f => Math.min(26, f + 2))}>A+</button>
            </div>
          </div>
        </div>

        <div className="reading-cards">
          {/* NT Card */}
          <div className={`reading-card ${ntDone ? 'done' : ''}`}>
            <div className="reading-card-header">
              <span className="reading-tag nt-tag">NT</span>
              <span className="reading-portion">{reading.nt}</span>
            </div>
            {verses?.nt_audio && (
              <AudioPlayer
                label="NT Audio"
                book={verses.nt_title?.replace(/New Testament - /, '').replace(/\s[\d:~]+.*/, '').trim() || 'NT'}
                audioJson={verses.nt_audio}
                startChap={parseInt(verses.nt_title?.match(/(\d+):/)?.[1] || '1', 10)}
              />
            )}
            <button className="verses-toggle" onClick={() => setShowNT(!showNT)}>
              {showNT ? '▲ Hide verses' : '▼ Read verses'}
            </button>
            {showNT && (
              <div className="verses-box">
                {verses ? (
                  <>
                    <div className="verses-title">{getTitle(verses.nt_title)}</div>
                    <div className="verses-text">{formatVerses(getNtText())}</div>
                    {lang !== 'en' && !langAvailable(lang) && (
                      <div className="lang-unavailable-msg">
                        {lang === 'zh' ? '中文版本即将推出' : 'Versión en español próximamente'}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="loading">Loading...</div>
                )}
              </div>
            )}
            <button className={`checkin-btn ${ntDone ? 'checked' : ''}`}
              onClick={() => handleCheckin('NT', ntDone, setNtDone)}
              disabled={ntDone || !!saving}>
              {saving === 'NT' ? 'Saving...' : ntDone ? '✓ Finished NT' : 'Finish NT'}
            </button>
          </div>

          {/* OT Card */}
          <div className={`reading-card ${otDone ? 'done' : ''}`}>
            <div className="reading-card-header">
              <span className="reading-tag ot-tag">OT</span>
              <span className="reading-portion">{reading.ot}</span>
            </div>
            {verses?.ot_audio && (
              <AudioPlayer
                label="OT Audio"
                book={verses.ot_title?.replace(/Old Testament - /, '').replace(/\s[\d:~]+.*/, '').trim() || 'OT'}
                audioJson={verses.ot_audio}
                startChap={parseInt(verses.ot_title?.match(/(\d+):/)?.[1] || '1', 10)}
              />
            )}
            <button className="verses-toggle" onClick={() => setShowOT(!showOT)}>
              {showOT ? '▲ Hide verses' : '▼ Read verses'}
            </button>
            {showOT && (
              <div className="verses-box">
                {verses ? (
                  <>
                    <div className="verses-title">{getTitle(verses.ot_title)}</div>
                    <div className="verses-text">{formatVerses(getOtText())}</div>
                    {lang !== 'en' && !langAvailable(lang) && (
                      <div className="lang-unavailable-msg">
                        {lang === 'zh' ? '中文版本即将推出' : 'Versión en español próximamente'}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="loading">Loading...</div>
                )}
              </div>
            )}
            <button className={`checkin-btn ot ${otDone ? 'checked' : ''}`}
              onClick={() => handleCheckin('OT', otDone, setOtDone)}
              disabled={otDone || !!saving}>
              {saving === 'OT' ? 'Saving...' : otDone ? '✓ Finished OT' : 'Finish OT'}
            </button>
          </div>
        </div>

        {ntDone && otDone && (
          <div className="completed-banner">🎉 You completed both readings today!</div>
        )}

        {todayReaders.length > 0 && (
          <div className="readers-section">
            <div className="readers-title">Today's Readers ({todayReaders.length})</div>
            <div className="readers-table">
              <div className="readers-header"><span>Name</span><span>NT</span><span>OT</span></div>
              {todayReaders.map(r => (
                <div className="readers-row" key={r.name}>
                  <span>{r.name}</span>
                  <span>{r.nt ? <span className="check-nt">✓</span> : '—'}</span>
                  <span>{r.ot ? <span className="check-ot">✓</span> : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="comments-section">
          <div className="comments-title">💬 Discussion</div>
          {comments.length === 0 && <div className="lb-empty">No comments yet — be the first!</div>}
          {comments.map(c => (
            <div className="comment" key={c.id}>
              <div className="comment-header">
                <span className="comment-author">{c.name}</span>
                <span className="comment-time">{timeAgo(c.created_at)}</span>
              </div>
              <p className="comment-text">{c.text}</p>
            </div>
          ))}
          <div className="comment-form">
            <input className="name-input" placeholder="Your name"
              value={commentName} onChange={e => setCommentName(e.target.value)}
              style={{ marginBottom: '8px' }} />
            <textarea className="comment-input" placeholder="Share a thought..."
              value={commentText} rows={3}
              onChange={e => setCommentText(e.target.value.slice(0, 300))} />
            <div className="comment-footer">
              <span className="char-count">{commentText.length} / 300</span>
              <button className="start-btn" onClick={postComment}
                disabled={posting || !commentText.trim() || !commentName.trim()}>
                {posting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
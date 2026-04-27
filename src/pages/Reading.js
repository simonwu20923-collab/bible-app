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
      .select('nt_title,nt_text,ot_title,ot_text,nt_audio,ot_audio')
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

  function formatVerses(text) {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const m = line.match(/^([A-Z][a-z]+ \d+ :\d+)\s+(.*)/);
      if (m) return (
        <p key={i} className="verse-line" style={{ fontSize: fontSize + 'px' }}>
          <span className="verse-ref">{m[1]}</span>
          <span className="verse-body"> {m[2]}</span>
        </p>
      );
      return line ? <p key={i} className="verse-line" style={{ fontSize: fontSize + 'px' }}>{line}</p> : null;
    });
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
          <div className="font-size-row">
            <span>Text:</span>
            <button className="font-btn" onClick={() => setFontSize(f => Math.max(12, f - 2))}>A−</button>
            <button className="font-btn" onClick={() => setFontSize(15)}>A</button>
            <button className="font-btn" onClick={() => setFontSize(f => Math.min(22, f + 2))}>A+</button>
          </div>
        </div>

        <div className="reading-cards">
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
            {showNT && verses && (
              <div className="verses-box">
                <div className="verses-title">{verses.nt_title}</div>
                <div className="verses-text">{formatVerses(verses.nt_text)}</div>
              </div>
            )}
            <button className={`checkin-btn ${ntDone ? 'checked' : ''}`}
              onClick={() => handleCheckin('NT', ntDone, setNtDone)}
              disabled={ntDone || !!saving}>
              {saving === 'NT' ? 'Saving...' : ntDone ? '✓ Finished NT' : 'Finish NT'}
            </button>
          </div>

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
            {showOT && verses && (
              <div className="verses-box">
                <div className="verses-title">{verses.ot_title}</div>
                <div className="verses-text">{formatVerses(verses.ot_text)}</div>
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
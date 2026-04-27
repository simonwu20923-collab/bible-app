import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { getReadingForDate } from '../data/schedule';
import AudioPlayer from '../components/AudioPlayer';

export default function Reading({ lang = 'en' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const todayStr = new Date().toISOString().split('T')[0];
  const currentDate = searchParams.get('date') || todayStr;

  const dateLabel = new Date(currentDate + 'T12:00:00').toLocaleDateString(
    lang === 'zh' ? 'zh-TW' : lang === 'es' ? 'es-ES' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );
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

  function getTitle(englishTitle) {
    if (!englishTitle || lang === 'en') return englishTitle;
    if (lang === 'es') {
      return englishTitle
        .replace('New Testament', 'Nuevo Testamento')
        .replace('Old Testament', 'Antiguo Testamento');
    }
    if (lang === 'zh') {
      return englishTitle
        .replace('New Testament', '新約').replace('Old Testament', '舊約')
        .replace('Matthew', '太').replace('Mark', '可').replace('Luke', '路')
        .replace('John', '約').replace('Acts', '徒').replace('Romans', '羅')
        .replace('1 Corinthians', '林前').replace('2 Corinthians', '林後')
        .replace('Galatians', '加').replace('Ephesians', '弗')
        .replace('Philippians', '腓').replace('Colossians', '西')
        .replace('1 Thessalonians', '帖前').replace('2 Thessalonians', '帖後')
        .replace('1 Timothy', '提前').replace('2 Timothy', '提後')
        .replace('Titus', '多').replace('Philemon', '門')
        .replace('Hebrews', '來').replace('James', '雅')
        .replace('1 Peter', '彼前').replace('2 Peter', '彼後')
        .replace('1 John', '約壹').replace('2 John', '約貳').replace('3 John', '約參')
        .replace('Jude', '猶').replace('Revelation', '啟')
        .replace('Genesis', '創').replace('Exodus', '出').replace('Leviticus', '利')
        .replace('Numbers', '民').replace('Deuteronomy', '申').replace('Joshua', '書')
        .replace('Judges', '士').replace('Ruth', '得')
        .replace('1 Samuel', '撒上').replace('2 Samuel', '撒下')
        .replace('1 Kings', '王上').replace('2 Kings', '王下')
        .replace('1 Chronicles', '代上').replace('2 Chronicles', '代下')
        .replace('Ezra', '拉').replace('Nehemiah', '尼').replace('Esther', '斯')
        .replace('Job', '伯').replace('Psalms', '詩').replace('Proverbs', '箴')
        .replace('Ecclesiastes', '傳').replace('Song of Songs', '歌')
        .replace('Isaiah', '賽').replace('Jeremiah', '耶')
        .replace('Lamentations', '哀').replace('Ezekiel', '結').replace('Daniel', '但')
        .replace('Hosea', '何').replace('Joel', '珥').replace('Amos', '摩')
        .replace('Obadiah', '俄').replace('Jonah', '拿').replace('Micah', '彌')
        .replace('Nahum', '鴻').replace('Habakkuk', '哈').replace('Zephaniah', '番')
        .replace('Haggai', '該').replace('Zechariah', '亞').replace('Malachi', '瑪');
    }
    return englishTitle;
  }

  function formatVerses(text) {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const mEn = line.match(/^([A-Z][a-z]+ \d+ :\d+)\s+(.*)/);
      if (mEn) return (
        <p key={i} className="verse-line" style={{ fontSize: fontSize + 'px' }}>
          <span className="verse-ref">{mEn[1]}</span>
          <span className="verse-body"> {mEn[2]}</span>
        </p>
      );
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

  // UI labels based on language
  const ui = {
    en: { readToday: 'read today', hideVerses: '▲ Hide verses', readVerses: '▼ Read verses',
          finishNT: 'Finish NT', finishOT: 'Finish OT', finishedNT: '✓ Finished NT',
          finishedOT: '✓ Finished OT', saving: 'Saving...', completed: '🎉 You completed both readings today!',
          readersTitle: "Today's Readers", discussion: '💬 Discussion', noComments: 'No comments yet — be the first!',
          yourName: 'Your name', shareThought: 'Share a thought...', post: 'Post Comment', posting: 'Posting...',
          dayOf: 'Day', of: 'of', person: 'person has', people: 'people have', text: 'Text:' },
    es: { readToday: 'leyeron hoy', hideVerses: '▲ Ocultar versículos', readVerses: '▼ Leer versículos',
          finishNT: 'Terminar NT', finishOT: 'Terminar AT', finishedNT: '✓ NT completado',
          finishedOT: '✓ AT completado', saving: 'Guardando...', completed: '🎉 ¡Completaste ambas lecturas hoy!',
          readersTitle: 'Lectores de hoy', discussion: '💬 Discusión', noComments: '¡Sé el primero en comentar!',
          yourName: 'Tu nombre', shareThought: 'Comparte un pensamiento...', post: 'Publicar', posting: 'Publicando...',
          dayOf: 'Día', of: 'de', person: 'persona leyó', people: 'personas leyeron', text: 'Texto:' },
    zh: { readToday: '人已閱讀', hideVerses: '▲ 隱藏經文', readVerses: '▼ 閱讀經文',
          finishNT: '完成新約', finishOT: '完成舊約', finishedNT: '✓ 新約完成',
          finishedOT: '✓ 舊約完成', saving: '儲存中...', completed: '🎉 你今天完成了兩篇閱讀！',
          readersTitle: '今日讀者', discussion: '💬 討論', noComments: '還沒有留言，成為第一個！',
          yourName: '你的名字', shareThought: '分享你的想法...', post: '發表留言', posting: '發佈中...',
          dayOf: '第', of: '天 / 365', person: '人已閱讀', people: '人已閱讀', text: '字體：' },
  };
  const t = ui[lang] || ui.en;

  if (!name) {
    return (
      <div className="page">
        <div className="welcome-card">
          <div className="welcome-emoji">📖</div>
          <h1>{lang === 'zh' ? '你叫什麼名字？' : lang === 'es' ? '¿Cuál es tu nombre?' : "What's your name?"}</h1>
          <p className="welcome-sub">{lang === 'zh' ? '記錄你的閱讀進度' : lang === 'es' ? 'Para registrar tu lectura' : 'So we can track your reading'}</p>
          <div className="name-input-row">
            <input className="name-input" placeholder={lang === 'zh' ? '輸入你的名字...' : lang === 'es' ? 'Ingresa tu nombre...' : 'Enter your name...'}
              value={nameInput} onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()} />
            <button className="start-btn" onClick={saveName}>{lang === 'zh' ? '儲存 →' : lang === 'es' ? 'Guardar →' : 'Save →'}</button>
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
            <div className="reading-day-count">{t.dayOf} {dayOfYear} {t.of}</div>
          </div>
          <button className="nav-arrow" onClick={() => changeDate(1)}>→</button>
        </div>

        <div className="reading-meta-row">
          <span className="readers-count-pill">
            {todayReaders.length} {todayReaders.length === 1 ? t.person : t.people} {lang !== 'zh' ? 'today' : ''}
          </span>
          <div className="font-size-row">
            <span>{t.text}</span>
            <button className="font-btn" onClick={() => setFontSize(f => Math.max(12, f - 2))}>A−</button>
            <button className="font-btn" onClick={() => setFontSize(18)}>A</button>
            <button className="font-btn" onClick={() => setFontSize(f => Math.min(26, f + 2))}>A+</button>
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
              {showNT ? t.hideVerses : t.readVerses}
            </button>
            {showNT && (
              <div className="verses-box">
                {verses ? (
                  <>
                    <div className="verses-title">{getTitle(verses.nt_title)}</div>
                    <div className="verses-text">{formatVerses(getNtText())}</div>
                  </>
                ) : <div className="loading">Loading...</div>}
              </div>
            )}
            <button className={`checkin-btn ${ntDone ? 'checked' : ''}`}
              onClick={() => handleCheckin('NT', ntDone, setNtDone)}
              disabled={ntDone || !!saving}>
              {saving === 'NT' ? t.saving : ntDone ? t.finishedNT : t.finishNT}
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
              {showOT ? t.hideVerses : t.readVerses}
            </button>
            {showOT && (
              <div className="verses-box">
                {verses ? (
                  <>
                    <div className="verses-title">{getTitle(verses.ot_title)}</div>
                    <div className="verses-text">{formatVerses(getOtText())}</div>
                  </>
                ) : <div className="loading">Loading...</div>}
              </div>
            )}
            <button className={`checkin-btn ot ${otDone ? 'checked' : ''}`}
              onClick={() => handleCheckin('OT', otDone, setOtDone)}
              disabled={otDone || !!saving}>
              {saving === 'OT' ? t.saving : otDone ? t.finishedOT : t.finishOT}
            </button>
          </div>
        </div>

        {ntDone && otDone && (
          <div className="completed-banner">{t.completed}</div>
        )}

        {todayReaders.length > 0 && (
          <div className="readers-section">
            <div className="readers-title">{t.readersTitle} ({todayReaders.length})</div>
            <div className="readers-table">
              <div className="readers-header"><span>{lang === 'zh' ? '姓名' : lang === 'es' ? 'Nombre' : 'Name'}</span><span>NT</span><span>OT</span></div>
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
          <div className="comments-title">{t.discussion}</div>
          {comments.length === 0 && <div className="lb-empty">{t.noComments}</div>}
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
            <input className="name-input" placeholder={t.yourName}
              value={commentName} onChange={e => setCommentName(e.target.value)}
              style={{ marginBottom: '8px' }} />
            <textarea className="comment-input" placeholder={t.shareThought}
              value={commentText} rows={3}
              onChange={e => setCommentText(e.target.value.slice(0, 300))} />
            <div className="comment-footer">
              <span className="char-count">{commentText.length} / 300</span>
              <button className="start-btn" onClick={postComment}
                disabled={posting || !commentText.trim() || !commentName.trim()}>
                {posting ? t.posting : t.post}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
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
    lang === 'zh' || lang === 'sc' ? 'zh-TW' : lang === 'es' ? 'es-ES' : 'en-US',
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
    loadVerses(); loadComments();
    if (name) loadReaders(name);
  }, [currentDate]);

  async function loadVerses() {
    const { data } = await supabase.from('verses')
      .select('nt_title,nt_text,ot_title,ot_text,nt_audio,ot_audio,nt_audio_zh,ot_audio_zh,nt_text_es,ot_text_es,nt_text_zh,ot_text_zh,nt_text_sc,ot_text_sc')
      .eq('date', currentDate).single();
    if (data) setVerses(data);
  }

  async function loadReaders(n) {
    const { data } = await supabase.from('checkins')
      .select('name,portion,created_at').eq('date', currentDate)
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
    setBannerItems(recent.map(r => ({ name: r.name, portion: r.portion, time: timeAgo(r.created_at) })));
  }

  async function loadComments() {
    const { data } = await supabase.from('comments')
      .select('id,name,text,created_at').eq('date', currentDate)
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
    if (!error) { setCommentText(''); localStorage.setItem('bibleAppName', commentName.trim()); loadComments(); }
    setPosting(false);
  }

  function saveName() {
    if (nameInput.trim()) {
      localStorage.setItem('bibleAppName', nameInput.trim());
      setName(nameInput.trim()); setCommentName(nameInput.trim());
    }
  }

  // Get text for current language
  function getNtText() {
    if (!verses) return null;
    if (lang === 'es' && verses.nt_text_es) return verses.nt_text_es;
    if (lang === 'zh' && verses.nt_text_zh) return verses.nt_text_zh;
    if (lang === 'sc' && verses.nt_text_sc) return verses.nt_text_sc;
    return verses.nt_text;
  }
  function getOtText() {
    if (!verses) return null;
    if (lang === 'es' && verses.ot_text_es) return verses.ot_text_es;
    if (lang === 'zh' && verses.ot_text_zh) return verses.ot_text_zh;
    if (lang === 'sc' && verses.ot_text_sc) return verses.ot_text_sc;
    return verses.ot_text;
  }
  // Both zh and sc use same audio
  function getNtAudio() {
    if (!verses) return null;
    if ((lang === 'zh' || lang === 'sc') && verses.nt_audio_zh) return verses.nt_audio_zh;
    return verses.nt_audio;
  }
  function getOtAudio() {
    if (!verses) return null;
    if ((lang === 'zh' || lang === 'sc') && verses.ot_audio_zh) return verses.ot_audio_zh;
    return verses.ot_audio;
  }

  // Translate section title
  function getTitle(title) {
    if (!title || lang === 'en') return title;
    // Normalize abbreviated book names to full names first
    let normalized = title;
    Object.entries(ABBREV).forEach(([abbr, full]) => {
      normalized = normalized.replace(new RegExp(abbr.replace(/\./g, '\\.'), 'g'), full);
    });
    if (lang === 'es') return normalized.replace('New Testament', 'Nuevo Testamento').replace('Old Testament', 'Antiguo Testamento');
    const isZh = lang === 'zh' || lang === 'sc';
    if (isZh) {
      return normalized
        .replace('New Testament', lang === 'sc' ? '新约' : '新約')
        .replace('Old Testament', lang === 'sc' ? '旧约' : '舊約')
        .replace('Matthew','太').replace('Mark','可').replace('Luke','路')
        .replace('John','约').replace('Acts','徒').replace('Romans','罗')
        .replace('1 Corinthians','林前').replace('2 Corinthians','林后')
        .replace('Galatians','加').replace('Ephesians','弗').replace('Philippians','腓')
        .replace('Colossians','西').replace('1 Thessalonians','帖前').replace('2 Thessalonians','帖后')
        .replace('1 Timothy','提前').replace('2 Timothy','提后').replace('Titus','多')
        .replace('Philemon','门').replace('Hebrews','来').replace('James','雅')
        .replace('1 Peter','彼前').replace('2 Peter','彼后')
        .replace('1 John','约一').replace('2 John','约二').replace('3 John','约三')
        .replace('Jude','犹').replace('Revelation','启')
        .replace('Genesis','创').replace('Exodus','出').replace('Leviticus','利')
        .replace('Numbers','民').replace('Deuteronomy','申').replace('Joshua','书')
        .replace('Judges','士').replace('Ruth','得')
        .replace('1 Samuel','撒上').replace('2 Samuel','撒下')
        .replace('1 Sam','撒上').replace('2 Sam','撒下')
        .replace('1 Kings','王上').replace('2 Kings','王下')
        .replace('1 King','王上').replace('2 King','王下')
        .replace('1 Chronicles','代上').replace('2 Chronicles','代下')
        .replace('1 Chr','代上').replace('2 Chr','代下')
        .replace('Ezra','拉').replace('Nehemiah','尼').replace('Esther','斯')
        .replace('Job','伯').replace('Psalms','诗').replace('Proverbs','箴')
        .replace('Ecclesiastes','传').replace('Song of Songs','歌')
        .replace('Isaiah','赛').replace('Jeremiah','耶').replace('Lamentations','哀')
        .replace('Ezekiel','结').replace('Daniel','但').replace('Hosea','何')
        .replace('Joel','珥').replace('Amos','摩').replace('Micah','弥')
        .replace('Nahum','鸿').replace('Habakkuk','哈').replace('Zephaniah','番')
        .replace('Haggai','该').replace('Zechariah','亚').replace('Malachi','玛');
    }
    return title;
  }

  function formatVerses(text) {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const mEn = line.match(/^([A-Z][a-z]+ \d+ :\d+)\s+(.*)/);
      if (mEn) return (
        <p key={i} className="verse-line" style={{ fontSize: fontSize + 'px' }}>
          <span className="verse-ref">{mEn[1]}</span><span className="verse-body"> {mEn[2]}</span>
        </p>
      );
      const mOther = line.match(/^([\w\u4e00-\u9fff]+\.?\s*\d+:\d+)\s+(.*)/);
      if (mOther) return (
        <p key={i} className="verse-line" style={{ fontSize: fontSize + 'px' }}>
          <span className="verse-ref">{mOther[1]}</span><span className="verse-body"> {mOther[2]}</span>
        </p>
      );
      return line ? <p key={i} className="verse-line" style={{ fontSize: fontSize + 'px' }}>{line}</p> : null;
    });
  }
  // Normalize abbreviated book names to full English names
  const ABBREV = {
    'Gen.':'Genesis','Ex.':'Exodus','Exod.':'Exodus','Lev.':'Leviticus',
    'Num.':'Numbers','Deut.':'Deuteronomy','Josh.':'Joshua','Judg.':'Judges',
    '1 Sam.':'1 Samuel','2 Sam.':'2 Samuel',
    '1 Kgs.':'1 Kings','2 Kgs.':'2 Kings',
    '1 King':'1 Kings','2 King':'2 Kings',
    '1 Chr':'1 Chronicles','2 Chr':'2 Chronicles',
    '1 Sam':'1 Samuel','2 Sam':'2 Samuel',
    '1 Chr.':'1 Chronicles','2 Chr.':'2 Chronicles',
    'Neh.':'Nehemiah','Esth.':'Esther',
    'Ps.':'Psalms','Pss.':'Psalms','Prov.':'Proverbs',
    'Eccl.':'Ecclesiastes','Song.':'Song of Songs','Song of Sol.':'Song of Songs',
    'Isa.':'Isaiah','Jer.':'Jeremiah','Lam.':'Lamentations',
    'Ezek.':'Ezekiel','Dan.':'Daniel','Hos.':'Hosea',
    'Mic.':'Micah','Nah.':'Nahum','Hab.':'Habakkuk','Zeph.':'Zephaniah',
    'Hag.':'Haggai','Zech.':'Zechariah','Mal.':'Malachi',
    'Matt.':'Matthew','Mk.':'Mark','Lk.':'Luke','Jn.':'John',
    'Rom.':'Romans',
    '1 Cor.':'1 Corinthians','2 Cor.':'2 Corinthians',
    'Gal.':'Galatians','Eph.':'Ephesians','Phil.':'Philippians','Col.':'Colossians',
    '1 Thess.':'1 Thessalonians','2 Thess.':'2 Thessalonians',
    '1 Tim.':'1 Timothy','2 Tim.':'2 Timothy',
    'Philem.':'Philemon','Heb.':'Hebrews','Jas.':'James',
    '1 Pet.':'1 Peter','2 Pet.':'2 Peter',
    '1 Jn.':'1 John','2 Jn.':'2 John','3 Jn.':'3 John','Rev.':'Revelation',
  };

  const ZH_MAP = {
    'Matthew':'太','Mark':'可','Luke':'路','John':'约',
    'Acts':'徒','Romans':'罗','Genesis':'创','Exodus':'出',
    'Leviticus':'利','Numbers':'民','Deuteronomy':'申',
    'Psalms':'诗','Proverbs':'箴','Isaiah':'赛','Revelation':'启',
    '1 Samuel':'撒上','2 Samuel':'撒下','1 Kings':'王上','2 Kings':'王下',
    '1 Chronicles':'代上','2 Chronicles':'代下',
    'Jeremiah':'耶','Ezekiel':'结','Daniel':'但',
    'Joshua':'书','Judges':'士','Ruth':'得','Ezra':'拉',
    'Nehemiah':'尼','Esther':'斯','Job':'伯',
    'Ecclesiastes':'传','Song of Songs':'歌',
    'Lamentations':'哀','Hosea':'何','Joel':'珥','Amos':'摩',
    'Obadiah':'俄','Jonah':'拿','Micah':'弥','Nahum':'鸿',
    'Habakkuk':'哈','Zephaniah':'番','Haggai':'该',
    'Zechariah':'亚','Malachi':'玛','Hebrews':'来','James':'雅',
    '1 John':'约一','2 John':'约二','3 John':'约三',
    '1 Peter':'彼前','2 Peter':'彼后','Jude':'犹',
    '1 Corinthians':'林前','2 Corinthians':'林后',
    'Galatians':'加','Ephesians':'弗','Philippians':'腓',
    'Colossians':'西','1 Thessalonians':'帖前','2 Thessalonians':'帖后',
    '1 Timothy':'提前','2 Timothy':'提后','Titus':'多','Philemon':'门',
  };

  const ES_MAP = {
    'Matthew':'Mt.','Mark':'Mc.','Luke':'Lc.','John':'Jn.',
    'Acts':'Hch.','Romans':'Ro.','Genesis':'Gn.','Exodus':'Éx.',
    'Leviticus':'Lv.','Numbers':'Nm.','Deuteronomy':'Dt.',
    'Psalms':'Sal.','Proverbs':'Pr.','Isaiah':'Is.','Revelation':'Ap.',
    '1 Samuel':'1 S.','2 Samuel':'2 S.','1 Kings':'1 R.','2 Kings':'2 R.',
    '1 Chronicles':'1 Cr.','2 Chronicles':'2 Cr.',
    'Jeremiah':'Jer.','Ezekiel':'Ez.','Daniel':'Dn.',
    'Joshua':'Jos.','Judges':'Jue.','Ruth':'Rut',
    'Job':'Job','Hebrews':'Heb.','James':'Sant.',
    '1 Corinthians':'1 Co.','2 Corinthians':'2 Co.',
    'Galatians':'Gá.','Ephesians':'Ef.','Philippians':'Fil.',
    'Colossians':'Col.','1 John':'1 Jn.','2 John':'2 Jn.','3 John':'3 Jn.',
    '1 Peter':'1 Pe.','2 Peter':'2 Pe.','Jude':'Jud.',
  };

  function normalizeBook(abbrev) {
    return ABBREV[abbrev] || abbrev;
  }

  // Translate a portion string like "Matt. 28:1-28:20" into the target language
  function translatePortion(portion, language) {
    if (!portion || language === 'en') return portion;
    // First normalize abbreviations to full names
    let result = portion;
    Object.entries(ABBREV).forEach(([abbr, full]) => {
      result = result.replace(new RegExp(abbr.replace(/\./g, '\\.'), 'g'), full);
    });
    if (language === 'zh' || language === 'sc') {
      Object.entries(ZH_MAP).forEach(([full, char]) => {
        result = result.replace(new RegExp(full, 'g'), char);
      });
    } else if (language === 'es') {
      Object.entries(ES_MAP).forEach(([full, abbr]) => {
        result = result.replace(new RegExp(full, 'g'), abbr);
      });
    }
    return result;
  }

  function getBookLabel(title, language) {
    if (!title) return '';
    // Extract book name from title like "New Testament - Luke 21:5~21:36"
    const clean = title
      .replace(/New Testament\s*-\s*/i, '')
      .replace(/Old Testament\s*-\s*/i, '')
      .replace(/\s+[\d:~]+.*/, '').trim();
    const full = normalizeBook(clean);
    if (language === 'en') return full;
    if (language === 'es') return ES_MAP[full] || full;
    if (language === 'zh' || language === 'sc') return ZH_MAP[full] || full;
    return full;
  }

  // Returns explicit per-chapter labels for cross-book titles like "1 King 22:51~2 King 2:18"
  // e.g. ["\u738b\u4e0a \u7b2c22\u7ae0", "\u738b\u4e0b \u7b2c1\u7ae0", "\u738b\u4e0b \u7b2c2\u7ae0"]
  // Returns null for normal same-book titles.
  function getCrossBookChapterLabels(title, audioCount, language) {
    if (!title || !audioCount) return null;
    const clean = title.replace(/^(New|Old) Testament\s*-\s*/i, '').trim();
    const m = clean.match(/^(.+?)\s+(\d+):\d+\s*[~\-]\s*(.+?)\s+(\d+):\d+\s*$/);
    if (!m) return null;
    const startBookFull = normalizeBook(m[1].trim());
    const startChap    = parseInt(m[2]);
    const endBookFull  = normalizeBook(m[3].trim());
    const endChap      = parseInt(m[4]);
    if (startBookFull === endBookFull) return null;
    const book2Count = endChap;
    const book1Count = audioCount - book2Count;
    function bookL(fullName) {
      if (language === 'zh' || language === 'sc') return ZH_MAP[fullName] || fullName;
      if (language === 'es') return ES_MAP[fullName] || fullName;
      return fullName;
    }
    function chapLbl(b, n) {
      if (language === 'zh' || language === 'sc') return b + ' \u7b2c' + n + '\u7ae0';
      if (language === 'es') return b + ' Cap. ' + n;
      return b + ' Ch. ' + n;
    }
    const labels = [];
    const b1 = bookL(startBookFull);
    for (let i = 0; i < book1Count; i++) labels.push(chapLbl(b1, startChap + i));
    const b2 = bookL(endBookFull);
    for (let i = 1; i <= book2Count; i++) labels.push(chapLbl(b2, i));
    return labels;
  }
  const ui = {
    en: { hideVerses:'▲ Hide verses', readVerses:'▼ Read verses', finishNT:'Finish NT', finishOT:'Finish OT', finishedNT:'✓ Finished NT', finishedOT:'✓ Finished OT', saving:'Saving...', completed:'🎉 You completed both readings today!', readersTitle:"Today's Readers", discussion:'💬 Discussion', noComments:'No comments yet — be the first!', yourName:'Your name', shareThought:'Share a thought...', post:'Post Comment', posting:'Posting...', person:'person has', people:'people have', today:'today', text:'Text:', dayOf:'Day', of:'of' },
    es: { hideVerses:'▲ Ocultar', readVerses:'▼ Leer versículos', finishNT:'Terminar NT', finishOT:'Terminar AT', finishedNT:'✓ NT completado', finishedOT:'✓ AT completado', saving:'Guardando...', completed:'🎉 ¡Completaste ambas lecturas hoy!', readersTitle:'Lectores de hoy', discussion:'💬 Discusión', noComments:'¡Sé el primero!', yourName:'Tu nombre', shareThought:'Comparte un pensamiento...', post:'Publicar', posting:'Publicando...', person:'persona leyó', people:'personas leyeron', today:'', text:'Texto:', dayOf:'Día', of:'de' },
    zh: { hideVerses:'▲ 隱藏經文', readVerses:'▼ 閱讀經文', finishNT:'完成新約', finishOT:'完成舊約', finishedNT:'✓ 新約完成', finishedOT:'✓ 舊約完成', saving:'儲存中...', completed:'🎉 你今天完成了兩篇閱讀！', readersTitle:'今日讀者', discussion:'💬 討論', noComments:'還沒有留言', yourName:'你的名字', shareThought:'分享你的想法...', post:'發表留言', posting:'發佈中...', person:'人已閱讀', people:'人已閱讀', today:'', text:'字體：', dayOf:'第', of:'天/365' },
    sc: { hideVerses:'▲ 隐藏经文', readVerses:'▼ 阅读经文', finishNT:'完成新约', finishOT:'完成旧约', finishedNT:'✓ 新约完成', finishedOT:'✓ 旧约完成', saving:'保存中...', completed:'🎉 你今天完成了两篇阅读！', readersTitle:'今日读者', discussion:'💬 讨论', noComments:'还没有留言', yourName:'你的名字', shareThought:'分享你的想法...', post:'发表留言', posting:'发布中...', person:'人已阅读', people:'人已阅读', today:'', text:'字体：', dayOf:'第', of:'天/365' },
  };
  const t = ui[lang] || ui.en;

  if (!name) {
    const placeholder = { en:'Enter your name...', es:'Ingresa tu nombre...', zh:'輸入你的名字...', sc:'输入你的名字...' };
    const title = { en:"What's your name?", es:'¿Cuál es tu nombre?', zh:'你叫什麼名字？', sc:'你叫什么名字？' };
    const sub = { en:'So we can track your reading', es:'Para registrar tu lectura', zh:'記錄你的閱讀進度', sc:'记录你的阅读进度' };
    const btn = { en:'Save →', es:'Guardar →', zh:'儲存 →', sc:'保存 →' };
    return (
      <div className="page">
        <div className="welcome-card">
          <div className="welcome-emoji">📖</div>
          <h1>{title[lang] || title.en}</h1>
          <p className="welcome-sub">{sub[lang] || sub.en}</p>
          <div className="name-input-row">
            <input className="name-input" placeholder={placeholder[lang] || placeholder.en}
              value={nameInput} onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()} />
            <button className="start-btn" onClick={saveName}>{btn[lang] || btn.en}</button>
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
            {todayReaders.length} {todayReaders.length === 1 ? t.person : t.people} {t.today}
          </span>
          <div className="font-size-row">
            <span>{t.text}</span>
            <button className="font-btn" onClick={() => setFontSize(f => Math.max(12, f - 2))}>A−</button>
            <button className="font-btn" onClick={() => setFontSize(18)}>A</button>
            <button className="font-btn" onClick={() => setFontSize(f => Math.min(26, f + 2))}>A+</button>
          </div>
        </div>

        <div className="reading-cards">
          {/* NT Card */}
          <div className={`reading-card ${ntDone ? 'done' : ''}`}>
            <div className="reading-card-header">
              <span className="reading-tag nt-tag">NT</span>
              <span className="reading-portion">{translatePortion(reading.nt, lang)}</span>
            </div>
            {getNtAudio() && (
  <AudioPlayer
    key={`nt-${lang}`}
    label={lang === 'zh' ? '新約音頻' : lang === 'sc' ? '新约音频' : lang === 'es' ? 'Audio NT' : 'NT Audio'}
    book={getBookLabel(verses.nt_title, lang)}
    audioJson={getNtAudio()}
    startChap={parseInt(verses.nt_title?.match(/(\d+):/)?.[1] || '1', 10)}
    lang={lang}
  />
)}
            <button className="verses-toggle" onClick={() => setShowNT(!showNT)}>
              {showNT ? t.hideVerses : t.readVerses}
            </button>
            {showNT && (
              <div className="verses-box">
                {verses ? (
                  <><div className="verses-title">{getTitle(verses.nt_title)}</div>
                  <div className="verses-text">{formatVerses(getNtText())}</div></>
                ) : <div className="loading">Loading...</div>}
              </div>
            )}
            <button className={`checkin-btn ${ntDone ? 'checked' : ''}`}
              onClick={() => handleCheckin('NT', ntDone, setNtDone)} disabled={ntDone || !!saving}>
              {saving === 'NT' ? t.saving : ntDone ? t.finishedNT : t.finishNT}
            </button>
          </div>

          {/* OT Card */}
          <div className={`reading-card ${otDone ? 'done' : ''}`}>
            <div className="reading-card-header">
              <span className="reading-tag ot-tag">OT</span>
              <span className="reading-portion">{translatePortion(reading.ot, lang)}</span>
            </div>
            {getOtAudio() && (
  <AudioPlayer
    key={`ot-${lang}`}
    label={lang === 'zh' ? '舊約音頻' : lang === 'sc' ? '旧约音频' : lang === 'es' ? 'Audio AT' : 'OT Audio'}
    book={getBookLabel(verses.ot_title, lang)}
    audioJson={getOtAudio()}
    startChap={parseInt(verses.ot_title?.match(/(\d+):/)?.[1] || '1', 10)}
    lang={lang}
    chapterLabels={getCrossBookChapterLabels(verses.ot_title, JSON.parse(getOtAudio() || '[]').length, lang)}
  />
)}
            <button className="verses-toggle" onClick={() => setShowOT(!showOT)}>
              {showOT ? t.hideVerses : t.readVerses}
            </button>
            {showOT && (
              <div className="verses-box">
                {verses ? (
                  <><div className="verses-title">{getTitle(verses.ot_title)}</div>
                  <div className="verses-text">{formatVerses(getOtText())}</div></>
                ) : <div className="loading">Loading...</div>}
              </div>
            )}
            <button className={`checkin-btn ot ${otDone ? 'checked' : ''}`}
              onClick={() => handleCheckin('OT', otDone, setOtDone)} disabled={otDone || !!saving}>
              {saving === 'OT' ? t.saving : otDone ? t.finishedOT : t.finishOT}
            </button>
          </div>
        </div>

        {ntDone && otDone && <div className="completed-banner">{t.completed}</div>}

        {todayReaders.length > 0 && (
          <div className="readers-section">
            <div className="readers-title">{t.readersTitle} ({todayReaders.length})</div>
            <div className="readers-table">
              <div className="readers-header"><span>{lang === 'en' ? 'Name' : lang === 'es' ? 'Nombre' : '姓名'}</span><span>NT</span><span>OT</span></div>
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
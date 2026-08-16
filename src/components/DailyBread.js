import React from 'react';
import { supabase } from '../supabase';

// The daily devotional for the day's portion, built by fetchDailyBread.js from
// the "Daily Reading through the Bible in A Year" doc and daybread.org.
// Rows are keyed by MM-DD, since schedule.js repeats every year.

const UI = {
  en: { title: "Today's Reading", topic: 'Topic', key_verse: 'Key Verse', emphasis: 'Emphasis',
        musing: 'Musing', prayer: 'Prayer', hymn: 'Hymn',
        ls: 'Life-study Message', lsAudio: 'Life-study Broadcast',
        show: 'Tap to expand', hide: 'Tap to collapse', lyrics: 'Lyrics' },
  zh: { title: '今日讀經', topic: '主題', key_verse: '要節', emphasis: '重點',
        musing: '默想', prayer: '禱告', hymn: '詩歌',
        ls: '生命讀經', lsAudio: '生命讀經廣播',
        show: '點擊展開', hide: '點擊收合', lyrics: '歌詞' },
  sc: { title: '今日读经', topic: '主题', key_verse: '要节', emphasis: '重点',
        musing: '默想', prayer: '祷告', hymn: '诗歌',
        ls: '生命读经', lsAudio: '生命读经广播',
        show: '点击展开', hide: '点击收合', lyrics: '歌词' },
};

export default function DailyBread({ date, lang = 'en', fontSize = 18, stickyTop = 0 }) {
  const [row, setRow] = React.useState(null);
  const [open, setOpen] = React.useState(false);
  const t = UI[lang] || UI.en;

  // The header row's height decides how much room the scrollable body may take.
  // It differs between desktop and the one-line mobile layout, so measure it.
  const headRef = React.useRef(null);
  const [headHeight, setHeadHeight] = React.useState(64);
  React.useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const update = () => setHeadHeight(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [row]);

  const md = date.slice(5);

  React.useEffect(() => {
    let cancelled = false;
    setRow(null);
    supabase.from('daily_bread')
      .select('*').eq('md', md).eq('lang', lang).maybeSingle()
      .then(({ data }) => { if (!cancelled) setRow(data); });
    return () => { cancelled = true; };
  }, [md, lang]);

  if (!row) return null;

  // Each section collapses on its own — open by default, so the page reads
  // top to bottom, but long sections can be folded away while reading.
  const section = (label, children) => children && (
    <details className="db-row" open>
      <summary className="db-label">{label}</summary>
      <div className="db-value" style={{ fontSize: fontSize + 'px' }}>{children}</div>
    </details>
  );
  const field = (label, value) => value && section(label, value);

  const isVideo = row.hymn_audio && !/\.mp3(\?|$)/i.test(row.hymn_audio);

  return (
    <details
      className="daily-bread"
      style={{ '--db-sticky-top': stickyTop + 'px', '--db-head-h': headHeight + 'px' }}
      open={open}
      onToggle={e => setOpen(e.currentTarget.open)}
    >
      <summary ref={headRef}>
        <span className="db-chevron" aria-hidden="true">▸</span>
        <span className="db-title">{t.title}</span>
        {row.topic && <span className="db-ref">{row.topic}</span>}
        <span className="db-toggle-hint">{open ? t.hide : t.show}</span>
      </summary>

      {/* Wrapper so the open card can cap its height and scroll its own body,
          which keeps it expanding where it is pinned instead of jumping the
          page back to its position in the document. */}
      <div className="db-body">
      {field(t.topic, row.topic)}
      {field(t.key_verse, row.key_verse)}
      {field(t.emphasis, row.emphasis)}
      {field(t.musing, row.musing)}
      {field(t.prayer, row.prayer)}

      {row.hymn_title && section(t.hymn, <>
        {row.hymn_url
          ? <a href={row.hymn_url} target="_blank" rel="noopener noreferrer">{row.hymn_title}</a>
          : row.hymn_title}
        {row.hymn_audio && (isVideo
          // loading="lazy" so a collapsed section never pulls in the player
          ? <iframe className="db-video" src={row.hymn_audio} loading="lazy"
                    title={row.hymn_title} frameBorder="0" allowFullScreen />
          : <audio className="db-audio" controls preload="none" src={row.hymn_audio} />)}
        {row.hymn_text && (
          <details className="db-lyrics">
            <summary>{t.lyrics}</summary>
            <div className="db-lyrics-text">{row.hymn_text}</div>
          </details>
        )}
      </>)}

      {row.ls_title && section(t.ls,
        row.ls_url
          ? <a href={row.ls_url} target="_blank" rel="noopener noreferrer">{row.ls_title}</a>
          : row.ls_title)}

      {row.ls_audio && section(t.lsAudio,
        <audio className="db-audio" controls preload="none" src={row.ls_audio} />)}
      </div>
    </details>
  );
}

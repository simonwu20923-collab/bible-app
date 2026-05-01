import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { HomeThreadCard } from '../components/CommentsSection';

export default function Home({ lang = 'en' }) {
  const [name, setName] = React.useState(() => localStorage.getItem('bibleAppName') || '');
  const [nameInput, setNameInput] = React.useState('');
  const [stats, setStats] = React.useState(null);
  const [nextDate, setNextDate] = React.useState(null);
  const [topWeek, setTopWeek] = React.useState([]);
  const [topAllTime, setTopAllTime] = React.useState([]);
  const [recentComments, setRecentComments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  const year = new Date().getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd   = `${year}-12-31`;

  const ui = {
    en: { title:'Church in Cerritos', sub:`Bible Reading Tracker ${year}`, namePlaceholder:'Enter your name...', start:'Start →', streak:'Day Streak 🔥', fullDays:'Full Days ✓', daysRead:'Days Read', continueReading:'📖 Continue Reading', next:'Next:', todayReading:"📅 Today's Reading", goToDate:'Go to current date', viewSchedule:'🗓 View Schedule', calList:'Calendar & List', thisWeek:'🏆 This Week', allTime:'⭐ All Time', noReadings:'No readings this week yet', full:'full', days:'days', recentComments:'💬 Recent Comments', loading:'Loading...' },
    es: { title:'Iglesia en Cerritos', sub:`Registro de Lectura Bíblica ${year}`, namePlaceholder:'Ingresa tu nombre...', start:'Comenzar →', streak:'Racha 🔥', fullDays:'Días Completos ✓', daysRead:'Días Leídos', continueReading:'📖 Continuar Leyendo', next:'Siguiente:', todayReading:'📅 Lectura de Hoy', goToDate:'Ir a la fecha actual', viewSchedule:'🗓 Ver Horario', calList:'Calendario y Lista', thisWeek:'🏆 Esta Semana', allTime:'⭐ Todo el Tiempo', noReadings:'Sin lecturas esta semana', full:'completo', days:'días', recentComments:'💬 Comentarios Recientes', loading:'Cargando...' },
    zh: { title:'喜瑞都召會', sub:`${year}年聖經閱讀記錄`, namePlaceholder:'輸入你的名字...', start:'開始 →', streak:'連續天數 🔥', fullDays:'完整天數 ✓', daysRead:'已讀天數', continueReading:'📖 繼續閱讀', next:'下一個：', todayReading:'📅 今日閱讀', goToDate:'前往今天', viewSchedule:'🗓 閱讀計劃', calList:'日曆與列表', thisWeek:'🏆 本週', allTime:'⭐ 總排行', noReadings:'本週還沒有閱讀記錄', full:'全部', days:'天', recentComments:'💬 最近留言', loading:'載入中...' },
    sc: { title:'喜瑞都召会', sub:`${year}年圣经阅读记录`, namePlaceholder:'输入你的名字...', start:'开始 →', streak:'连续天数 🔥', fullDays:'完整天数 ✓', daysRead:'已读天数', continueReading:'📖 继续阅读', next:'下一个：', todayReading:'📅 今日阅读', goToDate:'前往今天', viewSchedule:'🗓 阅读计划', calList:'日历与列表', thisWeek:'🏆 本周', allTime:'⭐ 总排行', noReadings:'本周还没有阅读记录', full:'全部', days:'天', recentComments:'💬 最近留言', loading:'加载中...' },
  };
  const t = ui[lang] || ui.en;

  React.useEffect(() => { loadLeaderboard(); loadRecentComments(); }, []);
  React.useEffect(() => { if (name) loadMyStats(name); }, [name]);

  async function loadRecentComments() {
    const { data } = await supabase
      .from('comments')
      .select('id,name,text,date,created_at,reactions,parent_id')
      .order('created_at', { ascending: true })
      .limit(300);
    if (!data) return;

    // Group all comments by thread (root comment id)
    const threadMap = {}; // rootId -> [all comments in thread]
    const rootMap = {}; // rootId -> root comment
    data.forEach(c => {
      if (!c.parent_id) rootMap[c.id] = c;
    });
    data.forEach(c => {
      const rootId = c.parent_id
        ? (rootMap[c.parent_id] ? c.parent_id : data.find(x => x.id === c.parent_id)?.parent_id || c.parent_id)
        : c.id;
      if (!threadMap[rootId]) threadMap[rootId] = [];
      threadMap[rootId].push(c);
    });

    // Find latest activity per thread and sort
    const threads = Object.entries(threadMap).map(([rootId, comments]) => {
      const latest = Math.max(...comments.map(c => new Date(c.created_at).getTime()));
      return { rootId, comments, latest };
    }).sort((a, b) => b.latest - a.latest).slice(0, 5);

    setRecentComments(threads);
  }

  async function loadMyStats(n) {
    // Filter to current year so stats reset each January
    // Paginate to get ALL personal checkins
    let allRows = [];
    let p = 0;
    const SZ = 1000;
    while (true) {
      const { data: batch } = await supabase
        .from('checkins')
        .select('date,portion')
        .ilike('name', n)
        .gte('date', yearStart)
        .lte('date', yearEnd)
        .range(p * SZ, (p + 1) * SZ - 1);
      if (!batch || batch.length === 0) break;
      allRows = allRows.concat(batch);
      if (batch.length < SZ) break;
      p++;
    }
    const data = allRows;
    if (!data.length) return;

    const byDate = {};
    data.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = { nt: false, ot: false };
      if (r.portion === 'NT') byDate[r.date].nt = true;
      if (r.portion === 'OT') byDate[r.date].ot = true;
    });

    const fullDays  = Object.values(byDate).filter(d => d.nt && d.ot).length;
    const totalDays = Object.keys(byDate).length;

    // Streak: consecutive days from today going backwards
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (byDate[key] && (byDate[key].nt || byDate[key].ot)) streak++;
      else break;
    }

    // Next unfinished date (for "Continue Reading" button)
    // Continue Reading = day AFTER the last date that was read
    const readDates = Object.keys(byDate).sort();
    if (readDates.length > 0) {
      const lastRead = readDates[readDates.length - 1];
      const nextDay = new Date(lastRead + 'T12:00:00');
      nextDay.setDate(nextDay.getDate() + 1);
      setNextDate(nextDay.toISOString().split('T')[0]);
    } else {
      setNextDate(today.toISOString().split('T')[0]);
    }

    setStats({ fullDays, totalDays, streak });
  }

  async function loadLeaderboard() {
    setLoading(true);

    // Paginate to get ALL checkins — Supabase defaults to 1000 row limit
    let allData = [];
    let page = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('checkins')
        .select('name,date,portion')
        .gte('date', yearStart)
        .lte('date', yearEnd)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error || !data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < PAGE_SIZE) break; // last page
      page++;
    }
    const data = allData;

    if (data) {
      const today = new Date();
      const weekAgo = new Date(); weekAgo.setDate(today.getDate() - 7);

      const buildStats = (rows) => {
        const map = {};
        rows.forEach(r => {
          const k = r.name.toLowerCase();
          if (!map[k]) map[k] = { name: r.name, dates: {} };
          if (!map[k].dates[r.date]) map[k].dates[r.date] = { nt: false, ot: false };
          if (r.portion === 'NT') map[k].dates[r.date].nt = true;
          if (r.portion === 'OT') map[k].dates[r.date].ot = true;
        });
        return Object.values(map).map(p => {
          const full  = Object.values(p.dates).filter(d => d.nt && d.ot).length;
          const total = Object.keys(p.dates).length;
          return { name: p.name, full, total };
        }).sort((a, b) => b.full - a.full || b.total - a.total).slice(0, 10);
      };

      setTopAllTime(buildStats(data));
      setTopWeek(buildStats(data.filter(r => new Date(r.date) >= weekAgo)));
    }
    setLoading(false);
  }

  function saveName() {
    if (nameInput.trim()) {
      localStorage.setItem('bibleAppName', nameInput.trim());
      setName(nameInput.trim());
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString(
      (lang === 'zh' || lang === 'sc') ? 'zh-TW' : lang === 'es' ? 'es-ES' : 'en-US',
      { month: 'short', day: 'numeric' }
    );
  }



  const medals = ['🥇', '🥈', '🥉'];

  // ── Welcome screen (no name set) ─────────────────────────────────────────────
  if (!name) {
    return (
      <div className="page">
        <div className="welcome-card">
          <div className="welcome-emoji">📖</div>
          <h1>{t.title}</h1>
          <p className="welcome-sub">{t.sub}</p>
          <div className="name-input-row">
            <input
              className="name-input"
              placeholder={t.namePlaceholder}
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()}
            />
            <button className="start-btn" onClick={saveName}>{t.start}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main home screen ─────────────────────────────────────────────────────────
  return (
    <div className="page">
      {/* Personal stats */}
      {stats && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-number">{stats.streak}</div>
            <div className="stat-label">{t.streak}</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.fullDays}</div>
            <div className="stat-label">{t.fullDays}</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.totalDays}</div>
            <div className="stat-label">{t.daysRead}</div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="home-buttons">
        {nextDate && (
          <button
            className="home-btn home-btn-primary"
            onClick={() => navigate(
              nextDate === new Date().toISOString().split('T')[0]
                ? '/reading'
                : `/reading?date=${nextDate}`
            )}>
            <div className="home-btn-title">{t.continueReading}</div>
            <div className="home-btn-sub">{t.next} {formatDate(nextDate)}</div>
          </button>
        )}
        <button className="home-btn home-btn-green" onClick={() => navigate('/reading')}>
          <div className="home-btn-title">{t.todayReading}</div>
          <div className="home-btn-sub">{t.goToDate}</div>
        </button>
        <button className="home-btn home-btn-blue" onClick={() => navigate('/schedule')}>
          <div className="home-btn-title">{t.viewSchedule}</div>
          <div className="home-btn-sub">{t.calList}</div>
        </button>
      </div>

      {/* Leaderboards */}
      {loading ? (
        <div className="loading">{t.loading}</div>
      ) : (
        <div className="leaderboards">
          <div className="leaderboard-card">
            <div className="leaderboard-title">{t.thisWeek}</div>
            {topWeek.length === 0
              ? <div className="lb-empty">{t.noReadings}</div>
              : topWeek.map((r, i) => (
                <div className="lb-row" key={r.name}>
                  <span className="lb-rank">{medals[i] || i + 1}</span>
                  <span className="lb-name">{r.name}</span>
                  <span className="lb-score">{r.full} {t.full} · {r.total} {t.days}</span>
                </div>
              ))
            }
          </div>
          <div className="leaderboard-card">
            <div className="leaderboard-title">{t.allTime}</div>
            {topAllTime.map((r, i) => (
              <div className="lb-row" key={r.name}>
                <span className="lb-rank">{medals[i] || i + 1}</span>
                <span className="lb-name">{r.name}</span>
                <span className="lb-score">{r.full} {t.full} · {r.total} {t.days}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent comments preview */}
      {recentComments.length > 0 && (
        <div className="recent-comments-section">
          <div className="comments-title">{t.recentComments}</div>
          {recentComments.map((thread, i) => (
            <HomeThreadCard
              key={thread.rootId || i}
              threadComments={thread.comments}
              lang={lang}
              onNavigate={() => {
                const root = thread.comments.find(c => !c.parent_id);
                if (root) navigate(`/reading?date=${root.date}`);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
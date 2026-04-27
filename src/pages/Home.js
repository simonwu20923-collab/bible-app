import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

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

  const ui = {
    en: {
      title: 'Church in Cerritos', sub: 'Bible Reading Tracker 2026',
      namePlaceholder: 'Enter your name...', start: 'Start →',
      streak: 'Day Streak 🔥', fullDays: 'Full Days ✓', daysRead: 'Days Read',
      continueReading: '📖 Continue Reading', next: 'Next:',
      todayReading: '📅 Today\'s Reading', goToDate: 'Go to current date',
      viewSchedule: '🗓 View Schedule', calList: 'Calendar & List',
      thisWeek: '🏆 This Week', allTime: '⭐ All Time',
      noReadings: 'No readings this week yet',
      full: 'full', days: 'days',
      recentComments: '💬 Recent Comments',
      loading: 'Loading...',
    },
    es: {
      title: 'Iglesia en Cerritos', sub: 'Registro de Lectura Bíblica 2026',
      namePlaceholder: 'Ingresa tu nombre...', start: 'Comenzar →',
      streak: 'Racha 🔥', fullDays: 'Días Completos ✓', daysRead: 'Días Leídos',
      continueReading: '📖 Continuar Leyendo', next: 'Siguiente:',
      todayReading: '📅 Lectura de Hoy', goToDate: 'Ir a la fecha actual',
      viewSchedule: '🗓 Ver Horario', calList: 'Calendario y Lista',
      thisWeek: '🏆 Esta Semana', allTime: '⭐ Todo el Tiempo',
      noReadings: 'Sin lecturas esta semana',
      full: 'completo', days: 'días',
      recentComments: '💬 Comentarios Recientes',
      loading: 'Cargando...',
    },
    zh: {
      title: '瑟瑞托斯召會', sub: '2026年聖經閱讀記錄',
      namePlaceholder: '輸入你的名字...', start: '開始 →',
      streak: '連續天數 🔥', fullDays: '完整天數 ✓', daysRead: '已讀天數',
      continueReading: '📖 繼續閱讀', next: '下一個：',
      todayReading: '📅 今日閱讀', goToDate: '前往今天',
      viewSchedule: '🗓 閱讀計劃', calList: '日曆與列表',
      thisWeek: '🏆 本週', allTime: '⭐ 總排行',
      noReadings: '本週還沒有閱讀記錄',
      full: '全部', days: '天',
      recentComments: '💬 最近留言',
      loading: '載入中...',
    },
  };
  const t = ui[lang] || ui.en;

  React.useEffect(() => { loadLeaderboard(); loadRecentComments(); }, []);
  React.useEffect(() => { if (name) loadMyStats(name); }, [name]);

  async function loadRecentComments() {
    const { data } = await supabase.from('comments')
      .select('name, text, date, created_at')
      .order('created_at', { ascending: false }).limit(5);
    if (data) setRecentComments(data);
  }

  async function loadMyStats(n) {
    const { data } = await supabase.from('checkins')
      .select('date, portion').ilike('name', n);
    if (!data) return;

    const byDate = {};
    data.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = { nt: false, ot: false };
      if (r.portion === 'NT') byDate[r.date].nt = true;
      if (r.portion === 'OT') byDate[r.date].ot = true;
    });

    const fullDays = Object.values(byDate).filter(d => d.nt && d.ot).length;
    const totalDays = Object.keys(byDate).length;

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (byDate[key] && (byDate[key].nt || byDate[key].ot)) streak++;
      else break;
    }

    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const key = d.toISOString().split('T')[0];
      const done = byDate[key];
      if (!done || !(done.nt && done.ot)) { setNextDate(key); break; }
    }

    setStats({ fullDays, totalDays, streak });
  }

  async function loadLeaderboard() {
    setLoading(true);
    const { data } = await supabase.from('checkins').select('name, date, portion');
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
          const full = Object.values(p.dates).filter(d => d.nt && d.ot).length;
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
      lang === 'zh' ? 'zh-TW' : lang === 'es' ? 'es-ES' : 'en-US',
      { month: 'short', day: 'numeric' }
    );
  }

  function timeAgo(ts) {
    const m = Math.floor((Date.now() - new Date(ts)) / 60000);
    if (m < 1) return lang === 'zh' ? '剛剛' : lang === 'es' ? 'ahora mismo' : 'just now';
    if (m < 60) return lang === 'zh' ? `${m}分鐘前` : lang === 'es' ? `hace ${m}m` : `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return lang === 'zh' ? `${h}小時前` : lang === 'es' ? `hace ${h}h` : `${h}h ago`;
    return lang === 'zh' ? `${Math.floor(h/24)}天前` : lang === 'es' ? `hace ${Math.floor(h/24)}d` : `${Math.floor(h/24)}d ago`;
  }

  const medals = ['🥇', '🥈', '🥉'];

  if (!name) {
    return (
      <div className="page">
        <div className="welcome-card">
          <div className="welcome-emoji">📖</div>
          <h1>{t.title}</h1>
          <p className="welcome-sub">{t.sub}</p>
          <div className="name-input-row">
            <input className="name-input" placeholder={t.namePlaceholder}
              value={nameInput} onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()} />
            <button className="start-btn" onClick={saveName}>{t.start}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
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

      <div className="home-buttons">
        {nextDate && (
          <button className="home-btn home-btn-primary"
            onClick={() => navigate(nextDate === new Date().toISOString().split('T')[0]
              ? '/reading' : `/reading?date=${nextDate}`)}>
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

      {loading ? <div className="loading">{t.loading}</div> : (
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
              ))}
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

      {recentComments.length > 0 && (
        <div className="recent-comments-section">
          <div className="comments-title">{t.recentComments}</div>
          {recentComments.map((c, i) => (
            <div className="comment" key={i}
              onClick={() => navigate(`/reading?date=${c.date}`)}
              style={{ cursor: 'pointer' }}>
              <div className="comment-header">
                <span className="comment-author">{c.name}</span>
                <span className="comment-time">{timeAgo(c.created_at)}</span>
              </div>
              <p className="comment-text">{c.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
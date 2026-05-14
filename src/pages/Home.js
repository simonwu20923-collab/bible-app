import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { HomeThreadCard } from '../components/CommentsSection';
import { useUser } from '../context/UserContext';

export default function Home({ lang = 'en' }) {
  const { user } = useUser();
  const name = user?.name || '';

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
    en: { title:'Church in Cerritos', sub:`Bible Reading Tracker ${year}`, streak:'Day Streak 🔥', fullDays:'Full Days ✓', daysRead:'Days Read', continueReading:'📖 Continue Reading', next:'Next:', todayReading:"📅 Today's Reading", goToDate:'Go to current date', viewSchedule:'🗓 View Schedule', calList:'Calendar & List', thisWeek:'🏆 This Week', allTime:'⭐ All Time', noReadings:'No readings this week yet', full:'full', days:'days', recentComments:'💬 Recent Comments', loading:'Loading...' },
    es: { title:'Iglesia en Cerritos', sub:`Registro de Lectura Bíblica ${year}`, streak:'Racha 🔥', fullDays:'Días Completos ✓', daysRead:'Días Leídos', continueReading:'📖 Continuar Leyendo', next:'Siguiente:', todayReading:'📅 Lectura de Hoy', goToDate:'Ir a la fecha actual', viewSchedule:'🗓 Ver Horario', calList:'Calendario y Lista', thisWeek:'🏆 Esta Semana', allTime:'⭐ Todo el Tiempo', noReadings:'Sin lecturas esta semana', full:'completo', days:'días', recentComments:'💬 Comentarios Recientes', loading:'Cargando...' },
    zh: { title:'喜瑞都召會', sub:`${year}年聖經閱讀記錄`, streak:'連續天數 🔥', fullDays:'完整天數 ✓', daysRead:'已讀天數', continueReading:'📖 繼續閱讀', next:'下一個：', todayReading:'📅 今日閱讀', goToDate:'前往今天', viewSchedule:'🗓 閱讀計劃', calList:'日曆與列表', thisWeek:'🏆 本週', allTime:'⭐ 總排行', noReadings:'本週還沒有閱讀記錄', full:'全部', days:'天', recentComments:'💬 最近留言', loading:'載入中...' },
    sc: { title:'喜瑞都召会', sub:`${year}年圣经阅读记录`, streak:'连续天数 🔥', fullDays:'完整天数 ✓', daysRead:'已读天数', continueReading:'📖 继续阅读', next:'下一个：', todayReading:'📅 今日阅读', goToDate:'前往今天', viewSchedule:'🗓 阅读计划', calList:'日历与列表', thisWeek:'🏆 本周', allTime:'⭐ 总排行', noReadings:'本周还没有阅读记录', full:'全部', days:'天', recentComments:'💬 最近留言', loading:'加载中...' },
  };
  const t = ui[lang] || ui.en;

  React.useEffect(() => { loadLeaderboard(); loadRecentComments(); }, []);

  // Re-run stats whenever the logged-in user changes
  React.useEffect(() => {
    setStats(null);
    setNextDate(null);
    if (name) loadMyStats(name);
  }, [name]);

  async function loadRecentComments() {
    const { data } = await supabase
      .from('comments')
      .select('id,name,text,date,created_at,reactions,parent_id')
      .order('created_at', { ascending: true })
      .limit(300);
    if (!data) return;

    const threadMap = {};
    const rootMap = {};
    data.forEach(c => { if (!c.parent_id) rootMap[c.id] = c; });
    data.forEach(c => {
      const rootId = c.parent_id
        ? (rootMap[c.parent_id] ? c.parent_id : data.find(x => x.id === c.parent_id)?.parent_id || c.parent_id)
        : c.id;
      if (!threadMap[rootId]) threadMap[rootId] = [];
      threadMap[rootId].push(c);
    });

    const threads = Object.entries(threadMap).map(([rootId, comments]) => {
      const latest = Math.max(...comments.map(c => new Date(c.created_at).getTime()));
      return { rootId, comments, latest };
    }).sort((a, b) => b.latest - a.latest).slice(0, 5);

    setRecentComments(threads);
  }

  async function loadMyStats(n) {
    const { data: rpcRows, error: rpcErr } = await supabase.rpc('get_personal_stats', {
      person_name: n, date_from: yearStart, date_to: yearEnd,
    });
    let data;
    if (!rpcErr && rpcRows) {
      data = rpcRows.map(r => ({ date: r.date, nt: r.has_nt, ot: r.has_ot, _fromRpc: true }));
    } else {
      let allRows = [];
      let p = 0;
      while (true) {
        const { data: batch } = await supabase.from('checkins').select('date,portion')
          .ilike('name', n).gte('date', yearStart).lte('date', yearEnd)
          .range(p * 1000, (p + 1) * 1000 - 1);
        if (!batch || batch.length === 0) break;
        allRows = allRows.concat(batch);
        if (batch.length < 1000) break;
        p++;
      }
      data = allRows;
    }
    if (!data || !data.length) return;

    const byDate = {};
    data.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = { nt: false, ot: false };
      if (r._fromRpc) { byDate[r.date].nt = r.nt; byDate[r.date].ot = r.ot; }
      else {
        if (r.portion === 'NT') byDate[r.date].nt = true;
        if (r.portion === 'OT') byDate[r.date].ot = true;
      }
    });

    const fullDays  = Object.values(byDate).filter(d => d.nt && d.ot).length;
    const totalDays = Object.keys(byDate).length;

    let streak = 0;
const today = new Date(); // keep this — used below for nextDate too
const todayKey = today.toLocaleDateString('en-CA');
const sortedDates = Object.keys(byDate).sort().reverse();
for (let i = 0; i < sortedDates.length; i++) {
  const expected = new Date(todayKey + 'T12:00:00');
  expected.setDate(expected.getDate() - i);
  const expectedKey = expected.toISOString().split('T')[0];
  if (byDate[expectedKey] && (byDate[expectedKey].nt || byDate[expectedKey].ot)) streak++;
  else break;
}

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
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_leaderboard', {
      date_from: yearStart, date_to: yearEnd,
    });

    if (!rpcError && rpcData) {
      const today = new Date();
      const weekAgo = new Date(); weekAgo.setDate(today.getDate() - 7);
      const weekStart = weekAgo.toISOString().split('T')[0];
      const { data: weekData } = await supabase.rpc('get_leaderboard', {
        date_from: weekStart, date_to: yearEnd,
      });
      setTopAllTime((rpcData || []).map(r => ({
        name: r.name, full: Number(r.full_days), total: Number(r.total_days),
      })));
      setTopWeek((weekData || []).map(r => ({
        name: r.name, full: Number(r.full_days), total: Number(r.total_days),
      })));
    } else {
      let allData = [];
      let page = 0;
      while (true) {
        const { data: batch } = await supabase.from('checkins').select('name,date,portion')
          .gte('date', yearStart).lte('date', yearEnd)
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (!batch || batch.length === 0) break;
        allData = allData.concat(batch);
        if (batch.length < 1000) break;
        page++;
      }
      if (allData.length) {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const buildStats = (rows) => {
          const map = {};
          rows.forEach(r => {
            const k = r.name.toLowerCase();
            if (!map[k]) map[k] = { name: r.name, dates: {} };
            if (!map[k].dates[r.date]) map[k].dates[r.date] = { nt: false, ot: false };
            if (r.portion === 'NT') map[k].dates[r.date].nt = true;
            if (r.portion === 'OT') map[k].dates[r.date].ot = true;
          });
          return Object.values(map).map(p => ({
            name: p.name,
            full: Object.values(p.dates).filter(d => d.nt && d.ot).length,
            total: Object.keys(p.dates).length,
          })).sort((a, b) => b.total - a.total || b.full - a.full).slice(0, 10);
        };
        setTopAllTime(buildStats(allData));
        setTopWeek(buildStats(allData.filter(r => new Date(r.date) >= weekAgo)));
      }
    }
    setLoading(false);
  }

  function formatDate(dateStr) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString(
      (lang === 'zh' || lang === 'sc') ? 'zh-TW' : lang === 'es' ? 'es-ES' : 'en-US',
      { month: 'short', day: 'numeric' }
    );
  }

  const medals = ['🥇', '🥈', '🥉'];

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

      {/* Recent comments */}
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
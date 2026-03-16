import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function Home() {
  const [name, setName] = React.useState(() => localStorage.getItem('bibleAppName') || '');
  const [nameInput, setNameInput] = React.useState('');
  const [stats, setStats] = React.useState(null);
  const [nextDate, setNextDate] = React.useState(null);
  const [topWeek, setTopWeek] = React.useState([]);
  const [topAllTime, setTopAllTime] = React.useState([]);
  const [recentComments, setRecentComments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => { loadLeaderboard(); loadRecentComments(); }, []);
  React.useEffect(() => { if (name) loadMyStats(name); }, [name]);

  async function loadRecentComments() {
    const { data } = await supabase.from('comments')
      .select('name, text, date, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
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

    // Find next unread date
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
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric'
    });
  }

  function timeAgo(ts) {
    const m = Math.floor((Date.now() - new Date(ts)) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  const medals = ['🥇', '🥈', '🥉'];

  if (!name) {
    return (
      <div className="page">
        <div className="welcome-card">
          <div className="welcome-emoji">📖</div>
          <h1>Church in Cerritos</h1>
          <p className="welcome-sub">Bible Reading Tracker 2026</p>
          <div className="name-input-row">
            <input className="name-input" placeholder="Enter your name..."
              value={nameInput} onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()} />
            <button className="start-btn" onClick={saveName}>Start →</button>
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
            <div className="stat-label">Day Streak 🔥</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.fullDays}</div>
            <div className="stat-label">Full Days ✓</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.totalDays}</div>
            <div className="stat-label">Days Read</div>
          </div>
        </div>
      )}

      <div className="home-buttons">
        {nextDate && (
          <button className="home-btn home-btn-primary"
            onClick={() => navigate(nextDate === new Date().toISOString().split('T')[0]
              ? '/reading' : `/reading?date=${nextDate}`)}>
            <div className="home-btn-title">📖 Continue Reading</div>
            <div className="home-btn-sub">Next: {formatDate(nextDate)}</div>
          </button>
        )}
        <button className="home-btn home-btn-green"
          onClick={() => navigate('/reading')}>
          <div className="home-btn-title">📅 Today's Reading</div>
          <div className="home-btn-sub">Go to current date</div>
        </button>
        <button className="home-btn home-btn-blue"
          onClick={() => navigate('/schedule')}>
          <div className="home-btn-title">🗓 View Schedule</div>
          <div className="home-btn-sub">Calendar & List</div>
        </button>
      </div>

      {loading ? <div className="loading">Loading...</div> : (
        <div className="leaderboards">
          <div className="leaderboard-card">
            <div className="leaderboard-title">🏆 This Week</div>
            {topWeek.length === 0
              ? <div className="lb-empty">No readings this week yet</div>
              : topWeek.map((r, i) => (
                <div className="lb-row" key={r.name}>
                  <span className="lb-rank">{medals[i] || i + 1}</span>
                  <span className="lb-name">{r.name}</span>
                  <span className="lb-score">{r.full} full · {r.total} days</span>
                </div>
              ))}
          </div>
          <div className="leaderboard-card">
            <div className="leaderboard-title">⭐ All Time</div>
            {topAllTime.map((r, i) => (
              <div className="lb-row" key={r.name}>
                <span className="lb-rank">{medals[i] || i + 1}</span>
                <span className="lb-name">{r.name}</span>
                <span className="lb-score">{r.full} full · {r.total} days</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentComments.length > 0 && (
        <div className="recent-comments-section">
          <div className="comments-title">💬 Recent Comments</div>
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
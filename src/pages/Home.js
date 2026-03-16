import React from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [name, setName] = React.useState(
    () => localStorage.getItem('bibleAppName') || ''
  );
  const [nameInput, setNameInput] = React.useState('');
  const [stats, setStats] = React.useState(null);
  const [topWeek, setTopWeek] = React.useState([]);
  const [topAllTime, setTopAllTime] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    loadLeaderboard();
  }, []);

  React.useEffect(() => {
    if (name) loadMyStats(name);
  }, [name]);

  async function loadLeaderboard() {
    setLoading(true);

    // Get all checkins
    const { data } = await supabase
      .from('checkins')
      .select('name, date, portion');

    if (data) {
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);

      // All-time: count unique days per person (both NT+OT = 1 full day)
      const allTimeDays = {};
      const byPersonDate = {};
      data.forEach(r => {
        const key = r.name.toLowerCase();
        if (!byPersonDate[key]) byPersonDate[key] = {};
        if (!byPersonDate[key][r.date]) byPersonDate[key][r.date] = { nt: false, ot: false };
        if (r.portion === 'NT') byPersonDate[key][r.date].nt = true;
        if (r.portion === 'OT') byPersonDate[key][r.date].ot = true;
        if (!allTimeDays[key]) allTimeDays[key] = { name: r.name, days: 0, full: 0 };
      });

      Object.entries(byPersonDate).forEach(([key, dates]) => {
        let days = 0, full = 0;
        Object.values(dates).forEach(d => {
          if (d.nt || d.ot) days++;
          if (d.nt && d.ot) full++;
        });
        allTimeDays[key].days = days;
        allTimeDays[key].full = full;
      });

      const allTimeList = Object.values(allTimeDays)
        .sort((a, b) => b.full - a.full || b.days - a.days)
        .slice(0, 10);
      setTopAllTime(allTimeList);

      // This week
      const weekData = data.filter(r => new Date(r.date) >= weekAgo);
      const weekDays = {};
      weekData.forEach(r => {
        const key = r.name.toLowerCase();
        if (!weekDays[key]) weekDays[key] = { name: r.name, days: 0, full: 0, dates: {} };
        if (!weekDays[key].dates[r.date]) weekDays[key].dates[r.date] = { nt: false, ot: false };
        if (r.portion === 'NT') weekDays[key].dates[r.date].nt = true;
        if (r.portion === 'OT') weekDays[key].dates[r.date].ot = true;
      });
      Object.values(weekDays).forEach(p => {
        let days = 0, full = 0;
        Object.values(p.dates).forEach(d => {
          if (d.nt || d.ot) days++;
          if (d.nt && d.ot) full++;
        });
        p.days = days;
        p.full = full;
      });

      const weekList = Object.values(weekDays)
        .sort((a, b) => b.full - a.full || b.days - a.days)
        .slice(0, 10);
      setTopWeek(weekList);
    }
    setLoading(false);
  }

  async function loadMyStats(currentName) {
    const { data } = await supabase
      .from('checkins')
      .select('date, portion')
      .ilike('name', currentName);

    if (data) {
      const byDate = {};
      data.forEach(r => {
        if (!byDate[r.date]) byDate[r.date] = { nt: false, ot: false };
        if (r.portion === 'NT') byDate[r.date].nt = true;
        if (r.portion === 'OT') byDate[r.date].ot = true;
      });

      const fullDays = Object.values(byDate).filter(d => d.nt && d.ot).length;
      const totalDays = Object.keys(byDate).length;

      // Calculate streak
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().split('T')[0];
        if (byDate[key] && (byDate[key].nt || byDate[key].ot)) {
          streak++;
        } else {
          break;
        }
      }

      setStats({ fullDays, totalDays, streak });
    }
  }

  function saveName() {
    if (nameInput.trim()) {
      localStorage.setItem('bibleAppName', nameInput.trim());
      setName(nameInput.trim());
    }
  }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="page">
      {!name ? (
        <div className="welcome-card">
          <div className="welcome-emoji">📖</div>
          <h1>Church in Cerritos</h1>
          <p className="welcome-sub">Bible Reading Tracker 2026</p>
          <div className="name-input-row">
            <input
              className="name-input"
              placeholder="Enter your name..."
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()}
            />
            <button className="start-btn" onClick={saveName}>Start →</button>
          </div>
        </div>
      ) : (
        <>
          {/* My Stats */}
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

          {/* Go to reading button */}
          <button className="start-btn go-btn" onClick={() => navigate('/reading')}>
            📖 Go to Today's Reading →
          </button>

          {loading ? (
            <div className="loading">Loading leaderboard...</div>
          ) : (
            <div className="leaderboards">
              {/* This week */}
              <div className="leaderboard-card">
                <div className="leaderboard-title">🏆 This Week</div>
                {topWeek.length === 0 ? (
                  <div className="lb-empty">No readings this week yet</div>
                ) : (
                  topWeek.map((r, i) => (
                    <div className="lb-row" key={r.name}>
                      <span className="lb-rank">{medals[i] || i + 1}</span>
                      <span className="lb-name">{r.name}</span>
                      <span className="lb-score">{r.full} full · {r.days} days</span>
                    </div>
                  ))
                )}
              </div>

              {/* All time */}
              <div className="leaderboard-card">
                <div className="leaderboard-title">⭐ All Time</div>
                {topAllTime.length === 0 ? (
                  <div className="lb-empty">No readings yet</div>
                ) : (
                  topAllTime.map((r, i) => (
                    <div className="lb-row" key={r.name}>
                      <span className="lb-rank">{medals[i] || i + 1}</span>
                      <span className="lb-name">{r.name}</span>
                      <span className="lb-score">{r.full} full · {r.days} days</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
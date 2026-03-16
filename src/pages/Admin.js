import React from 'react';
import { supabase } from '../supabase';

const ADMIN_PIN = '12061';

export default function Admin() {
  const [pin, setPin] = React.useState('');
  const [authed, setAuthed] = React.useState(
    () => sessionStorage.getItem('adminAuthed') === 'true'
  );
  const [pinError, setPinError] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState(null);
  const [selectedDate, setSelectedDate] = React.useState(
    new Date().toISOString().split('T')[0]
  );

  React.useEffect(() => {
    if (authed) loadAdminData();
  }, [authed, selectedDate]);

  function handlePin() {
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem('adminAuthed', 'true');
      setAuthed(true);
    } else {
      setPinError(true);
      setPin('');
    }
  }

  async function loadAdminData() {
    setLoading(true);
    const { data: all } = await supabase
      .from('checkins')
      .select('name, date, portion, created_at')
      .order('created_at', { ascending: false });

    if (!all) { setLoading(false); return; }

    const today = new Date().toISOString().split('T')[0];

    // Today's check-ins
    const todayCheckins = all.filter(r => r.date === selectedDate);
    const todayMap = {};
    todayCheckins.forEach(r => {
      const key = r.name.toLowerCase();
      if (!todayMap[key]) todayMap[key] = { name: r.name, nt: false, ot: false };
      if (r.portion === 'NT') todayMap[key].nt = true;
      if (r.portion === 'OT') todayMap[key].ot = true;
    });
    const todayReaders = Object.values(todayMap);

    // All-time stats per person
    const peopleMap = {};
    all.forEach(r => {
      const key = r.name.toLowerCase();
      if (!peopleMap[key]) peopleMap[key] = {
        name: r.name, dates: {}, lastDate: null
      };
      if (!peopleMap[key].dates[r.date]) {
        peopleMap[key].dates[r.date] = { nt: false, ot: false };
      }
      if (r.portion === 'NT') peopleMap[key].dates[r.date].nt = true;
      if (r.portion === 'OT') peopleMap[key].dates[r.date].ot = true;
      if (!peopleMap[key].lastDate || r.date > peopleMap[key].lastDate) {
        peopleMap[key].lastDate = r.date;
      }
    });

    // Top readers
    const topReaders = Object.values(peopleMap).map(p => {
      const fullDays = Object.values(p.dates).filter(d => d.nt && d.ot).length;
      const totalDays = Object.keys(p.dates).length;
      return { name: p.name, fullDays, totalDays, lastDate: p.lastDate };
    }).sort((a, b) => b.fullDays - a.fullDays || b.totalDays - a.totalDays);

    // Inactive readers (haven't read in 3+ days)
    const inactive = Object.values(peopleMap).map(p => {
      const last = new Date(p.lastDate);
      const now = new Date(today);
      const daysAgo = Math.floor((now - last) / (1000 * 60 * 60 * 24));
      return { name: p.name, lastDate: p.lastDate, daysAgo };
    })
    .filter(p => p.daysAgo >= 3)
    .sort((a, b) => b.daysAgo - a.daysAgo);

    setData({
      totalCheckins: all.length,
      uniqueUsers: Object.keys(peopleMap).length,
      todayReaders,
      topReaders: topReaders.slice(0, 10),
      inactive,
    });
    setLoading(false);
  }

  if (!authed) {
    return (
      <div className="page">
        <div className="welcome-card">
          <div className="welcome-emoji">🔐</div>
          <h1>Admin Access</h1>
          <p className="welcome-sub">Enter PIN to continue</p>
          <div className="name-input-row">
            <input
              className="name-input"
              type="password"
              placeholder="Enter PIN..."
              value={pin}
              onChange={e => { setPin(e.target.value); setPinError(false); }}
              onKeyDown={e => e.key === 'Enter' && handlePin()}
            />
            <button className="start-btn" onClick={handlePin}>Enter →</button>
          </div>
          {pinError && <p style={{color:'#f87171', marginTop:'12px'}}>Incorrect PIN</p>}
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return <div className="page"><div className="loading">Loading admin data...</div></div>;
  }

  return (
    <div className="page">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-date-picker">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>
      </div>

      {/* Summary stats */}
      <div className="stats-row" style={{marginBottom: '24px'}}>
        <div className="stat-card">
          <div className="stat-number">{data.uniqueUsers}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{data.totalCheckins}</div>
          <div className="stat-label">Total Check-ins</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{data.todayReaders.length}</div>
          <div className="stat-label">Read on {selectedDate}</div>
        </div>
      </div>

      <div className="admin-grid">

        {/* Today's readers */}
        <div className="admin-card">
          <div className="admin-card-title">
            📅 Readers on {selectedDate} ({data.todayReaders.length})
          </div>
          {data.todayReaders.length === 0 ? (
            <div className="lb-empty">No check-ins on this date</div>
          ) : (
            <div className="readers-table">
              <div className="readers-header">
                <span>Name</span><span>NT</span><span>OT</span>
              </div>
              {data.todayReaders.map(r => (
                <div className="readers-row" key={r.name}>
                  <span>{r.name}</span>
                  <span>{r.nt ? <span className="check-nt">✓</span> : '—'}</span>
                  <span>{r.ot ? <span className="check-ot">✓</span> : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top readers */}
        <div className="admin-card">
          <div className="admin-card-title">⭐ Top Readers (All Time)</div>
          {data.topReaders.map((r, i) => (
            <div className="lb-row" key={r.name}>
              <span className="lb-rank">{i + 1}</span>
              <span className="lb-name">{r.name}</span>
              <span className="lb-score">{r.fullDays} full · {r.totalDays} days</span>
            </div>
          ))}
        </div>

        {/* Inactive readers */}
        <div className="admin-card admin-card-full">
          <div className="admin-card-title">
            ⚠️ Haven't Read in 3+ Days ({data.inactive.length})
          </div>
          {data.inactive.length === 0 ? (
            <div className="lb-empty">Everyone is on track! 🎉</div>
          ) : (
            <div className="readers-table">
              <div className="readers-header" style={{gridTemplateColumns:'1fr 140px 100px'}}>
                <span>Name</span><span>Last Read</span><span>Days Ago</span>
              </div>
              {data.inactive.map(r => (
                <div className="readers-row" key={r.name}
                  style={{gridTemplateColumns:'1fr 140px 100px'}}>
                  <span>{r.name}</span>
                  <span>{r.lastDate}</span>
                  <span style={{color: r.daysAgo >= 7 ? '#f87171' : '#fbbf24'}}>
                    {r.daysAgo} days
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
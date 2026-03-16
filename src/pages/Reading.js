import React from 'react';
import { supabase } from '../supabase';
import { getTodayReading } from '../data/schedule';

const reading = getTodayReading();
const todayStr = new Date().toISOString().split('T')[0];
const todayLabel = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

export default function Reading() {
  const [name, setName] = React.useState(
    () => localStorage.getItem('bibleAppName') || ''
  );
  const [nameInput, setNameInput] = React.useState('');
  const [ntDone, setNtDone] = React.useState(false);
  const [otDone, setOtDone] = React.useState(false);
  const [saving, setSaving] = React.useState('');
  const [todayReaders, setTodayReaders] = React.useState([]);

  // Load today's check-ins and check if user already checked in
  React.useEffect(() => {
    if (!name) return;
    loadTodayReaders(name);
  }, [name]);

  async function loadTodayReaders(currentName) {
    const { data } = await supabase
      .from('checkins')
      .select('name, portion')
      .eq('date', todayStr)
      .order('created_at', { ascending: true });

    if (data) {
      // Check if this user already checked in
      const myCheckins = data.filter(r => 
        r.name.toLowerCase() === currentName.toLowerCase()
      );
      if (myCheckins.some(r => r.portion === 'NT')) setNtDone(true);
      if (myCheckins.some(r => r.portion === 'OT')) setOtDone(true);

      // Build today's readers list (one row per person)
      const readersMap = {};
      data.forEach(r => {
        const key = r.name.toLowerCase();
        if (!readersMap[key]) readersMap[key] = { name: r.name, nt: false, ot: false };
        if (r.portion === 'NT') readersMap[key].nt = true;
        if (r.portion === 'OT') readersMap[key].ot = true;
      });
      setTodayReaders(Object.values(readersMap));
    }
  }

  async function handleCheckin(portion, done, setDone) {
    if (done || saving) return;
    setSaving(portion);

    // Double-check for duplicate before inserting
    const { data: existing } = await supabase
      .from('checkins')
      .select('id')
      .eq('date', todayStr)
      .eq('portion', portion)
      .ilike('name', name);

    if (existing && existing.length > 0) {
      setDone(true);
      setSaving('');
      return;
    }

    const { error } = await supabase.from('checkins').insert({
      name, date: todayStr, portion,
    });

    if (!error) {
      setDone(true);
      loadTodayReaders(name);
    }
    setSaving('');
  }

  function saveName() {
    if (nameInput.trim()) {
      localStorage.setItem('bibleAppName', nameInput.trim());
      setName(nameInput.trim());
    }
  }

  if (!name) {
    return (
      <div className="page">
        <div className="welcome-card">
          <div className="welcome-emoji">📖</div>
          <h1>What's your name?</h1>
          <p className="welcome-sub">So we can track your reading</p>
          <div className="name-input-row">
            <input
              className="name-input"
              placeholder="Enter your name..."
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()}
            />
            <button className="start-btn" onClick={saveName}>Save →</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="reading-header">
        <div className="reading-date">{todayLabel}</div>
        <div className="reading-greeting">Hi {name} 👋</div>
      </div>

      <div className="reading-cards">
        <div className={`reading-card ${ntDone ? 'done' : ''}`}>
          <div className="reading-card-header">
            <span className="reading-tag nt-tag">NT</span>
            <span className="reading-portion">{reading.nt}</span>
          </div>
          <button
            className={`checkin-btn ${ntDone ? 'checked' : ''}`}
            onClick={() => handleCheckin('NT', ntDone, setNtDone)}
            disabled={ntDone || !!saving}
          >
            {saving === 'NT' ? 'Saving...' : ntDone ? '✓ Finished NT' : 'Finish NT'}
          </button>
        </div>

        <div className={`reading-card ${otDone ? 'done' : ''}`}>
          <div className="reading-card-header">
            <span className="reading-tag ot-tag">OT</span>
            <span className="reading-portion">{reading.ot}</span>
          </div>
          <button
            className={`checkin-btn ot ${otDone ? 'checked' : ''}`}
            onClick={() => handleCheckin('OT', otDone, setOtDone)}
            disabled={otDone || !!saving}
          >
            {saving === 'OT' ? 'Saving...' : otDone ? '✓ Finished OT' : 'Finish OT'}
          </button>
        </div>
      </div>

      {ntDone && otDone && (
        <div className="completed-banner">
          🎉 You completed both readings today!
        </div>
      )}

      {todayReaders.length > 0 && (
        <div className="readers-section">
          <div className="readers-title">Today's Readers ({todayReaders.length})</div>
          <div className="readers-table">
            <div className="readers-header">
              <span>Name</span>
              <span>NT</span>
              <span>OT</span>
            </div>
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
    </div>
  );
}
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
  const [verses, setVerses] = React.useState(null);
  const [showNT, setShowNT] = React.useState(false);
  const [showOT, setShowOT] = React.useState(false);

  React.useEffect(() => {
    loadVerses();
  }, []);

  React.useEffect(() => {
    if (name) loadTodayReaders(name);
  }, [name]);

  async function loadVerses() {
    const { data } = await supabase
      .from('verses')
      .select('nt_title, nt_text, ot_title, ot_text')
      .eq('date', todayStr)
      .single();
    if (data) setVerses(data);
  }

  async function loadTodayReaders(currentName) {
    const { data } = await supabase
      .from('checkins')
      .select('name, portion')
      .eq('date', todayStr)
      .order('created_at', { ascending: true });

    if (data) {
      const myCheckins = data.filter(r =>
        r.name.toLowerCase() === currentName.toLowerCase()
      );
      if (myCheckins.some(r => r.portion === 'NT')) setNtDone(true);
      if (myCheckins.some(r => r.portion === 'OT')) setOtDone(true);

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

  function formatVerseText(text) {
    if (!text) return null;
    // Each verse starts with "Mt 1 :1" or "Gn 1 :1" pattern
    return text.split('\n').map((line, i) => {
      const match = line.match(/^([A-Z][a-z]+ \d+ :\d+)\s+(.*)/);
      if (match) {
        return (
          <p key={i} className="verse-line">
            <span className="verse-ref">{match[1]}</span>
            <span className="verse-body"> {match[2]}</span>
          </p>
        );
      }
      return line ? <p key={i} className="verse-line">{line}</p> : null;
    });
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
        {/* NT Card */}
        <div className={`reading-card ${ntDone ? 'done' : ''}`}>
          <div className="reading-card-header">
            <span className="reading-tag nt-tag">NT</span>
            <span className="reading-portion">{reading.nt}</span>
          </div>
          {verses && (
            <button
              className="verses-toggle"
              onClick={() => setShowNT(!showNT)}
            >
              {showNT ? '▲ Hide verses' : '▼ Read verses'}
            </button>
          )}
          {showNT && verses && (
            <div className="verses-box">
              <div className="verses-title">{verses.nt_title}</div>
              <div className="verses-text">
                {formatVerseText(verses.nt_text)}
              </div>
            </div>
          )}
          <button
            className={`checkin-btn ${ntDone ? 'checked' : ''}`}
            onClick={() => handleCheckin('NT', ntDone, setNtDone)}
            disabled={ntDone || !!saving}
          >
            {saving === 'NT' ? 'Saving...' : ntDone ? '✓ Finished NT' : 'Finish NT'}
          </button>
        </div>

        {/* OT Card */}
        <div className={`reading-card ${otDone ? 'done' : ''}`}>
          <div className="reading-card-header">
            <span className="reading-tag ot-tag">OT</span>
            <span className="reading-portion">{reading.ot}</span>
          </div>
          {verses && (
            <button
              className="verses-toggle"
              onClick={() => setShowOT(!showOT)}
            >
              {showOT ? '▲ Hide verses' : '▼ Read verses'}
            </button>
          )}
          {showOT && verses && (
            <div className="verses-box">
              <div className="verses-title">{verses.ot_title}</div>
              <div className="verses-text">
                {formatVerseText(verses.ot_text)}
              </div>
            </div>
          )}
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
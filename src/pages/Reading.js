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

  function saveName() {
    if (nameInput.trim()) {
      localStorage.setItem('bibleAppName', nameInput.trim());
      setName(nameInput.trim());
    }
  }

  async function handleCheckin(portion, done, setDone) {
    if (done) return;
    setSaving(portion);
    const { error } = await supabase.from('checkins').insert({
      name,
      date: todayStr,
      portion,
    });
    if (error) {
      alert('Error saving: ' + error.message);
    } else {
      setDone(true);
    }
    setSaving('');
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
            disabled={ntDone || saving === 'NT'}
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
            disabled={otDone || saving === 'OT'}
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
    </div>
  );
}
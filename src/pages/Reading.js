import React from 'react';
import { getTodayReading } from '../data/schedule';

const reading = getTodayReading();
const todayReading = {
  date: new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }),
  nt: { portion: reading.nt, description: '' },
  ot: { portion: reading.ot, description: '' },
};

export default function Reading() {
  const [name, setName] = React.useState(() => localStorage.getItem('bibleAppName') || '');
  const [nameInput, setNameInput] = React.useState('');
  const [ntDone, setNtDone] = React.useState(false);
  const [otDone, setOtDone] = React.useState(false);

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
        <div className="reading-date">{todayReading.date}</div>
        <div className="reading-greeting">Hi {name} 👋</div>
      </div>

      <div className="reading-cards">

        <div className={`reading-card ${ntDone ? 'done' : ''}`}>
          <div className="reading-card-header">
            <span className="reading-tag nt-tag">NT</span>
            <span className="reading-portion">{todayReading.nt.portion}</span>
          </div>
          <p className="reading-desc">{todayReading.nt.description}</p>
          <button
            className={`checkin-btn ${ntDone ? 'checked' : ''}`}
            onClick={() => setNtDone(!ntDone)}
          >
            {ntDone ? '✓ Finished NT' : 'Finish NT'}
          </button>
        </div>

        <div className={`reading-card ${otDone ? 'done' : ''}`}>
          <div className="reading-card-header">
            <span className="reading-tag ot-tag">OT</span>
            <span className="reading-portion">{todayReading.ot.portion}</span>
          </div>
          <p className="reading-desc">{todayReading.ot.description}</p>
          <button
            className={`checkin-btn ot ${otDone ? 'checked' : ''}`}
            onClick={() => setOtDone(!otDone)}
          >
            {otDone ? '✓ Finished OT' : 'Finish OT'}
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
import React from 'react';
import { Link } from 'react-router-dom';

// Landing page for the "Finished NT/OT" links in the daily email.
//
// The check-in is recorded from here rather than by the link itself. Mail
// scanners fetch every URL in a message to vet it, so a link that wrote on GET
// would record readings nobody did. Scanners load HTML but do not run scripts,
// so doing the write from JavaScript is what keeps the streaks honest.

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;

const LABEL = { NT: 'New Testament', OT: 'Old Testament' };

export default function CheckinConfirm() {
  const [state, setState] = React.useState({ status: 'working' });

  React.useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('t');
    if (!token) { setState({ status: 'error', message: 'This link is missing its code.' }); return; }

    let cancelled = false;
    fetch(`${SUPABASE_URL}/functions/v1/verify-checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(r => {
        if (cancelled) return;
        setState(r.ok
          ? { status: 'done', ...r }
          : { status: 'error', message: r.error || 'That link could not be used.' });
      })
      .catch(() => { if (!cancelled) setState({ status: 'error', message: 'Could not reach the server.' }); });
    return () => { cancelled = true; };
  }, []);

  const { status } = state;

  return (
    <div className="page">
      <div className="welcome-card">
        {status === 'working' && (
          <>
            <div className="welcome-emoji">⏳</div>
            <h1>Recording…</h1>
            <p className="welcome-sub">One moment.</p>
          </>
        )}

        {status === 'done' && (
          <>
            <div className="welcome-emoji">{state.already ? '👍' : '🎉'}</div>
            <h1>{state.already ? 'Already logged' : 'Logged!'}</h1>
            <p className="welcome-sub">
              {LABEL[state.portion] || state.portion} for {state.date}
              {state.name ? ` — ${state.name}` : ''}
              {state.already ? ' was already marked finished.' : ' is marked finished.'}
            </p>
            <div className="checkin-actions">
              <Link className="start-btn" to={`/reading?date=${state.date}`}>Open today's reading →</Link>
              <Link className="checkin-link" to="/">Go to home</Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="welcome-emoji">⚠️</div>
            <h1>Couldn't log that</h1>
            <p className="welcome-sub">{state.message}</p>
            <div className="checkin-actions">
              <Link className="start-btn" to="/reading">Mark it on the site instead →</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

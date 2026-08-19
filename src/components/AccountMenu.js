import React from 'react';
import NotifyPreferences, { TEXT } from './NotifyPreferences';

// The account name opens everything to do with the reader: how they hear from
// us, and logging out. Hover opens it on a mouse, tap or keyboard opens it
// everywhere else — hover alone would leave touch users with no way in.

export default function AccountMenu({ user, lang = 'en', onLogout }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const closeTimer = React.useRef(null);
  const t = TEXT[lang] || TEXT.en;

  React.useEffect(() => {
    if (!open) return;
    const away = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  React.useEffect(() => () => clearTimeout(closeTimer.current), []);

  // A short delay on leaving, so crossing the gap between the name and the panel
  // does not shut it in the reader's face.
  const openNow = () => { clearTimeout(closeTimer.current); setOpen(true); };
  const closeSoon = () => { closeTimer.current = setTimeout(() => setOpen(false), 260); };

  return (
    <div
      className="account-menu"
      ref={ref}
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      <button
        className={`account-name${open ? ' is-open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span aria-hidden="true">👤</span>
        <span className="account-name-text">{user.name}</span>
        <span className="account-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="account-panel" role="dialog" aria-label={user.name}>
          <NotifyPreferences email={user.email} lang={lang} />
          <button className="account-logout" onClick={onLogout}>{t.logout}</button>
        </div>
      )}
    </div>
  );
}

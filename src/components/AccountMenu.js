import React from 'react';
import NotifyPreferences, { TEXT, prefetchPreferences } from './NotifyPreferences';
import RenameAccount from './RenameAccount';

// The account name opens everything to do with the reader: how they hear from
// us, and logging out. Hover opens it on a mouse, tap or keyboard opens it
// everywhere else — hover alone would leave touch users with no way in.

const CLOSE = { en: 'Close', es: 'Cerrar', zh: '關閉', sc: '关闭' };

// Phones report a mouseenter just before the click, so binding both meant a
// tap opened the panel and then the click immediately toggled it shut again.
// Hover is only wired up where a real pointer exists.
const CAN_HOVER =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export default function AccountMenu({ user, lang = 'en', onLogout }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const closeTimer = React.useRef(null);
  const t = TEXT[lang] || TEXT.en;
  const closeLabel = CLOSE[lang] || CLOSE.en;

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

  // Warmed while the reader is doing something else, so the panel has its
  // values ready the moment they reach for it rather than fetching on open.
  React.useEffect(() => { prefetchPreferences(user?.email); }, [user?.email]);

  // A short delay on leaving, so crossing the gap between the name and the panel
  // does not shut it in the reader's face.
  const openNow = () => { clearTimeout(closeTimer.current); setOpen(true); };
  const closeSoon = () => { closeTimer.current = setTimeout(() => setOpen(false), 260); };

  return (
    <div
      className="account-menu"
      ref={ref}
      {...(CAN_HOVER ? { onMouseEnter: openNow, onMouseLeave: closeSoon } : {})}
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
        <>
          {/* On a phone the panel covers the screen, so there needs to be
              somewhere to tap that means "I'm done". Inert on desktop, where
              moving the mouse away already closes it. */}
          <div className="account-backdrop" onClick={() => setOpen(false)} />
          <div className="account-panel" role="dialog" aria-label={user.name}>
            <div className="account-panel-head">
              <span className="account-panel-title">{user.name}</span>
              <button
                className="account-panel-close"
                onClick={() => setOpen(false)}
                aria-label={closeLabel}
              >
                ✕
              </button>
            </div>
            <RenameAccount lang={lang} />
            <NotifyPreferences email={user.email} lang={lang} />
            <button className="account-logout" onClick={onLogout}>{t.logout}</button>
          </div>
        </>
      )}
    </div>
  );
}

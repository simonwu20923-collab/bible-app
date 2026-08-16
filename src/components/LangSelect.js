import React from 'react';
import Flag from './Flag';

// A language picker that can show the SVG flags.
//
// A native <select> cannot: <option> renders as plain text, so no image or SVG
// survives inside it. On phones the flag emoji happened to render, on Windows
// they fell back to the letters "US"/"ES" — the inconsistency this replaces.

const OPTIONS = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'zh', name: 'Traditional' },
  { code: 'sc', name: 'Simplified' },
];

export default function LangSelect({ value, onChange, label }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef(null);
  const current = OPTIONS.find(o => o.code === value) || OPTIONS[0];

  React.useEffect(() => {
    if (!open) return;
    const onDown = e => { if (!rootRef.current || !rootRef.current.contains(e.target)) setOpen(false); };
    const onKey  = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="lang-select" ref={rootRef}>
      <button
        type="button"
        className="lang-select-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen(o => !o)}
      >
        <Flag code={current.code} />
        <span className="lang-select-name">{current.name}</span>
        <span className="lang-select-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <ul className="lang-select-menu" role="listbox">
          {OPTIONS.map(o => (
            <li key={o.code}>
              <button
                type="button"
                role="option"
                aria-selected={o.code === value}
                className={`lang-select-option${o.code === value ? ' is-selected' : ''}`}
                onClick={() => { onChange(o.code); setOpen(false); }}
              >
                <Flag code={o.code} />
                <span>{o.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

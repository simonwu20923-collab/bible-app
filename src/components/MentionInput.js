import React from 'react';

// A textarea that offers the member list after "@". Names contain spaces, so
// the query runs from the "@" to the caret and is matched against whole names
// rather than a single word.
export default function MentionInput({
  value, onChange, names, placeholder, rows = 3, style, onKeyDown, className,
}) {
  const ref = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [at, setAt] = React.useState(-1);
  const [active, setActive] = React.useState(0);

  const matches = React.useMemo(() => {
    if (!open) return [];
    const q = query.trim().toLowerCase();
    return names
      .filter(n => !q || n.toLowerCase().includes(q))
      .slice(0, 6);
  }, [open, query, names]);

  function recompute(text, caret) {
    const upto = text.slice(0, caret);
    const i = upto.lastIndexOf('@');
    // Only offer while the caret is still on the same line and reasonably close
    // to the "@" — long names are fine, whole paragraphs are not.
    if (i === -1 || caret - i > 25 || /\n/.test(upto.slice(i))) {
      setOpen(false); setAt(-1); return;
    }
    setAt(i);
    setQuery(upto.slice(i + 1));
    setOpen(true);
    setActive(0);
  }

  function pick(name) {
    const el = ref.current;
    const caret = el ? el.selectionStart : value.length;
    const next = value.slice(0, at) + '@' + name + ' ' + value.slice(caret);
    onChange(next);
    setOpen(false); setAt(-1);
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = at + name.length + 2;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function keyDown(e) {
    if (open && matches.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => (a + 1) % matches.length); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => (a - 1 + matches.length) % matches.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(matches[active]); return; }
      if (e.key === 'Escape')    { setOpen(false); return; }
    }
    if (onKeyDown) onKeyDown(e);
  }

  return (
    <div className="mention-wrap">
      <textarea
        ref={ref}
        className={className}
        style={style}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onKeyDown={keyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={e => { onChange(e.target.value); recompute(e.target.value, e.target.selectionStart); }}
        onClick={e => recompute(e.target.value, e.target.selectionStart)}
      />
      {open && matches.length > 0 && (
        <div className="mention-list">
          {matches.map((n, i) => (
            <button key={n} type="button"
                    className={`mention-opt${i === active ? ' active' : ''}`}
                    onMouseDown={e => { e.preventDefault(); pick(n); }}
                    onMouseEnter={() => setActive(i)}>
              @{n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

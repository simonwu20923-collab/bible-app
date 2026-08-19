import React from 'react';
import { supabase } from '../supabase';
import Flag from './Flag';

// Daily reading email: on/off, and which languages the reading arrives in.
//
// Off by default for everyone — nobody is enrolled without asking, which is both
// the decent thing and what keeps the sending domain's reputation intact.

const LANGS = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'zh', name: '繁體' },
  { code: 'sc', name: '简体' },
];

const TEXT = {
  en: { on: 'Daily email on', off: 'Daily email off', heading: 'Daily reading email',
        langs: 'Send the reading in', note: 'Spanish sends the passages only — the devotional has no Spanish edition yet.',
        keepOne: 'Keep at least one language selected.', max: 'Two languages at most — a longer email gets cut short by Gmail.' },
  es: { on: 'Correo diario activado', off: 'Correo diario desactivado', heading: 'Correo de lectura diaria',
        langs: 'Enviar la lectura en', note: 'En español se envían solo los pasajes; el devocional aún no existe en español.',
        keepOne: 'Mantén al menos un idioma seleccionado.', max: 'Máximo dos idiomas — Gmail recorta los correos más largos.' },
  zh: { on: '每日郵件開啟', off: '每日郵件關閉', heading: '每日讀經郵件',
        langs: '郵件語言', note: '西班牙文只寄經文，靈修內容尚無西班牙文版本。',
        keepOne: '請至少保留一種語言。', max: '最多兩種語言，過長的郵件會被 Gmail 截斷。' },
  sc: { on: '每日邮件开启', off: '每日邮件关闭', heading: '每日读经邮件',
        langs: '邮件语言', note: '西班牙文只寄经文，灵修内容尚无西班牙文版本。',
        keepOne: '请至少保留一种语言。', max: '最多两种语言，过长的邮件会被 Gmail 截断。' },
};

export default function DailyEmailToggle({ email, lang = 'en' }) {
  const [on, setOn] = React.useState(null);       // null until loaded
  const [langs, setLangs] = React.useState(['en']);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [warn, setWarn] = React.useState('');
  const ref = React.useRef(null);
  const t = TEXT[lang] || TEXT.en;

  React.useEffect(() => {
    if (!email) return;
    let cancelled = false;
    supabase.from('users').select('daily_email, email_langs').eq('email', email).maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setOn(!!data.daily_email);
        setLangs(data.email_langs?.length ? data.email_langs : ['en']);
      });
    return () => { cancelled = true; };
  }, [email]);

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

  async function save(patch, revert) {
    setBusy(true);
    const { error } = await supabase.from('users').update(patch).eq('email', email);
    if (error) revert();
    setBusy(false);
  }

  function toggleOn() {
    const next = !on;
    setOn(next);
    save({ daily_email: next }, () => setOn(!next));
  }

  const MAX_LANGS = 2;

  function toggleLang(code) {
    const adding = !langs.includes(code);
    const next = adding ? [...langs, code] : langs.filter(c => c !== code);
    // An empty list would mean a daily email with nothing in it.
    if (next.length === 0) { setWarn(t.keepOne); setTimeout(() => setWarn(''), 2600); return; }
    // Three languages overflow Gmail's ~102KB limit on the longest readings, so
    // the choice is capped rather than silently trimmed at send time.
    if (adding && next.length > MAX_LANGS) { setWarn(t.max); setTimeout(() => setWarn(''), 3200); return; }
    const previous = langs;
    setWarn('');
    // Keep a stable order so the email reads the same way every morning.
    const ordered = LANGS.map(l => l.code).filter(c => next.includes(c));
    setLangs(ordered);
    save({ email_langs: ordered }, () => setLangs(previous));
  }

  if (on === null) return null;      // nothing to show until we know

  return (
    <div className="daily-email" ref={ref}>
      <button
        className={`daily-email-toggle${on ? ' is-on' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span aria-hidden="true">{on ? '📬' : '📭'}</span>
        <span className="daily-email-label">{on ? t.on : t.off}</span>
      </button>

      {open && (
        <div className="daily-email-panel" role="dialog" aria-label={t.heading}>
          <label className="de-switch">
            <input type="checkbox" checked={on} onChange={toggleOn} disabled={busy} />
            <span>{t.heading}</span>
          </label>

          <div className={`de-langs${on ? '' : ' is-muted'}`}>
            <div className="de-heading">{t.langs}</div>
            {LANGS.map(l => (
              <label key={l.code} className="de-lang">
                <input
                  type="checkbox"
                  checked={langs.includes(l.code)}
                  // Left enabled at the cap on purpose: a greyed-out box gives no
                  // reason, whereas clicking it explains why two is the limit.
                  onChange={() => toggleLang(l.code)}
                  disabled={busy}
                />
                <Flag code={l.code} size={18} />
                <span>{l.name}</span>
              </label>
            ))}
            {warn && <div className="de-warn">{warn}</div>}
            {langs.includes('es') && <div className="de-note">{t.note}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { supabase } from '../supabase';

// Opt in / out of the daily reading email, from the navbar.
//
// Off by default for everyone — nobody is enrolled without asking, which is both
// the decent thing and what keeps the sending domain's reputation intact.

const TEXT = {
  en: { on: 'Daily email on', off: 'Daily email off', title: 'Email me today\'s reading each morning' },
  es: { on: 'Correo diario activado', off: 'Correo diario desactivado', title: 'Enviarme la lectura de hoy cada mañana' },
  zh: { on: '每日郵件開啟', off: '每日郵件關閉', title: '每天早上寄給我今日讀經' },
  sc: { on: '每日邮件开启', off: '每日邮件关闭', title: '每天早上寄给我今日读经' },
};

export default function DailyEmailToggle({ email, lang = 'en' }) {
  const [on, setOn] = React.useState(null);   // null until loaded
  const [busy, setBusy] = React.useState(false);
  const t = TEXT[lang] || TEXT.en;

  React.useEffect(() => {
    if (!email) return;
    let cancelled = false;
    supabase.from('users').select('daily_email').eq('email', email).maybeSingle()
      .then(({ data }) => { if (!cancelled) setOn(!!data?.daily_email); });
    return () => { cancelled = true; };
  }, [email]);

  async function toggle() {
    if (busy || on === null) return;
    const next = !on;
    setBusy(true);
    setOn(next);                                  // optimistic
    const { error } = await supabase
      .from('users').update({ daily_email: next }).eq('email', email);
    if (error) setOn(!next);                      // put it back if the write failed
    setBusy(false);
  }

  if (on === null) return null;                   // nothing to show until we know

  return (
    <button
      className={`daily-email-toggle${on ? ' is-on' : ''}`}
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
      title={t.title}
    >
      <span aria-hidden="true">{on ? '📬' : '📭'}</span>
      <span className="daily-email-label">{on ? t.on : t.off}</span>
    </button>
  );
}

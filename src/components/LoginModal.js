import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useUser } from '../context/UserContext';
import Flag from './Flag';
import { AppleHelp, TEXT as NOTIFY_TEXT } from './NotifyPreferences';
import { isPushSupported, permission, subscribe } from '../push';

const LANGS = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'zh', name: '繁體' },
  { code: 'sc', name: '简体' },
];

const TEXT = {
  en: {
    title: 'Church in Cerritos',
    subtitle: 'Bible Reading Tracker',
    desc: 'Enter your name and email to get started.\nYour reading history will be linked to your name.',
    namePlaceholder: 'Your name (e.g. John Doe)',
    emailPlaceholder: 'Your email',
    button: 'Enter',
    loading: 'Checking...',
    errorBoth: 'Please enter both your name and email.',
    errorEmail: 'Please enter a valid email address.',
    errorTaken: 'This name is already taken. Please choose a different name.',
    errorGeneric: 'Something went wrong. Please try again.',
    recoverAsk: 'Forgot your name?',
    recoverSending: 'Sending…',
    recoverNeedEmail: 'Enter your email above first.',
    recoverSent: 'If that address has an account, we have emailed the name to it.',
    google: 'Continue with Google',
    orDivider: 'or',
    googleFinish: 'One more step — choose the name your reading will show under.',
    googleSignedIn: 'Signed in with Google as',
  },
  es: {
    title: 'Iglesia en Cerritos',
    subtitle: 'Seguimiento de Lectura Bíblica',
    desc: 'Ingresa tu nombre y correo para comenzar.\nTu historial de lectura se vinculará a tu nombre.',
    namePlaceholder: 'Tu nombre (p.ej. Juan Doe)',
    emailPlaceholder: 'Tu correo electrónico',
    button: 'Entrar',
    loading: 'Verificando...',
    errorBoth: 'Por favor ingresa tu nombre y correo.',
    errorEmail: 'Por favor ingresa un correo válido.',
    errorTaken: 'Este nombre ya está en uso. Por favor elige otro.',
    errorGeneric: 'Algo salió mal. Por favor intenta de nuevo.',
    recoverAsk: '¿Olvidaste tu nombre?',
    recoverSending: 'Enviando…',
    recoverNeedEmail: 'Primero ingresa tu correo arriba.',
    recoverSent: 'Si esa dirección tiene una cuenta, le enviamos el nombre.',
    google: 'Continuar con Google',
    orDivider: 'o',
    googleFinish: 'Un paso más: elige el nombre con el que aparecerá tu lectura.',
    googleSignedIn: 'Sesión iniciada con Google como',
  },
  zh: {
    title: '喜瑞督召會',
    subtitle: '讀經記錄',
    desc: '請輸入您的姓名和電子郵件以開始。\n您的閱讀記錄將與您的姓名連結。',
    namePlaceholder: '您的姓名（例如：吳大明）',
    emailPlaceholder: '您的電子郵件',
    button: '進入',
    loading: '檢查中...',
    errorBoth: '請輸入您的姓名和電子郵件。',
    errorEmail: '請輸入有效的電子郵件地址。',
    errorTaken: '此姓名已被使用，請選擇其他姓名。',
    errorGeneric: '發生錯誤，請重試。',
    recoverAsk: '忘記你的名稱？',
    recoverSending: '寄送中…',
    recoverNeedEmail: '請先在上方輸入電子郵件。',
    recoverSent: '若該地址有帳號，我們已將名稱寄出。',
    google: '使用 Google 登入',
    orDivider: '或',
    googleFinish: '還有一步——請選擇顯示閱讀記錄的名稱。',
    googleSignedIn: '已用 Google 登入：',
  },
  sc: {
    title: '喜瑞督召会',
    subtitle: '读经记录',
    desc: '请输入您的姓名和电子邮件以开始。\n您的阅读记录将与您的姓名关联。',
    namePlaceholder: '您的姓名（例如：吴大明）',
    emailPlaceholder: '您的电子邮件',
    button: '进入',
    loading: '检查中...',
    errorBoth: '请输入您的姓名和电子邮件。',
    errorEmail: '请输入有效的电子邮件地址。',
    errorTaken: '此姓名已被使用，请选择其他姓名。',
    errorGeneric: '发生错误，请重试。',
    recoverAsk: '忘记你的名称？',
    recoverSending: '寄送中…',
    recoverNeedEmail: '请先在上方输入电子邮件。',
    recoverSent: '若该地址有帐号，我们已将名称寄出。',
    google: '使用 Google 登录',
    orDivider: '或',
    googleFinish: '还有一步——请选择显示阅读记录的名称。',
    googleSignedIn: '已用 Google 登录：',
  },
};

export default function LoginModal({ onLangChange }) {
  const { login } = useUser();
  const [lang, setLang] = useState(
    () => localStorage.getItem('bibleAppLang') || 'en'
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [wantEmail, setWantEmail] = useState(true);
  const [wantPush, setWantPush] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [recoverMsg, setRecoverMsg] = useState('');
  // Set only when Google has verified an address that has no account yet, so
  // the form below is finishing a signup rather than starting one.
  const [googleEmail, setGoogleEmail] = useState('');
  const [returning, setReturning] = useState(false);

  const t = TEXT[lang] || TEXT.en;
  const nt = NOTIFY_TEXT[lang] || NOTIFY_TEXT.en;   // shared with the account menu

  function switchLang(code) {
    setLang(code);
    localStorage.setItem('bibleAppLang', code);
    if (onLangChange) onLangChange(code);
  }

  // Coming back from Google. The address Google returns is verified, so it is
  // enough on its own to reach an existing account — no name typed, no history
  // lost, nothing to re-register. Only a reader with no account yet has to
  // stop and pick a name.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const authUser = data?.session?.user;
      if (!authUser?.email || cancelled) return;
      setReturning(true);

      const addr = authUser.email.toLowerCase();
      const { data: rows } = await supabase
        .from('users').select('id, name, email, is_admin')
        .eq('email', addr).order('created_at', { ascending: true }).limit(1);
      if (cancelled) return;

      const account = rows && rows[0];
      if (account) {
        await stampLogin(account.id);
        login({
          id: account.id, name: account.name,
          email: account.email, isAdmin: account.is_admin || false,
        });
        return;
      }

      // Nobody here yet. Suggest the Google profile name, but let them change
      // it — it is what the whole congregation will see on the leaderboard.
      const meta = authUser.user_metadata || {};
      setGoogleEmail(addr);
      setEmail(addr);
      setName(String(meta.full_name || meta.name || '').trim());
      setReturning(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signInWithGoogle() {
    setError('');
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (authError) {
      console.error('google sign-in failed', authError);
      setError(t.errorGeneric);
    }
  }

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail) { setError(t.errorBoth); return; }
    if (!trimmedEmail.includes('@')) { setError(t.errorEmail); return; }

    setLoading(true);
    setError('');

    try {
      // Resolve the typed name to an account: the account's own name first,
      // then any name it used to go by. Merged accounts keep working that way —
      // "Ayele" still reaches the account now called "Ayele Dodoo".
      const { data: found, error: fetchError } = await supabase
        .from('users')
        .select('id, name, email, is_admin')
        .ilike('name', trimmedName)
        .limit(1);
      if (fetchError) throw fetchError;

      let existing = found && found[0];
      if (!existing) {
        const { data: alias } = await supabase
          .from('user_aliases').select('user_id').ilike('name', trimmedName).limit(1);
        if (alias?.[0]) {
          const { data: viaAlias } = await supabase
            .from('users').select('id, name, email, is_admin').eq('id', alias[0].user_id).limit(1);
          existing = viaAlias && viaAlias[0];
        }
      }

      // Still nothing, but this address already has an account: sign them into
      // it and remember the name they typed. One address, one account — this is
      // what stops a second account appearing every time someone abbreviates.
      if (!existing) {
        const { data: byEmail } = await supabase
          .from('users').select('id, name, email, is_admin')
          .eq('email', trimmedEmail).order('created_at', { ascending: true }).limit(1);
        if (byEmail?.[0]) {
          existing = byEmail[0];
          await supabase.from('user_aliases')
            .upsert({ name: trimmedName, user_id: existing.id }, { onConflict: 'name' });
        }
      }

      if (existing) {
        if (existing.email.toLowerCase() === trimmedEmail) {
          await applyPreferences(existing.email);
          await stampLogin(existing.id);
          login({ id: existing.id, name: existing.name, email: existing.email, isAdmin: existing.is_admin || false });
        } else {
          setError(t.errorTaken);
          setLoading(false);
          return;
        }
      } else {
        const { data: created, error: insertError } = await supabase
          .from('users')
          .insert([{ name: trimmedName, email: trimmedEmail }])
          .select('id')
          .single();
        if (insertError) throw insertError;
        await applyPreferences(trimmedEmail);
        await stampLogin(created?.id);
        login({ id: created?.id, name: trimmedName, email: trimmedEmail, isAdmin: false });
      }
    } catch (err) {
      console.error(err);
      setError(t.errorGeneric);
    }

    setLoading(false);
  };

  // Recorded so an account can later be judged active or dormant. Nothing
  // depends on it yet; the clock starts the day this ships.
  async function stampLogin(id) {
    if (!id) return;
    try { await supabase.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', id); }
    catch (err) { console.error('could not record login time', err); }
  }

  // Both preferences are applied after the account exists. The push prompt is
  // still inside the click that submitted the form, which is what browsers
  // require before they will ask.
  async function applyPreferences(accountEmail) {
    try {
      await supabase.from('users').update({ daily_email: wantEmail }).eq('email', accountEmail);
      if (wantPush && isPushSupported() && permission() !== 'denied') {
        await subscribe(accountEmail);
      }
    } catch (err) {
      console.error('could not save notification preferences', err);
    }
  }

  async function recoverName() {
    const addr = email.trim().toLowerCase();
    if (!addr.includes('@')) { setRecoverMsg(t.recoverNeedEmail); return; }
    setRecovering(true); setRecoverMsg('');
    try {
      await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/recover-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addr }),
      });
    } catch (err) {
      console.error('recover-name request failed', err);
    }
    // Deliberately the same message either way — see the function's comment.
    setRecoverMsg(t.recoverSent);
    setRecovering(false);
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        {/* Language switcher */}
        <div style={styles.langRow}>
          {LANGS.map(({ code }) => (
            <button
              key={code}
              onClick={() => switchLang(code)}
              style={{
                ...styles.langBtn,
                background: lang === code ? '#3b6fd4' : 'transparent',
                color: lang === code ? '#fff' : 'var(--text, #aaa)',
                border: lang === code ? '1px solid #3b6fd4' : '1px solid var(--border, #444)',
              }}
            >
              <Flag code={code} />
            </button>
          ))}
        </div>

        <h2 style={styles.title}>{t.title}</h2>
        <p style={styles.subtitle}>{t.subtitle}</p>
        <p style={styles.desc}>
          {googleEmail
            ? t.googleFinish
            : t.desc.split('\n').map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
        </p>

        {/* Offered first, because it is the shorter path for anyone who has an
            account already — the verified address finds them without a name. */}
        {!googleEmail && (
          <>
            <button className="login-google" onClick={signInWithGoogle} disabled={returning}>
              <GoogleMark />
              <span>{t.google}</span>
            </button>
            <div className="login-or"><span>{t.orDivider}</span></div>
          </>
        )}

        <input
          style={styles.input}
          type="text"
          placeholder={t.namePlaceholder}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        {googleEmail ? (
          <div className="login-verified">
            {t.googleSignedIn} <b>{googleEmail}</b>
          </div>
        ) : (
          <input
            style={styles.input}
            type="email"
            placeholder={t.emailPlaceholder}
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        )}

        {/* Opt-ins, offered once at the start rather than as a prompt later.
            Both are changeable afterwards under the account name. */}
        <div className="login-notify">
          <label className="login-check">
            <input type="checkbox" checked={wantEmail}
                   onChange={e => setWantEmail(e.target.checked)} />
            <span>{nt.email}</span>
          </label>
          {isPushSupported() && permission() !== 'denied' && (
            <label className="login-check">
              <input type="checkbox" checked={wantPush}
                     onChange={e => setWantPush(e.target.checked)} />
              <span>{nt.push}</span>
            </label>
          )}
          <AppleHelp t={nt} />
        </div>

        {/* Anyone who has forgotten their name has their address; that is
            enough to remind them without exposing whether it is registered. */}
        {!googleEmail && (
          <div style={{ width: '100%', textAlign: 'left' }}>
            <button className="login-forgot" onClick={recoverName} disabled={recovering}>
              {recovering ? t.recoverSending : t.recoverAsk}
            </button>
            {recoverMsg && <div className="login-forgot-msg">{recoverMsg}</div>}
          </div>
        )}

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? t.loading : t.button}
        </button>
      </div>
    </div>
  );
}

// Google requires its own mark on the button, at its own colours — an emoji or
// a recoloured glyph would not meet their branding terms.
function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.3z" />
      <path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.7C7.9 41 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.6 28.1c-.4-1.3-.7-2.7-.7-4.1s.2-2.8.7-4.1v-5.7H4.3C2.8 17.1 2 20.4 2 24s.8 6.9 2.3 9.8l7.3-5.7z" />
      <path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.1 30 2 24 2 15.4 2 7.9 7 4.3 14.2l7.3 5.7c1.7-5.2 6.6-9.1 12.4-9.1z" />
    </svg>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    background: 'var(--bg, #fff)',
    color: 'var(--text, #222)',
    borderRadius: '16px',
    padding: '32px 32px 36px',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
  },
  langRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '4px',
  },
  langBtn: {
    padding: '5px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'all 0.15s',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    textAlign: 'center',
  },
  subtitle: {
    margin: 0,
    fontSize: '13px',
    opacity: 0.6,
  },
  desc: {
    margin: '4px 0',
    fontSize: '14px',
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 1.6,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border, #ddd)',
    fontSize: '15px',
    background: 'var(--input-bg, #f9f9f9)',
    color: 'var(--text, #222)',
    boxSizing: 'border-box',
  },
  error: {
    color: '#e53e3e',
    fontSize: '13px',
    margin: 0,
    textAlign: 'center',
  },
  button: {
    marginTop: '4px',
    width: '100%',
    padding: '13px',
    borderRadius: '8px',
    border: 'none',
    background: '#3b6fd4',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
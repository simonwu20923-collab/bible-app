import React from 'react';
import { supabase } from '../supabase';
import Flag from './Flag';
import {
  isPushSupported, isIosNeedingInstall, permission,
  subscribe, unsubscribe, isSubscribed,
} from '../push';

// How a reader hears from us: the daily email, which languages it arrives in,
// and whether this device also gets a notification.
//
// Shown inside the account menu, and in a shorter form on the login screen.

export const LANGS = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'zh', name: '繁體' },
  { code: 'sc', name: '简体' },
];

export const TEXT = {
  en: {
    when: 'Send it at', tz: 'Pacific time', evening: 'Evening nudge at 9pm if the reading is not finished.',
    email: 'Daily reading email', langs: 'Send the reading in',
    push: 'Notify me on this device',
    note: 'Spanish sends the passages only — the devotional has no Spanish edition yet.',
    keepOne: 'Keep at least one language selected.',
    max: 'Two languages at most — a longer email gets cut short by Gmail.',
    blocked: 'Notifications are blocked for this site. Turn them back on in your browser settings.',
    iosTitle: 'To get notifications on iPhone or iPad',
    iosSteps: 'Tap Share, then “Add to Home Screen”, and open the app from that icon. Apple only allows notifications for installed sites.',
    macTitle: 'On a Mac',
    macSteps: 'Safari needs the site added to the Dock, or use Chrome, where notifications work from a normal tab.',
    logout: 'Log out',
  },
  es: {
    when: 'Enviar a las', tz: 'hora del Pacífico', evening: 'Aviso a las 9pm si la lectura no está terminada.',
    email: 'Correo de lectura diaria', langs: 'Enviar la lectura en',
    push: 'Avisarme en este dispositivo',
    note: 'En español se envían solo los pasajes; el devocional aún no existe en español.',
    keepOne: 'Mantén al menos un idioma seleccionado.',
    max: 'Máximo dos idiomas — Gmail recorta los correos más largos.',
    blocked: 'Las notificaciones están bloqueadas para este sitio. Actívalas en la configuración del navegador.',
    iosTitle: 'Para recibir avisos en iPhone o iPad',
    iosSteps: 'Toca Compartir, luego «Añadir a pantalla de inicio», y abre la app desde ese icono. Apple solo permite notificaciones en sitios instalados.',
    macTitle: 'En Mac',
    macSteps: 'Safari necesita el sitio añadido al Dock, o usa Chrome, donde los avisos funcionan desde una pestaña normal.',
    logout: 'Cerrar sesión',
  },
  zh: {
    when: '發送時間', tz: '太平洋時間', evening: '晚上九點若尚未讀完會再提醒一次。',
    email: '每日讀經郵件', langs: '郵件語言',
    push: '在這個裝置上通知我',
    note: '西班牙文只寄經文，靈修內容尚無西班牙文版本。',
    keepOne: '請至少保留一種語言。',
    max: '最多兩種語言，過長的郵件會被 Gmail 截斷。',
    blocked: '此網站的通知已被封鎖，請到瀏覽器設定重新開啟。',
    iosTitle: 'iPhone 或 iPad 要接收通知',
    iosSteps: '請點分享，選「加入主畫面」，再從該圖示開啟。蘋果只允許已安裝的網站發送通知。',
    macTitle: 'Mac 使用者',
    macSteps: 'Safari 需將網站加入 Dock，或改用 Chrome，一般分頁即可接收通知。',
    logout: '登出',
  },
  sc: {
    when: '发送时间', tz: '太平洋时间', evening: '晚上九点若尚未读完会再提醒一次。',
    email: '每日读经邮件', langs: '邮件语言',
    push: '在这个设备上通知我',
    note: '西班牙文只寄经文，灵修内容尚无西班牙文版本。',
    keepOne: '请至少保留一种语言。',
    max: '最多两种语言，过长的邮件会被 Gmail 截断。',
    blocked: '此网站的通知已被阻止，请到浏览器设置重新开启。',
    iosTitle: 'iPhone 或 iPad 要接收通知',
    iosSteps: '请点分享，选「添加到主屏幕」，再从该图标打开。苹果只允许已安装的网站发送通知。',
    macTitle: 'Mac 用户',
    macSteps: 'Safari 需将网站加入程序坞，或改用 Chrome，普通标签页即可接收通知。',
    logout: '登出',
  },
};

const MAX_LANGS = 2;

// Shown wherever push cannot simply be switched on.
export function AppleHelp({ t }) {
  const isMacSafari = typeof navigator !== 'undefined' &&
    /Macintosh/.test(navigator.userAgent) &&
    /Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Edg/.test(navigator.userAgent);

  if (isIosNeedingInstall()) {
    return (
      <div className="np-help">
        <div className="np-help-title">{t.iosTitle}</div>
        <div className="np-help-body">{t.iosSteps}</div>
      </div>
    );
  }
  if (isMacSafari && !isPushSupported()) {
    return (
      <div className="np-help">
        <div className="np-help-title">{t.macTitle}</div>
        <div className="np-help-body">{t.macSteps}</div>
      </div>
    );
  }
  return null;
}

export default function NotifyPreferences({ email, lang = 'en' }) {
  const t = TEXT[lang] || TEXT.en;
  const [on, setOn] = React.useState(null);
  const [langs, setLangs] = React.useState(['en']);
  const [pushOn, setPushOn] = React.useState(false);
  const [notifyAt, setNotifyAt] = React.useState('00:01');
  const [busy, setBusy] = React.useState(false);
  const [warn, setWarn] = React.useState('');

  React.useEffect(() => {
    if (!email) return;
    let cancelled = false;
    // Not maybeSingle(): some addresses have more than one account row, because
    // sign-in matches on name, so the same person under a second name creates a
    // second row. Take the earliest — the original account — rather than erroring
    // out and rendering nothing.
    supabase.from('users').select('daily_email, email_langs, notify_at')
      .eq('email', email).order('created_at', { ascending: true }).limit(1)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { console.error('could not load notification settings', error); setOn(false); return; }
        const row = data && data[0];
        if (!row) { setOn(false); return; }
        setOn(!!row.daily_email);
        setLangs(row.email_langs?.length ? row.email_langs : ['en']);
        if (row.notify_at) setNotifyAt(String(row.notify_at).slice(0, 5));
      });
    return () => { cancelled = true; };
  }, [email]);

  React.useEffect(() => { isSubscribed().then(setPushOn); }, []);

  async function save(patch, revert) {
    setBusy(true);
    const { error } = await supabase.from('users').update(patch).eq('email', email);
    if (error) revert();
    setBusy(false);
  }

  function toggleEmail() {
    const next = !on;
    setOn(next);
    save({ daily_email: next }, () => setOn(!next));
  }

  function toggleLang(code) {
    const adding = !langs.includes(code);
    const next = adding ? [...langs, code] : langs.filter(c => c !== code);
    if (next.length === 0) { flash(t.keepOne); return; }
    if (adding && next.length > MAX_LANGS) { flash(t.max); return; }
    const previous = langs;
    setWarn('');
    const ordered = LANGS.map(l => l.code).filter(c => next.includes(c));
    setLangs(ordered);
    save({ email_langs: ordered }, () => setLangs(previous));
  }

  function changeTime(value) {
    const previous = notifyAt;
    setNotifyAt(value);
    save({ notify_at: value }, () => setNotifyAt(previous));
  }

  function flash(msg) { setWarn(msg); setTimeout(() => setWarn(''), 3000); }

  async function togglePush() {
    if (busy) return;
    setBusy(true);
    if (pushOn) { await unsubscribe(); setPushOn(false); }
    else {
      const r = await subscribe(email);
      setPushOn(r.ok);
      if (!r.ok && r.reason === 'denied') flash(t.blocked);
      else if (!r.ok && r.reason === 'misconfigured') flash('Notifications are not configured on this build.');
      else if (!r.ok && r.reason === 'save-failed') flash('Could not save the subscription. Please try again.');
    }
    setBusy(false);
  }

  if (on === null) return null;

  return (
    <div className="np">
      <label className="np-switch">
        <input type="checkbox" checked={on} onChange={toggleEmail} disabled={busy} />
        <span>{t.email}</span>
      </label>

      <div className={`np-langs${on ? '' : ' is-muted'}`}>
        <div className="np-heading">{t.langs}</div>
        {LANGS.map(l => (
          <label key={l.code} className="np-lang">
            <input
              type="checkbox"
              checked={langs.includes(l.code)}
              onChange={() => toggleLang(l.code)}
              disabled={busy}
            />
            <Flag code={l.code} size={18} />
            <span>{l.name}</span>
          </label>
        ))}
        {langs.includes('es') && <div className="np-note">{t.note}</div>}
      </div>

      <div className="np-when">
        <div className="np-heading">{t.when}</div>
        <select className="np-time" value={notifyAt}
                onChange={e => changeTime(e.target.value)} disabled={busy}>
          {/* Whole hours only: cron ticks once an hour, so a finer choice could
              not be kept. The :01 is that tick. */}
          {Array.from({ length: 24 }, (_, h) => {
            const value = String(h).padStart(2, '0') + ':01';
            const label = new Date(2026, 0, 1, h, 1)
              .toLocaleTimeString(lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : 'zh-TW',
                                  { hour: 'numeric', minute: '2-digit' });
            return <option key={value} value={value}>{label}</option>;
          })}
        </select>
        <span className="np-tz">{t.tz}</span>
      </div>

      <div className="np-push">
        {isPushSupported() && permission() !== 'denied' && (
          <label className="np-switch np-switch-sm">
            <input type="checkbox" checked={pushOn} onChange={togglePush} disabled={busy} />
            <span>{t.push}</span>
          </label>
        )}
        {isPushSupported() && permission() === 'denied' && <div className="np-note">{t.blocked}</div>}
        <div className="np-note">{t.evening}</div>
        <AppleHelp t={t} />
      </div>

      {warn && <div className="np-warn">{warn}</div>}
    </div>
  );
}

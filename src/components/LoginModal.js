import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useUser } from '../context/UserContext';

const supabase = createClient(
  'https://lsvhmvkhernimxmzcyak.supabase.co',
  'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc'
);

const LANGS = [
  { code: 'en', label: '🇺🇸', name: 'English' },
  { code: 'es', label: '🇪🇸', name: 'Español' },
  { code: 'zh', label: '繁', name: '繁體' },
  { code: 'sc', label: '简', name: '简体' },
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
  const [loading, setLoading] = useState(false);

  const t = TEXT[lang] || TEXT.en;

  function switchLang(code) {
    setLang(code);
    localStorage.setItem('bibleAppLang', code);
    if (onLangChange) onLangChange(code);
  }

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail) { setError(t.errorBoth); return; }
    if (!trimmedEmail.includes('@')) { setError(t.errorEmail); return; }

    setLoading(true);
    setError('');

    try {
      const { data: existing, error: fetchError } = await supabase
        .from('users')
        .select('name, email, is_admin')
        .ilike('name', trimmedName)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        if (existing.email.toLowerCase() === trimmedEmail) {
          login({ name: existing.name, email: existing.email, isAdmin: existing.is_admin || false });
        } else {
          setError(t.errorTaken);
          setLoading(false);
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from('users')
          .insert([{ name: trimmedName, email: trimmedEmail }]);
        if (insertError) throw insertError;
        login({ name: trimmedName, email: trimmedEmail, isAdmin: false });
      }
    } catch (err) {
      console.error(err);
      setError(t.errorGeneric);
    }

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        {/* Language switcher */}
        <div style={styles.langRow}>
          {LANGS.map(({ code, label }) => (
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
              {label}
            </button>
          ))}
        </div>

        <h2 style={styles.title}>{t.title}</h2>
        <p style={styles.subtitle}>{t.subtitle}</p>
        <p style={styles.desc}>
          {t.desc.split('\n').map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
        </p>

        <input
          style={styles.input}
          type="text"
          placeholder={t.namePlaceholder}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <input
          style={styles.input}
          type="email"
          placeholder={t.emailPlaceholder}
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
        />

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